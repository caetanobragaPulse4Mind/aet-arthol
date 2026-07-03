import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState, useEffect } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Pencil, Power, Trash2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/composicoes")({
  component: ComposicoesPage,
});

type Eixo = { eixo: number; num_pneus: number; dist_entre_eixos: number | null; bidirecional: boolean };

type Composicao = {
  id: string;
  veiculo_id: string;
  reboque_id: string;
  eixos_cavalo: Eixo[];
  eixos_reboque: Eixo[];
  comprimento_total: number | null;
  largura_total: number | null;
  altura_total: number | null;
  largura_veiculo: number | null;
  excesso_esquerdo: number | null;
  excesso_direito: number | null;
  dist_b: number | null;
  dist_c: number | null;
  dist_d: number | null;
  ativo: boolean;
  veiculos?: { placa: string } | null;
  reboques?: { placa: string } | null;
};

function ComposicoesPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Composicao | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["composicoes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("composicoes")
        .select("*, veiculos(placa), reboques(placa)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as Composicao[];
    },
  });

  async function toggleAtivo(c: Composicao) {
    if (c.ativo && !confirm("Inativar esta composição?")) return;
    const { error } = await supabase.from("composicoes").update({ ativo: !c.ativo }).eq("id", c.id);
    if (error) return toast.error(error.message);
    toast.success(c.ativo ? "Composição inativada" : "Composição reativada");
    qc.invalidateQueries({ queryKey: ["composicoes"] });
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Composições</h1>
          <p className="text-sm text-slate-500 mt-1">Combinações de cavalo + reboque com medidas e eixos</p>
        </div>
        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setEditing(null); }}>
          <DialogTrigger asChild>
            <Button onClick={() => setEditing(null)}><Plus className="h-4 w-4 mr-1" /> Nova composição</Button>
          </DialogTrigger>
          <ComposicaoForm editing={editing} onClose={() => { setOpen(false); setEditing(null); qc.invalidateQueries({ queryKey: ["composicoes"] }); }} />
        </Dialog>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Cavalo</TableHead>
              <TableHead>Reboque</TableHead>
              <TableHead>Compr. (m)</TableHead>
              <TableHead>Larg. (m)</TableHead>
              <TableHead>Alt. (m)</TableHead>
              <TableHead>Eixos</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && <TableRow><TableCell colSpan={8} className="text-center py-8 text-slate-400">Carregando...</TableCell></TableRow>}
            {data?.map((c) => (
              <TableRow key={c.id}>
                <TableCell className="font-medium">{c.veiculos?.placa ?? "—"}</TableCell>
                <TableCell className="font-medium">{c.reboques?.placa ?? "—"}</TableCell>
                <TableCell>{c.comprimento_total?.toFixed(2) ?? "—"}</TableCell>
                <TableCell>{c.largura_total?.toFixed(2) ?? "—"}</TableCell>
                <TableCell>{c.altura_total?.toFixed(2) ?? "—"}</TableCell>
                <TableCell>{(c.eixos_cavalo?.length ?? 0) + (c.eixos_reboque?.length ?? 0)}</TableCell>
                <TableCell><Badge variant={c.ativo ? "default" : "secondary"}>{c.ativo ? "Ativa" : "Inativa"}</Badge></TableCell>
                <TableCell className="text-right space-x-1">
                  <Button variant="ghost" size="icon" onClick={() => { setEditing(c); setOpen(true); }}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => toggleAtivo(c)}>
                    <Power className={`h-4 w-4 ${c.ativo ? "text-red-500" : "text-emerald-600"}`} />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {data?.length === 0 && <TableRow><TableCell colSpan={8} className="text-center py-8 text-slate-400">Nenhuma composição cadastrada</TableCell></TableRow>}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}

// ---------------- Form ----------------

function makeEixos(n: number, existing?: Eixo[]): Eixo[] {
  if (existing && existing.length) return existing;
  return Array.from({ length: Math.max(1, n) }, (_, i) => ({
    eixo: i + 1,
    num_pneus: 2,
    dist_entre_eixos: i === n - 1 ? null : 3.5,
    bidirecional: false,
  }));
}

function ComposicaoForm({ editing, onClose }: { editing: Composicao | null; onClose: () => void }) {
  const [saving, setSaving] = useState(false);
  const [veiculoId, setVeiculoId] = useState(editing?.veiculo_id ?? "");
  const [reboqueId, setReboqueId] = useState(editing?.reboque_id ?? "");
  const [eixosCavalo, setEixosCavalo] = useState<Eixo[]>(editing?.eixos_cavalo ?? []);
  const [eixosReboque, setEixosReboque] = useState<Eixo[]>(editing?.eixos_reboque ?? []);
  const [medidas, setMedidas] = useState({
    largura_veiculo: editing?.largura_veiculo?.toString() ?? "2.60",
    largura_total: editing?.largura_total?.toString() ?? "",
    altura_total: editing?.altura_total?.toString() ?? "",
    comprimento_total: editing?.comprimento_total?.toString() ?? "",
    excesso_esquerdo: editing?.excesso_esquerdo?.toString() ?? "0",
    excesso_direito: editing?.excesso_direito?.toString() ?? "0",
  });

  const { data: veiculos } = useQuery({
    queryKey: ["veiculos-ativos"],
    queryFn: async () => {
      const { data } = await supabase.from("veiculos").select("id, placa, num_eixos, bidirecional").eq("ativo", true).order("placa");
      return data ?? [];
    },
  });
  const { data: reboques } = useQuery({
    queryKey: ["reboques-ativos"],
    queryFn: async () => {
      const { data } = await supabase.from("reboques").select("id, placa, num_eixos").eq("ativo", true).order("placa");
      return data ?? [];
    },
  });

  // Auto-populate eixos when veículo/reboque changes (only for new)
  useEffect(() => {
    if (editing) return;
    const v = veiculos?.find((x) => x.id === veiculoId);
    if (v?.num_eixos) setEixosCavalo(makeEixos(v.num_eixos));
  }, [veiculoId, veiculos, editing]);

  useEffect(() => {
    if (editing) return;
    const r = reboques?.find((x) => x.id === reboqueId);
    if (r?.num_eixos) setEixosReboque(makeEixos(r.num_eixos));
  }, [reboqueId, reboques, editing]);

  // Auto-calc distances (soma das dist_entre_eixos)
  const distCavalo = useMemo(() => sumDist(eixosCavalo), [eixosCavalo]);
  const distReboque = useMemo(() => sumDist(eixosReboque), [eixosReboque]);
  const distTotal = distCavalo + distReboque;

  // Auto-calc largura_total from largura_veiculo + excessos
  useEffect(() => {
    const lv = Number(medidas.largura_veiculo) || 0;
    const ee = Number(medidas.excesso_esquerdo) || 0;
    const ed = Number(medidas.excesso_direito) || 0;
    if (lv > 0) {
      const total = (lv + ee + ed).toFixed(2);
      setMedidas((m) => (m.largura_total === total ? m : { ...m, largura_total: total }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [medidas.largura_veiculo, medidas.excesso_esquerdo, medidas.excesso_direito]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!veiculoId || !reboqueId) return toast.error("Selecione cavalo e reboque");
    if (eixosCavalo.length === 0 || eixosReboque.length === 0) return toast.error("Configure os eixos");
    setSaving(true);
    const payload = {
      veiculo_id: veiculoId,
      reboque_id: reboqueId,
      eixos_cavalo: eixosCavalo as any,
      eixos_reboque: eixosReboque as any,
      largura_veiculo: medidas.largura_veiculo ? Number(medidas.largura_veiculo) : null,
      largura_total: medidas.largura_total ? Number(medidas.largura_total) : null,
      altura_total: medidas.altura_total ? Number(medidas.altura_total) : null,
      comprimento_total: medidas.comprimento_total ? Number(medidas.comprimento_total) : null,
      excesso_esquerdo: medidas.excesso_esquerdo ? Number(medidas.excesso_esquerdo) : 0,
      excesso_direito: medidas.excesso_direito ? Number(medidas.excesso_direito) : 0,
      dist_b: distCavalo || null,
      dist_c: distReboque || null,
      dist_d: distTotal || null,
    };
    const { error } = editing
      ? await supabase.from("composicoes").update(payload).eq("id", editing.id)
      : await supabase.from("composicoes").insert(payload);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success(editing ? "Composição atualizada" : "Composição cadastrada");
    onClose();
  }

  return (
    <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto">
      <DialogHeader><DialogTitle>{editing ? "Editar composição" : "Nova composição"}</DialogTitle></DialogHeader>
      <form onSubmit={submit} className="space-y-5">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Cavalo mecânico *</Label>
            <Select value={veiculoId} onValueChange={setVeiculoId}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                {veiculos?.map((v) => <SelectItem key={v.id} value={v.id}>{v.placa} ({v.num_eixos ?? "?"} eixos)</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Reboque *</Label>
            <Select value={reboqueId} onValueChange={setReboqueId}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                {reboques?.map((r) => <SelectItem key={r.id} value={r.id}>{r.placa} ({r.num_eixos ?? "?"} eixos)</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        <EixosEditor titulo="Eixos do cavalo" eixos={eixosCavalo} onChange={setEixosCavalo} />
        <EixosEditor titulo="Eixos do reboque" eixos={eixosReboque} onChange={setEixosReboque} />

        <div className="rounded-md bg-slate-50 border p-3 grid grid-cols-3 gap-3 text-sm">
          <Info label="Dist. cavalo (soma)" value={`${distCavalo.toFixed(2)} m`} />
          <Info label="Dist. reboque (soma)" value={`${distReboque.toFixed(2)} m`} />
          <Info label="Dist. total" value={`${distTotal.toFixed(2)} m`} />
        </div>

        <div className="grid grid-cols-3 gap-3">
          <NumField label="Comprimento total (m)" value={medidas.comprimento_total} onChange={(v) => setMedidas({ ...medidas, comprimento_total: v })} />
          <NumField label="Altura total (m)" value={medidas.altura_total} onChange={(v) => setMedidas({ ...medidas, altura_total: v })} />
          <NumField label="Largura do veículo (m)" value={medidas.largura_veiculo} onChange={(v) => setMedidas({ ...medidas, largura_veiculo: v })} />
          <NumField label="Excesso esquerdo (m)" value={medidas.excesso_esquerdo} onChange={(v) => setMedidas({ ...medidas, excesso_esquerdo: v })} />
          <NumField label="Excesso direito (m)" value={medidas.excesso_direito} onChange={(v) => setMedidas({ ...medidas, excesso_direito: v })} />
          <NumField label="Largura total (auto)" value={medidas.largura_total} onChange={(v) => setMedidas({ ...medidas, largura_total: v })} />
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
          <Button type="submit" disabled={saving}>{saving ? "Salvando..." : "Salvar composição"}</Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}

function EixosEditor({ titulo, eixos, onChange }: { titulo: string; eixos: Eixo[]; onChange: (e: Eixo[]) => void }) {
  function update(i: number, patch: Partial<Eixo>) {
    onChange(eixos.map((e, idx) => (idx === i ? { ...e, ...patch } : e)));
  }
  function addEixo() {
    const next: Eixo = { eixo: eixos.length + 1, num_pneus: 2, dist_entre_eixos: null, bidirecional: false };
    // last existing becomes non-null (default 3.5)
    const updated = eixos.map((e, idx) => (idx === eixos.length - 1 && e.dist_entre_eixos === null ? { ...e, dist_entre_eixos: 3.5 } : e));
    onChange([...updated, next]);
  }
  function removeEixo(i: number) {
    const filtered = eixos.filter((_, idx) => idx !== i).map((e, idx, arr) => ({
      ...e,
      eixo: idx + 1,
      dist_entre_eixos: idx === arr.length - 1 ? null : e.dist_entre_eixos ?? 3.5,
    }));
    onChange(filtered);
  }

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <div className="text-sm font-medium text-slate-900">{titulo}</div>
        <Button type="button" variant="outline" size="sm" onClick={addEixo}><Plus className="h-3 w-3 mr-1" /> Adicionar eixo</Button>
      </div>
      {eixos.length === 0 && <div className="text-xs text-slate-400 border rounded-md p-3 text-center">Selecione um veículo/reboque para gerar os eixos</div>}
      {eixos.length > 0 && (
        <div className="border rounded-md overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">Eixo</TableHead>
                <TableHead>Nº pneus</TableHead>
                <TableHead>Dist. p/ próximo (m)</TableHead>
                <TableHead>Bidirecional</TableHead>
                <TableHead className="w-16"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {eixos.map((e, i) => {
                const isLast = i === eixos.length - 1;
                return (
                  <TableRow key={i}>
                    <TableCell className="font-medium">{e.eixo}</TableCell>
                    <TableCell>
                      <Input type="number" className="h-8 w-20" value={e.num_pneus} onChange={(ev) => update(i, { num_pneus: Number(ev.target.value) })} />
                    </TableCell>
                    <TableCell>
                      {isLast ? (
                        <span className="text-slate-400 text-xs">—</span>
                      ) : (
                        <Input type="number" step="0.01" className="h-8 w-24" value={e.dist_entre_eixos ?? ""} onChange={(ev) => update(i, { dist_entre_eixos: ev.target.value ? Number(ev.target.value) : null })} />
                      )}
                    </TableCell>
                    <TableCell>
                      <input type="checkbox" checked={e.bidirecional} onChange={(ev) => update(i, { bidirecional: ev.target.checked })} />
                    </TableCell>
                    <TableCell>
                      <Button type="button" variant="ghost" size="icon" onClick={() => removeEixo(i)}>
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

function sumDist(eixos: Eixo[]) {
  return eixos.reduce((s, e) => s + (e.dist_entre_eixos ?? 0), 0);
}

function NumField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      <Input type="number" step="0.01" value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-slate-500">{label}</div>
      <div className="font-medium text-slate-900">{value}</div>
    </div>
  );
}
