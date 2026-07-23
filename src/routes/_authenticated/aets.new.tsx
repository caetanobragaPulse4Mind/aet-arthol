import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Plus, Trash2, Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export const Route = createFileRoute("/_authenticated/aets/new")({
  component: NewAet,
});

type Eixo = { eixo: number; num_pneus: number; dist_entre_eixos: number | null; bidirecional: boolean };

function makeEixos(n: number): Eixo[] {
  return Array.from({ length: Math.max(1, n) }, (_, i) => ({
    eixo: i + 1,
    num_pneus: 2,
    dist_entre_eixos: i === n - 1 ? null : 3.5,
    bidirecional: false,
  }));
}

type TipoConjunto = "I" | "D" | "T" | "M";
type ConjuntoEixo = { conj: number; tipo: TipoConjunto; tandem: boolean; peso: string };

function makeConjuntos(n: number, existing?: ConjuntoEixo[]): ConjuntoEixo[] {
  return Array.from({ length: Math.max(1, n) }, (_, i) =>
    existing?.[i] ?? { conj: i + 1, tipo: "I", tandem: false, peso: "" }
  );
}

function NewAet() {
  const navigate = useNavigate();
  const [veiculoId, setVeiculoId] = useState("");
  const [reboqueId, setReboqueId] = useState("");
  const [saving, setSaving] = useState(false);

  // Campos de medidas — só pro desenho do formulário por enquanto, não são
  // persistidos ainda (decisão: sem tabela de medidas até confirmação do cliente).
  const [eixosCavalo, setEixosCavalo] = useState<Eixo[]>([]);
  const [eixosReboque, setEixosReboque] = useState<Eixo[]>([]);
  const [conjuntosCavalo, setConjuntosCavalo] = useState<ConjuntoEixo[]>(makeConjuntos(2));
  const [conjuntosReboque, setConjuntosReboque] = useState<ConjuntoEixo[]>(makeConjuntos(2));
  const [medidas, setMedidas] = useState({
    largura_veiculo: "2.60",
    altura_total: "",
    excesso_esquerdo: "0",
    excesso_direito: "0",
    dist_b: "",
    dist_c: "",
    dist_d: "",
  });

  const { data: veiculos } = useQuery({
    queryKey: ["veiculos-ativos"],
    queryFn: async () => {
      const { data } = await supabase
        .from("veiculos")
        .select("id, placa, num_eixos")
        .eq("ativo", true)
        .order("placa");
      return data ?? [];
    },
  });
  const { data: reboques } = useQuery({
    queryKey: ["reboques-ativos"],
    queryFn: async () => {
      const { data } = await supabase
        .from("reboques")
        .select("id, placa, num_eixos")
        .eq("ativo", true)
        .order("placa");
      return data ?? [];
    },
  });

  // Auto-preenche os eixos com base no num_eixos cadastrado do veículo/reboque
  useEffect(() => {
    const v = veiculos?.find((x) => x.id === veiculoId);
    if (v?.num_eixos) setEixosCavalo(makeEixos(v.num_eixos));
  }, [veiculoId, veiculos]);

  useEffect(() => {
    const r = reboques?.find((x) => x.id === reboqueId);
    if (r?.num_eixos) setEixosReboque(makeEixos(r.num_eixos));
  }, [reboqueId, reboques]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    // Nota: campos de medida (eixos, larguras, distâncias) ainda não são enviados —
    // formulário por enquanto é só o desenho da tela, aguardando decisão de
    // onde essas medidas vão ser persistidas.
    const { error, data } = await supabase
      .from("aets")
      .insert({
        veiculo_id: veiculoId || null,
        reboque_id: reboqueId || null,
        situacao: "EM SOLICITAÇÃO",
        portal_origem: "SIAET",
      })
      .select("id")
      .single();
    setSaving(false);
    if (error) {
      toast.error("Erro ao criar AET", { description: error.message });
      return;
    }
    toast.success("AET criada com sucesso");
    navigate({ to: "/aets/$id", params: { id: data.id } });
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-3">
        <Link to="/dashboard"><Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4" /></Button></Link>
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Nova AET</h1>
          <p className="text-sm text-slate-500 mt-1">Cadastro de Autorização Especial de Trânsito</p>
        </div>
      </div>

      <Card className="p-6">
        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Veículo (cavalo)</Label>
              <Select value={veiculoId} onValueChange={setVeiculoId}>
                <SelectTrigger><SelectValue placeholder="Selecione um veículo" /></SelectTrigger>
                <SelectContent>
                  {(veiculos ?? []).map((v) => (
                    <SelectItem key={v.id} value={v.id}>{v.placa}</SelectItem>
                  ))}
                  {veiculos && veiculos.length === 0 && (
                    <SelectItem value="__none" disabled>Nenhum veículo cadastrado</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Reboque</Label>
              <Select value={reboqueId} onValueChange={setReboqueId}>
                <SelectTrigger><SelectValue placeholder="Selecione um reboque" /></SelectTrigger>
                <SelectContent>
                  {(reboques ?? []).map((r) => (
                    <SelectItem key={r.id} value={r.id}>{r.placa}</SelectItem>
                  ))}
                  {reboques && reboques.length === 0 && (
                    <SelectItem value="__none" disabled>Nenhum reboque cadastrado</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>

          <EixosEditor titulo="Eixos do cavalo" eixos={eixosCavalo} onChange={setEixosCavalo} />
          <EixosEditor titulo="Eixos do reboque" eixos={eixosReboque} onChange={setEixosReboque} />

          <div className="space-y-3">
            <NumField
              label="Dist. B (m)"
              hint="Distância entre o primeiro eixo do trator ao pára-choque dianteiro"
              value={medidas.dist_b}
              onChange={(v) => setMedidas({ ...medidas, dist_b: v })}
            />
            <NumField
              label="Dist. C (m)"
              hint="Distância entre o último eixo da carroceria ao pára-choque traseiro"
              value={medidas.dist_c}
              onChange={(v) => setMedidas({ ...medidas, dist_c: v })}
            />
            <NumField
              label="Dist. D (m)"
              hint="Distância do último eixo do cavalo trator/caminhão para o primeiro eixo do Reboque/Semi-Reboque"
              value={medidas.dist_d}
              onChange={(v) => setMedidas({ ...medidas, dist_d: v })}
            />
            <NumField label="Largura do veículo (m)" value={medidas.largura_veiculo} onChange={(v) => setMedidas({ ...medidas, largura_veiculo: v })} />
            <NumField label="Excesso esquerdo (m)" value={medidas.excesso_esquerdo} onChange={(v) => setMedidas({ ...medidas, excesso_esquerdo: v })} />
            <NumField label="Excesso direito (m)" value={medidas.excesso_direito} onChange={(v) => setMedidas({ ...medidas, excesso_direito: v })} />
            <NumField label="Altura total veículo + carga (m)" value={medidas.altura_total} onChange={(v) => setMedidas({ ...medidas, altura_total: v })} />
          </div>

          <ConjuntoEixosEditor
            titulo="Conjunto de Eixos do Cavalo Trator/Caminhão"
            conjuntos={conjuntosCavalo}
            onChange={setConjuntosCavalo}
          />
          <ConjuntoEixosEditor
            titulo="Conjunto de Eixos do Reboque/Semi-Reboque"
            conjuntos={conjuntosReboque}
            onChange={setConjuntosReboque}
          />

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Link to="/dashboard"><Button type="button" variant="outline">Cancelar</Button></Link>
            <Button type="submit" disabled={saving}>{saving ? "Salvando..." : "Criar AET"}</Button>
          </div>
        </form>
      </Card>
    </div>
  );
}

function EixosEditor({ titulo, eixos, onChange }: { titulo: string; eixos: Eixo[]; onChange: (e: Eixo[]) => void }) {
  function update(i: number, patch: Partial<Eixo>) {
    onChange(eixos.map((e, idx) => (idx === i ? { ...e, ...patch } : e)));
  }
  function addEixo() {
    const next: Eixo = { eixo: eixos.length + 1, num_pneus: 2, dist_entre_eixos: null, bidirecional: false };
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

function ConjuntoEixosEditor({
  titulo,
  conjuntos,
  onChange,
}: {
  titulo: string;
  conjuntos: ConjuntoEixo[];
  onChange: (c: ConjuntoEixo[]) => void;
}) {
  function update(i: number, patch: Partial<ConjuntoEixo>) {
    onChange(conjuntos.map((c, idx) => (idx === i ? { ...c, ...patch } : c)));
  }
  function addConjunto() {
    onChange([...conjuntos, { conj: conjuntos.length + 1, tipo: "I", tandem: false, peso: "" }]);
  }
  function removeConjunto(i: number) {
    const filtered = conjuntos.filter((_, idx) => idx !== i).map((c, idx) => ({ ...c, conj: idx + 1 }));
    onChange(filtered);
  }

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <div className="text-sm font-medium text-slate-900">{titulo}</div>
        <Button type="button" variant="outline" size="sm" onClick={addConjunto}><Plus className="h-3 w-3 mr-1" /> Adicionar conjunto</Button>
      </div>
      {conjuntos.length === 0 && <div className="text-xs text-slate-400 border rounded-md p-3 text-center">Nenhum conjunto adicionado</div>}
      {conjuntos.length > 0 && (
        <div className="border rounded-md overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">Conj.</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Tandem?</TableHead>
                <TableHead>Peso (t)</TableHead>
                <TableHead className="w-16"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {conjuntos.map((c, i) => (
                <TableRow key={i}>
                  <TableCell className="font-medium">{c.conj}</TableCell>
                  <TableCell>
                    <Select value={c.tipo} onValueChange={(v) => update(i, { tipo: v as TipoConjunto })}>
                      <SelectTrigger className="h-8 w-20"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="I">I</SelectItem>
                        <SelectItem value="D">D</SelectItem>
                        <SelectItem value="T">T</SelectItem>
                        <SelectItem value="M">M</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Select value={c.tandem ? "sim" : "nao"} onValueChange={(v) => update(i, { tandem: v === "sim" })}>
                      <SelectTrigger className="h-8 w-24"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="nao">Não</SelectItem>
                        <SelectItem value="sim">Sim</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      step="0.1"
                      className="h-8 w-24"
                      value={c.peso}
                      onChange={(e) => update(i, { peso: e.target.value })}
                    />
                  </TableCell>
                  <TableCell>
                    <Button type="button" variant="ghost" size="icon" onClick={() => removeConjunto(i)}>
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
      <p className="text-xs text-slate-400">Tipo: I=Isolado, D=Duplo, T=Triplo, M=Múltiplo</p>
    </div>
  );
}

function NumField({ label, hint, value, onChange }: { label: string; hint?: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1.5">
        <Label className="text-xs">{label}</Label>
        {hint && (
          <TooltipProvider delayDuration={150}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button type="button" className="text-slate-400 hover:text-slate-600" tabIndex={-1}>
                  <Info className="h-3.5 w-3.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent className="max-w-64 text-xs">{hint}</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>
      <Input type="number" step="0.01" value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}