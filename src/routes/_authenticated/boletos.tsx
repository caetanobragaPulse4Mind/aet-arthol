import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { BoletoStatusBadge } from "@/components/situacao-badge";
import { formatDateBR, formatMoneyBR, todayISO } from "@/lib/format";
import { ExternalLink, CheckCircle2, AlertTriangle } from "lucide-react";

export const Route = createFileRoute("/_authenticated/boletos")({
  component: BoletosPage,
});

function BoletosPage() {
  const qc = useQueryClient();
  const [status, setStatus] = useState("all");
  const [venIni, setVenIni] = useState("");
  const [venFim, setVenFim] = useState("");
  const [payingId, setPayingId] = useState<string | null>(null);
  const [payDate, setPayDate] = useState(todayISO());

  const { data, isLoading } = useQuery({
    queryKey: ["boletos", status, venIni, venFim],
    queryFn: async () => {
      let q = supabase
        .from("boletos")
        .select("id, valor, data_vencimento, status, data_pagamento, url, aet_id, aets(numero_aet)")
        .order("data_vencimento", { ascending: true });
      if (status !== "all") q = q.eq("status", status);
      if (venIni) q = q.gte("data_vencimento", venIni);
      if (venFim) q = q.lte("data_vencimento", venFim);
      const { data } = await q;
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
    qc.invalidateQueries({ queryKey: ["boletos"] });
  }

  const today = todayISO();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Boletos</h1>
        <p className="text-sm text-slate-500 mt-1">Acompanhamento de pagamentos das AETs</p>
      </div>

      <Card className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="text-xs text-slate-500 mb-1 block">Status</label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="PENDENTE">Pendente</SelectItem>
                <SelectItem value="PAGO">Pago</SelectItem>
                <SelectItem value="VENCIDO">Vencido</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs text-slate-500 mb-1 block">Vencimento ≥</label>
            <Input type="date" value={venIni} onChange={(e) => setVenIni(e.target.value)} />
          </div>
          <div>
            <label className="text-xs text-slate-500 mb-1 block">Vencimento ≤</label>
            <Input type="date" value={venFim} onChange={(e) => setVenFim(e.target.value)} />
          </div>
        </div>
      </Card>

      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="text-left px-5 py-2.5 font-medium">Nº AET</th>
                <th className="text-left px-5 py-2.5 font-medium">Valor</th>
                <th className="text-left px-5 py-2.5 font-medium">Vencimento</th>
                <th className="text-left px-5 py-2.5 font-medium">Status</th>
                <th className="text-left px-5 py-2.5 font-medium">Data pagamento</th>
                <th className="text-right px-5 py-2.5 font-medium">Ações</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr><td colSpan={6} className="px-5 py-10 text-center text-slate-400">Carregando...</td></tr>
              )}
              {!isLoading && (data ?? []).map((b: any) => {
                const vencido = b.status === "PENDENTE" && b.data_vencimento && b.data_vencimento < today;
                return (
                  <tr key={b.id} className={`border-t hover:bg-slate-50 ${vencido ? "bg-red-50/30" : ""}`}>
                    <td className="px-5 py-2.5 font-medium">
                      <Link to="/aets/$id" params={{ id: b.aet_id }} className="text-slate-900 hover:underline">
                        {b.aets?.numero_aet ?? "—"}
                      </Link>
                    </td>
                    <td className="px-5 py-2.5">{formatMoneyBR(b.valor)}</td>
                    <td className="px-5 py-2.5">
                      <div className="flex items-center gap-1.5">
                        {formatDateBR(b.data_vencimento)}
                        {vencido && <AlertTriangle className="h-3.5 w-3.5 text-red-600" />}
                      </div>
                    </td>
                    <td className="px-5 py-2.5"><BoletoStatusBadge status={b.status} /></td>
                    <td className="px-5 py-2.5">{formatDateBR(b.data_pagamento)}</td>
                    <td className="px-5 py-2.5 text-right">
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
                );
              })}
              {!isLoading && data && data.length === 0 && (
                <tr><td colSpan={6} className="px-5 py-10 text-center text-slate-500">Nenhum boleto encontrado.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

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
