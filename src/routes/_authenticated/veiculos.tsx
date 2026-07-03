import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Pencil, Power } from "lucide-react";

export const Route = createFileRoute("/_authenticated/veiculos")({
  component: VeiculosPage,
});

type Veiculo = {
  id: string;
  placa: string;
  marca: string | null;
  modelo: string | null;
  ano_fabricacao: number | null;
  chassi: string | null;
  renavam: string | null;
  rntrc: string | null;
  tara: number | null;
  cmt: number | null;
  potencia: number | null;
  num_eixos: number | null;
  tracao: string | null;
  direcao: string | null;
  tipo_carroceria: string | null;
  bidirecional: boolean;
  ativo: boolean;
};

type Reboque = {
  id: string;
  placa: string;
  marca: string | null;
  modelo: string | null;
  ano_fabricacao: number | null;
  chassi: string | null;
  renavam: string | null;
  rntrc: string | null;
  tara: number | null;
  num_eixos: number | null;
  tipo_eixos: string | null;
  tipo_engate: string | null;
  tipo_carroceria: string | null;
  ativo: boolean;
};

function VeiculosPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Veículos</h1>
        <p className="text-sm text-slate-500 mt-1">Cavalos mecânicos e reboques da frota</p>
      </div>
      <Tabs defaultValue="cavalos">
        <TabsList>
          <TabsTrigger value="cavalos">Cavalos mecânicos</TabsTrigger>
          <TabsTrigger value="reboques">Reboques</TabsTrigger>
        </TabsList>
        <TabsContent value="cavalos" className="mt-4"><CavalosTab /></TabsContent>
        <TabsContent value="reboques" className="mt-4"><ReboquesTab /></TabsContent>
      </Tabs>
    </div>
  );
}

// ---------------- Cavalos ----------------

function CavalosTab() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Veiculo | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["veiculos"],
    queryFn: async () => {
      const { data, error } = await supabase.from("veiculos").select("*").order("placa");
      if (error) throw error;
      return (data ?? []) as Veiculo[];
    },
  });

  async function toggleAtivo(v: Veiculo) {
    if (v.ativo && !confirm(`Inativar cavalo ${v.placa}?`)) return;
    const { error } = await supabase.from("veiculos").update({ ativo: !v.ativo }).eq("id", v.id);
    if (error) return toast.error(error.message);
    toast.success(v.ativo ? "Cavalo inativado" : "Cavalo reativado");
    qc.invalidateQueries({ queryKey: ["veiculos"] });
  }

  return (
    <Card>
      <div className="p-4 flex justify-between items-center border-b">
        <div className="text-sm text-slate-500">{data?.length ?? 0} cavalos</div>
        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setEditing(null); }}>
          <DialogTrigger asChild>
            <Button size="sm" onClick={() => setEditing(null)}><Plus className="h-4 w-4 mr-1" /> Novo cavalo</Button>
          </DialogTrigger>
          <CavaloForm editing={editing} onClose={() => { setOpen(false); setEditing(null); qc.invalidateQueries({ queryKey: ["veiculos"] }); }} />
        </Dialog>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Placa</TableHead>
            <TableHead>Marca / Modelo</TableHead>
            <TableHead>Ano</TableHead>
            <TableHead>Eixos</TableHead>
            <TableHead>CMT (t)</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading && <TableRow><TableCell colSpan={7} className="text-center py-8 text-slate-400">Carregando...</TableCell></TableRow>}
          {data?.map((v) => (
            <TableRow key={v.id}>
              <TableCell className="font-medium">{v.placa}</TableCell>
              <TableCell>{[v.marca, v.modelo].filter(Boolean).join(" / ") || "—"}</TableCell>
              <TableCell>{v.ano_fabricacao ?? "—"}</TableCell>
              <TableCell>{v.num_eixos ?? "—"}</TableCell>
              <TableCell>{v.cmt != null ? Number(v.cmt).toFixed(3) : "—"}</TableCell>
              <TableCell>
                <Badge variant={v.ativo ? "default" : "secondary"}>{v.ativo ? "Ativo" : "Inativo"}</Badge>
              </TableCell>
              <TableCell className="text-right space-x-1">
                <Button variant="ghost" size="icon" onClick={() => { setEditing(v); setOpen(true); }}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => toggleAtivo(v)}>
                  <Power className={`h-4 w-4 ${v.ativo ? "text-red-500" : "text-emerald-600"}`} />
                </Button>
              </TableCell>
            </TableRow>
          ))}
          {data?.length === 0 && <TableRow><TableCell colSpan={7} className="text-center py-8 text-slate-400">Nenhum cavalo cadastrado</TableCell></TableRow>}
        </TableBody>
      </Table>
    </Card>
  );
}

function CavaloForm({ editing, onClose }: { editing: Veiculo | null; onClose: () => void }) {
  const [saving, setSaving] = useState(false);
  const [f, setF] = useState({
    placa: editing?.placa ?? "",
    marca: editing?.marca ?? "",
    modelo: editing?.modelo ?? "",
    ano_fabricacao: editing?.ano_fabricacao?.toString() ?? "",
    chassi: editing?.chassi ?? "",
    renavam: editing?.renavam ?? "",
    rntrc: editing?.rntrc ?? "",
    tara: editing?.tara?.toString() ?? "",
    cmt: editing?.cmt?.toString() ?? "",
    potencia: editing?.potencia?.toString() ?? "",
    num_eixos: editing?.num_eixos?.toString() ?? "",
    tracao: editing?.tracao ?? "",
    direcao: editing?.direcao ?? "",
    tipo_carroceria: editing?.tipo_carroceria ?? "",
    bidirecional: editing?.bidirecional ?? false,
  });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const payload = {
      placa: f.placa.toUpperCase().trim(),
      marca: f.marca || null,
      modelo: f.modelo || null,
      ano_fabricacao: f.ano_fabricacao ? Number(f.ano_fabricacao) : null,
      chassi: f.chassi || null,
      renavam: f.renavam || null,
      rntrc: f.rntrc || null,
      tara: f.tara ? Number(f.tara) : null,
      cmt: f.cmt ? Number(f.cmt) : null,
      potencia: f.potencia ? Number(f.potencia) : null,
      num_eixos: f.num_eixos ? Number(f.num_eixos) : null,
      tracao: f.tracao || null,
      direcao: f.direcao || null,
      tipo_carroceria: f.tipo_carroceria || null,
      bidirecional: f.bidirecional,
    };
    const { error } = editing
      ? await supabase.from("veiculos").update(payload).eq("id", editing.id)
      : await supabase.from("veiculos").insert(payload);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success(editing ? "Cavalo atualizado" : "Cavalo cadastrado");
    onClose();
  }

  return (
    <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
      <DialogHeader><DialogTitle>{editing ? "Editar cavalo" : "Novo cavalo mecânico"}</DialogTitle></DialogHeader>
      <form onSubmit={submit} className="grid grid-cols-2 gap-3">
        <Field label="Placa *"><Input required value={f.placa} onChange={(e) => setF({ ...f, placa: e.target.value })} /></Field>
        <Field label="Ano de fabricação"><Input type="number" value={f.ano_fabricacao} onChange={(e) => setF({ ...f, ano_fabricacao: e.target.value })} /></Field>
        <Field label="Marca"><Input value={f.marca} onChange={(e) => setF({ ...f, marca: e.target.value })} /></Field>
        <Field label="Modelo"><Input value={f.modelo} onChange={(e) => setF({ ...f, modelo: e.target.value })} /></Field>
        <Field label="Chassi"><Input value={f.chassi} onChange={(e) => setF({ ...f, chassi: e.target.value })} /></Field>
        <Field label="RENAVAM"><Input value={f.renavam} onChange={(e) => setF({ ...f, renavam: e.target.value })} /></Field>
        <Field label="RNTRC"><Input value={f.rntrc} onChange={(e) => setF({ ...f, rntrc: e.target.value })} /></Field>
        <Field label="Tipo de carroceria"><Input value={f.tipo_carroceria} onChange={(e) => setF({ ...f, tipo_carroceria: e.target.value })} /></Field>
        <Field label="Tara (t)"><Input type="number" step="0.001" value={f.tara} onChange={(e) => setF({ ...f, tara: e.target.value })} /></Field>
        <Field label="CMT (t)"><Input type="number" step="0.001" value={f.cmt} onChange={(e) => setF({ ...f, cmt: e.target.value })} /></Field>
        <Field label="Potência (cv)"><Input type="number" value={f.potencia} onChange={(e) => setF({ ...f, potencia: e.target.value })} /></Field>
        <Field label="Nº de eixos"><Input type="number" value={f.num_eixos} onChange={(e) => setF({ ...f, num_eixos: e.target.value })} /></Field>
        <Field label="Tração"><Input value={f.tracao} onChange={(e) => setF({ ...f, tracao: e.target.value })} placeholder="6x4, 4x2..." /></Field>
        <Field label="Direção"><Input value={f.direcao} onChange={(e) => setF({ ...f, direcao: e.target.value })} placeholder="Hidráulica..." /></Field>
        <div className="col-span-2 flex items-center gap-2">
          <input id="bi" type="checkbox" checked={f.bidirecional} onChange={(e) => setF({ ...f, bidirecional: e.target.checked })} />
          <Label htmlFor="bi" className="cursor-pointer">Bidirecional</Label>
        </div>
        <DialogFooter className="col-span-2 mt-4">
          <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
          <Button type="submit" disabled={saving}>{saving ? "Salvando..." : "Salvar"}</Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}

// ---------------- Reboques ----------------

function ReboquesTab() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Reboque | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["reboques"],
    queryFn: async () => {
      const { data, error } = await supabase.from("reboques").select("*").order("placa");
      if (error) throw error;
      return (data ?? []) as Reboque[];
    },
  });

  async function toggleAtivo(r: Reboque) {
    if (r.ativo && !confirm(`Inativar reboque ${r.placa}?`)) return;
    const { error } = await supabase.from("reboques").update({ ativo: !r.ativo }).eq("id", r.id);
    if (error) return toast.error(error.message);
    toast.success(r.ativo ? "Reboque inativado" : "Reboque reativado");
    qc.invalidateQueries({ queryKey: ["reboques"] });
  }

  return (
    <Card>
      <div className="p-4 flex justify-between items-center border-b">
        <div className="text-sm text-slate-500">{data?.length ?? 0} reboques</div>
        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setEditing(null); }}>
          <DialogTrigger asChild>
            <Button size="sm" onClick={() => setEditing(null)}><Plus className="h-4 w-4 mr-1" /> Novo reboque</Button>
          </DialogTrigger>
          <ReboqueForm editing={editing} onClose={() => { setOpen(false); setEditing(null); qc.invalidateQueries({ queryKey: ["reboques"] }); }} />
        </Dialog>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Placa</TableHead>
            <TableHead>Marca / Modelo</TableHead>
            <TableHead>Tipo</TableHead>
            <TableHead>Eixos</TableHead>
            <TableHead>Tara (t)</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading && <TableRow><TableCell colSpan={7} className="text-center py-8 text-slate-400">Carregando...</TableCell></TableRow>}
          {data?.map((r) => (
            <TableRow key={r.id}>
              <TableCell className="font-medium">{r.placa}</TableCell>
              <TableCell>{[r.marca, r.modelo].filter(Boolean).join(" / ") || "—"}</TableCell>
              <TableCell>{r.tipo_carroceria ?? "—"}</TableCell>
              <TableCell>{r.num_eixos ?? "—"}</TableCell>
              <TableCell>{r.tara != null ? Number(r.tara).toFixed(3) : "—"}</TableCell>
              <TableCell><Badge variant={r.ativo ? "default" : "secondary"}>{r.ativo ? "Ativo" : "Inativo"}</Badge></TableCell>
              <TableCell className="text-right space-x-1">
                <Button variant="ghost" size="icon" onClick={() => { setEditing(r); setOpen(true); }}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => toggleAtivo(r)}>
                  <Power className={`h-4 w-4 ${r.ativo ? "text-red-500" : "text-emerald-600"}`} />
                </Button>
              </TableCell>
            </TableRow>
          ))}
          {data?.length === 0 && <TableRow><TableCell colSpan={7} className="text-center py-8 text-slate-400">Nenhum reboque cadastrado</TableCell></TableRow>}
        </TableBody>
      </Table>
    </Card>
  );
}

function ReboqueForm({ editing, onClose }: { editing: Reboque | null; onClose: () => void }) {
  const [saving, setSaving] = useState(false);
  const [f, setF] = useState({
    placa: editing?.placa ?? "",
    marca: editing?.marca ?? "",
    modelo: editing?.modelo ?? "",
    ano_fabricacao: editing?.ano_fabricacao?.toString() ?? "",
    chassi: editing?.chassi ?? "",
    renavam: editing?.renavam ?? "",
    rntrc: editing?.rntrc ?? "",
    tara: editing?.tara?.toString() ?? "",
    num_eixos: editing?.num_eixos?.toString() ?? "",
    tipo_eixos: editing?.tipo_eixos ?? "",
    tipo_engate: editing?.tipo_engate ?? "",
    tipo_carroceria: editing?.tipo_carroceria ?? "",
  });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const payload = {
      placa: f.placa.toUpperCase().trim(),
      marca: f.marca || null,
      modelo: f.modelo || null,
      ano_fabricacao: f.ano_fabricacao ? Number(f.ano_fabricacao) : null,
      chassi: f.chassi || null,
      renavam: f.renavam || null,
      rntrc: f.rntrc || null,
      tara: f.tara ? Number(f.tara) : null,
      num_eixos: f.num_eixos ? Number(f.num_eixos) : null,
      tipo_eixos: f.tipo_eixos || null,
      tipo_engate: f.tipo_engate || null,
      tipo_carroceria: f.tipo_carroceria || null,
    };
    const { error } = editing
      ? await supabase.from("reboques").update(payload).eq("id", editing.id)
      : await supabase.from("reboques").insert(payload);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success(editing ? "Reboque atualizado" : "Reboque cadastrado");
    onClose();
  }

  return (
    <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
      <DialogHeader><DialogTitle>{editing ? "Editar reboque" : "Novo reboque"}</DialogTitle></DialogHeader>
      <form onSubmit={submit} className="grid grid-cols-2 gap-3">
        <Field label="Placa *"><Input required value={f.placa} onChange={(e) => setF({ ...f, placa: e.target.value })} /></Field>
        <Field label="Ano de fabricação"><Input type="number" value={f.ano_fabricacao} onChange={(e) => setF({ ...f, ano_fabricacao: e.target.value })} /></Field>
        <Field label="Marca"><Input value={f.marca} onChange={(e) => setF({ ...f, marca: e.target.value })} /></Field>
        <Field label="Modelo"><Input value={f.modelo} onChange={(e) => setF({ ...f, modelo: e.target.value })} /></Field>
        <Field label="Chassi"><Input value={f.chassi} onChange={(e) => setF({ ...f, chassi: e.target.value })} /></Field>
        <Field label="RENAVAM"><Input value={f.renavam} onChange={(e) => setF({ ...f, renavam: e.target.value })} /></Field>
        <Field label="RNTRC"><Input value={f.rntrc} onChange={(e) => setF({ ...f, rntrc: e.target.value })} /></Field>
        <Field label="Tipo de carroceria"><Input value={f.tipo_carroceria} onChange={(e) => setF({ ...f, tipo_carroceria: e.target.value })} /></Field>
        <Field label="Tara (t)"><Input type="number" step="0.001" value={f.tara} onChange={(e) => setF({ ...f, tara: e.target.value })} /></Field>
        <Field label="Nº de eixos"><Input type="number" value={f.num_eixos} onChange={(e) => setF({ ...f, num_eixos: e.target.value })} /></Field>
        <Field label="Tipo de eixos"><Input value={f.tipo_eixos} onChange={(e) => setF({ ...f, tipo_eixos: e.target.value })} placeholder="Distanciados, agregados..." /></Field>
        <Field label="Tipo de engate"><Input value={f.tipo_engate} onChange={(e) => setF({ ...f, tipo_engate: e.target.value })} placeholder="Quinta roda, pino rei..." /></Field>
        <DialogFooter className="col-span-2 mt-4">
          <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
          <Button type="submit" disabled={saving}>{saving ? "Salvando..." : "Salvar"}</Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}
