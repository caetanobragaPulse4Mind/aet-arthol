import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { SituacaoBadge, BoletoStatusBadge } from "@/components/situacao-badge";
import { formatDateBR, formatMoneyBR, todayISO } from "@/lib/format";
import { ArrowLeft, ExternalLink, Plus, CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/aets/$id")({
  component: AetDetail,
});

function AetDetail() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const [boletoOpen, setBoletoOpen] = useState(false);
  const [payingId, setPayingId] = useState<string | null>(null);
  const [payDate, setPayDate] = useState(todayISO());

  const { data: aet } = useQuery({
    queryKey: ["aet", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("aets")
        .select("*, composicoes(*, veiculos(placa, marca, modelo), reboques(placa, marca, modelo))")
        .eq("id", id).maybeSingle();
      return data;
    },
  });

  const { data: percurso } = useQuery({
    queryKey: ["aet-percurso", id],
    queryFn: async () => {
      const { data } = await supabase.from("aet_percurso").select("*").eq("aet_id", id).order("ordem");
      return data ?? [];
    },
  });

  const { data: boletos } = useQuery({
    queryKey: ["aet-boletos", id],
    queryFn: async () => {
      const { data } = await supabase.from("boletos").select("*").eq("aet_id", id).order("data_vencimento");
      return data ?? [];
    },
  });

  async function marcarPago(boletoId: string) {
    const { error } = await supabase
      .from("boletos")
      .update({ status: "PAGO", data_pagamento: payDate })
      .eq("id", boletoId);
    if (error) return toast.error("Erro", { description: error.message });
    toast.success("Boleto marcado como pago");
    setPayingId(null);
    qc.invalidateQueries({ queryKey: ["aet-boletos", id] });
  }

  const [newBoleto, setNewBoleto] = useState({ valor: "", data_vencimento: "", url: "" });

  async function criarBoleto(e: React.FormEvent) {
    e.preventDefault();
    const { error } = await supabase.from("boletos").insert({
      aet_id: id,
      valor: Number(newBoleto.valor) || 0,
      data_vencimento: newBoleto.data_vencimento || null,
      url: newBoleto.url || null,
      status: "PENDENTE",
    });
    if (error) return toast.error("Erro", { description: error.message });
    toast.success("Boleto cadastrado");
    setBoletoOpen(false);
    setNewBoleto({ valor: "", data_vencimento: "", url: "" });
    qc.invalidateQueries({ queryKey: ["aet-boletos", id] });
  }

  if (!aet) return <div className="text-slate-500">Carregando...</div>;

  const c = aet.composicoes as any;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to="/dashboard"><Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4" /></Button></Link>
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">
              AET {aet.numero_aet ?? "(sem número)"}
            </h1>
            <p className="text-sm text-slate-500 mt-1">Portal: {aet.portal_origem}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <SituacaoBadge situacao={aet.situacao} />
        </div>
      </div>

      <Card className="p-5">
        <h2 className="font-semibold text-slate-900 mb-3">Dados</h2>
        <dl className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <Field label="Resolução" value={aet.resolucao} />
          <Field label="Período" value={`${formatDateBR(aet.data_inicio)} → ${formatDateBR(aet.data_fim)}`} />
          <Field label="Origem" value={aet.origem_carga} />
          <Field label="Destino" value={aet.destino_carga} />
        </dl>
      </Card>

      <Card className="p-5">
        <h2 className="font-semibold text-slate-900 mb-3">Composição</h2>
        {c ? (
          <dl className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <Field label="Placa trator" value={c.veiculos?.placa} />
            <Field label="Trator" value={[c.veiculos?.marca, c.veiculos?.modelo].filter(Boolean).join(" ")} />
            <Field label="Placa reboque" value={c.reboques?.placa} />
            <Field label="Reboque" value={[c.reboques?.marca, c.reboques?.modelo].filter(Boolean).join(" ")} />
            <Field label="Comprimento total" value={c.comprimento_total ? `${c.comprimento_total} m` : null} />
            <Field label="Largura total" value={c.largura_total ? `${c.largura_total} m` : null} />
            <Field label="Altura total" value={c.altura_total ? `${c.altura_total} m` : null} />
          </dl>
        ) : <p className="text-sm text-slate-500">Sem composição vinculada.</p>}
      </Card>

      <Card className="p-0 overflow-hidden">
        <div className="px-5 py-4 border-b">
          <h2 className="font-semibold text-slate-900">Percurso</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="text-left px-5 py-2 font-medium">BR</th>
                <th className="text-left px-5 py-2 font-medium">UF</th>
                <th className="text-left px-5 py-2 font-medium">KM inicial</th>
                <th className="text-left px-5 py-2 font-medium">KM final</th>
                <th className="text-left px-5 py-2 font-medium">Local início</th>
                <th className="text-left px-5 py-2 font-medium">Local fim</th>
              </tr>
            </thead>
            <tbody>
              {(percurso ?? []).map((p: any) => (
                <tr key={p.id} className="border-t">
                  <td className="px-5 py-2">{p.br ?? "—"}</td>
                  <td className="px-5 py-2">{p.estado ?? "—"}</td>
                  <td className="px-5 py-2">{p.km_ini ?? "—"}</td>
                  <td className="px-5 py-2">{p.km_fim ?? "—"}</td>
                  <td className="px-5 py-2">{p.local_inicio ?? "—"}</td>
                  <td className="px-5 py-2">{p.local_fim ?? "—"}</td>
                </tr>
              ))}
              {percurso && percurso.length === 0 && (
                <tr><td colSpan={6} className="px-5 py-6 text-center text-slate-500">Nenhum trecho vinculado.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <Card className="p-0 overflow-hidden">
        <div className="px-5 py-4 border-b flex items-center justify-between">
          <h2 className="font-semibold text-slate-900">Boletos</h2>
          <Button size="sm" onClick={() => setBoletoOpen(true)}>
            <Plus className="h-4 w-4 mr-1.5" /> Novo boleto
          </Button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="text-left px-5 py-2 font-medium">Valor</th>
                <th className="text-left px-5 py-2 font-medium">Vencimento</th>
                <th className="text-left px-5 py-2 font-medium">Status</th>
                <th className="text-left px-5 py-2 font-medium">Pagamento</th>
                <th className="text-right px-5 py-2 font-medium">Ações</th>
              </tr>
            </thead>
            <tbody>
              {(boletos ?? []).map((b: any) => (
                <tr key={b.id} className="border-t">
                  <td className="px-5 py-2">{formatMoneyBR(b.valor)}</td>
                  <td className="px-5 py-2">{formatDateBR(b.data_vencimento)}</td>
                  <td className="px-5 py-2"><BoletoStatusBadge status={b.status} /></td>
                  <td className="px-5 py-2">{formatDateBR(b.data_pagamento)}</td>
                  <td className="px-5 py-2 text-right">
                    <div className="inline-flex gap-1">
                      {b.url && (
                        <a href={b.url} target="_blank" rel="noopener noreferrer">
                          <Button variant="ghost" size="sm"><ExternalLink className="h-4 w-4" /></Button>
                        </a>
                      )}
                      {b.status !== "PAGO" && (
                        <Button variant="ghost" size="sm" onClick={() => { setPayingId(b.id); setPayDate(todayISO()); }}>
                          <CheckCircle2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {boletos && boletos.length === 0 && (
                <tr><td colSpan={5} className="px-5 py-6 text-center text-slate-500">Nenhum boleto.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <Dialog open={boletoOpen} onOpenChange={setBoletoOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Novo boleto</DialogTitle></DialogHeader>
          <form onSubmit={criarBoleto} className="space-y-3">
            <div className="space-y-2">
              <Label>Valor (R$)</Label>
              <Input type="number" step="0.01" required value={newBoleto.valor}
                onChange={(e) => setNewBoleto({ ...newBoleto, valor: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Data de vencimento</Label>
              <Input type="date" required value={newBoleto.data_vencimento}
                onChange={(e) => setNewBoleto({ ...newBoleto, data_vencimento: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>URL do boleto</Label>
              <Input type="url" value={newBoleto.url}
                onChange={(e) => setNewBoleto({ ...newBoleto, url: e.target.value })} />
            </div>
            <DialogFooter>
              <Button type="submit">Salvar</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!payingId} onOpenChange={(o) => !o && setPayingId(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Marcar como pago</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label>Data do pagamento</Label>
              <Input type="date" value={payDate} onChange={(e) => setPayDate(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPayingId(null)}>Cancelar</Button>
            <Button onClick={() => payingId && marcarPago(payingId)}>Confirmar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Field({ label, value }: { label: string; value: any }) {
  return (
    <div>
      <dt className="text-xs text-slate-500">{label}</dt>
      <dd className="text-slate-900 mt-0.5">{value || "—"}</dd>
    </div>
  );
}
