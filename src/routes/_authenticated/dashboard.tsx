import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SituacaoBadge } from "@/components/situacao-badge";
import { formatDateBR, todayISO, addDaysISO } from "@/lib/format";
import { FileText, AlertTriangle, Receipt, Clock, ExternalLink, Eye } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: Dashboard,
});

function Dashboard() {
  const today = todayISO();
  const in30 = addDaysISO(30);

  const { data: stats } = useQuery({
    queryKey: ["dashboard-stats", today, in30],
    queryFn: async () => {
      const [ativas, vencendo, pendentes, analise] = await Promise.all([
        supabase.from("aets").select("id", { count: "exact", head: true })
          .eq("situacao", "LIBERADA").gte("data_fim", today),
        supabase.from("aets").select("id", { count: "exact", head: true })
          .eq("situacao", "LIBERADA").gte("data_fim", today).lte("data_fim", in30),
        supabase.from("boletos").select("id", { count: "exact", head: true })
          .eq("status", "PENDENTE"),
        supabase.from("aets").select("id", { count: "exact", head: true })
          .eq("situacao", "EM PROCESSO DE ANÁLISE"),
      ]);
      return {
        ativas: ativas.count ?? 0,
        vencendo: vencendo.count ?? 0,
        pendentes: pendentes.count ?? 0,
        analise: analise.count ?? 0,
      };
    },
  });

  const { data: recentes } = useQuery({
    queryKey: ["dashboard-recentes"],
    queryFn: async () => {
      const { data } = await supabase
        .from("aets")
        .select("id, numero_aet, situacao, data_fim, pdf_url, composicao_id, composicoes(veiculos(placa), reboques(placa))")
        .order("created_at", { ascending: false })
        .limit(10);
      return data ?? [];
    },
  });

  const cards = [
    { label: "AETs ativas", value: stats?.ativas, icon: FileText, color: "text-emerald-600 bg-emerald-50" },
    { label: "Vencendo em 30 dias", value: stats?.vencendo, icon: AlertTriangle, color: "text-amber-600 bg-amber-50" },
    { label: "Boletos pendentes", value: stats?.pendentes, icon: Receipt, color: "text-blue-600 bg-blue-50" },
    { label: "Em análise", value: stats?.analise, icon: Clock, color: "text-slate-600 bg-slate-100" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Dashboard</h1>
        <p className="text-sm text-slate-500 mt-1">Visão geral das autorizações</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <Card key={c.label} className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-sm text-slate-500">{c.label}</div>
                  <div className="text-3xl font-semibold text-slate-900 mt-2">
                    {c.value ?? "—"}
                  </div>
                </div>
                <div className={`p-2 rounded-md ${c.color}`}>
                  <Icon className="h-5 w-5" />
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      <Card className="p-0 overflow-hidden">
        <div className="px-5 py-4 border-b flex items-center justify-between">
          <h2 className="font-semibold text-slate-900">AETs recentes</h2>
          <Link to="/aets">
            <Button variant="outline" size="sm">Ver todas</Button>
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="text-left px-5 py-2.5 font-medium">Nº AET</th>
                <th className="text-left px-5 py-2.5 font-medium">Placa Trator</th>
                <th className="text-left px-5 py-2.5 font-medium">Placa Reboque</th>
                <th className="text-left px-5 py-2.5 font-medium">Situação</th>
                <th className="text-left px-5 py-2.5 font-medium">Vencimento</th>
                <th className="text-right px-5 py-2.5 font-medium">Ações</th>
              </tr>
            </thead>
            <tbody>
              {(recentes ?? []).map((a: any) => (
                <tr key={a.id} className="border-t hover:bg-slate-50">
                  <td className="px-5 py-2.5 font-medium text-slate-900">{a.numero_aet ?? "—"}</td>
                  <td className="px-5 py-2.5">{a.composicoes?.veiculos?.placa ?? "—"}</td>
                  <td className="px-5 py-2.5">{a.composicoes?.reboques?.placa ?? "—"}</td>
                  <td className="px-5 py-2.5"><SituacaoBadge situacao={a.situacao} /></td>
                  <td className="px-5 py-2.5">{formatDateBR(a.data_fim)}</td>
                  <td className="px-5 py-2.5 text-right">
                    <div className="inline-flex gap-1">
                      <Link to="/aets/$id" params={{ id: a.id }}>
                        <Button variant="ghost" size="sm"><Eye className="h-4 w-4" /></Button>
                      </Link>
                      {a.pdf_url && (
                        <a href={a.pdf_url} target="_blank" rel="noopener noreferrer">
                          <Button variant="ghost" size="sm"><ExternalLink className="h-4 w-4" /></Button>
                        </a>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {recentes && recentes.length === 0 && (
                <tr><td colSpan={6} className="px-5 py-10 text-center text-slate-500">Nenhuma AET cadastrada.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
