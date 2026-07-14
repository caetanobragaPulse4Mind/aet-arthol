import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SituacaoBadge } from "@/components/situacao-badge";
import { formatDateBR, todayISO, addDaysISO } from "@/lib/format";
import { FileText, AlertTriangle, Receipt, Clock, ExternalLink, Eye, Plus, ArrowUp, ArrowDown, ArrowUpDown } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: Dashboard,
});

const SITUACOES = ["LIBERADA", "EM SOLICITAÇÃO", "EM PROCESSO DE ANÁLISE", "CANCELADA", "VENCIDA"];

type SortKey = "numero_aet" | "resolucao" | "origem_carga" | "destino_carga" | "situacao" | "data_inicio";

function Dashboard() {
  const today = todayISO();
  const in30 = addDaysISO(30);

  const [situacao, setSituacao] = useState<string>("all");
  const [placa, setPlaca] = useState("");
  const [dataIni, setDataIni] = useState("");
  const [dataFim, setDataFim] = useState("");
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

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

  const { data: aets, isLoading } = useQuery({
    queryKey: ["dashboard-aets", situacao, placa, dataIni, dataFim],
    queryFn: async () => {
      let q = supabase
        .from("aets")
        .select("id, numero_aet, resolucao, origem_carga, destino_carga, situacao, data_inicio, data_fim, pdf_url, composicoes(veiculos(placa), reboques(placa))")
        .order("created_at", { ascending: false });
      if (situacao !== "all") q = q.eq("situacao", situacao);
      if (dataIni) q = q.gte("data_inicio", dataIni);
      if (dataFim) q = q.lte("data_fim", dataFim);
      const { data } = await q;
      let rows = data ?? [];
      if (placa.trim()) {
        const p = placa.trim().toUpperCase();
        rows = rows.filter((a: any) =>
          (a.composicoes?.veiculos?.placa ?? "").toUpperCase().includes(p) ||
          (a.composicoes?.reboques?.placa ?? "").toUpperCase().includes(p)
        );
      }
      return rows;
    },
  });

  const sorted = useMemo(() => {
    const rows = [...(aets ?? [])];
    if (!sortKey) return rows;
    const dir = sortDir === "asc" ? 1 : -1;
    return rows.sort((a: any, b: any) => {
      const av = a[sortKey] ?? "";
      const bv = b[sortKey] ?? "";
      if (av < bv) return -1 * dir;
      if (av > bv) return 1 * dir;
      return 0;
    });
  }, [aets, sortKey, sortDir]);

  function toggleSort(k: SortKey) {
    if (sortKey !== k) { setSortKey(k); setSortDir("asc"); return; }
    if (sortDir === "asc") { setSortDir("desc"); return; }
    setSortKey(null);
  }

  function SortHeader({ k, label }: { k: SortKey; label: string }) {
    const active = sortKey === k;
    const Icon = !active ? ArrowUpDown : sortDir === "asc" ? ArrowUp : ArrowDown;
    return (
      <th className="px-5 py-2.5 font-medium text-left">
        <button
          type="button"
          onClick={() => toggleSort(k)}
          className={`inline-flex items-center gap-1.5 hover:text-slate-900 transition-colors ${active ? "text-slate-900" : ""}`}
        >
          {label}
          <Icon className={`h-3.5 w-3.5 ${active ? "opacity-100" : "opacity-40"}`} />
        </button>
      </th>
    );
  }

  const cards = [
    { label: "AETs ativas", value: stats?.ativas, icon: FileText, color: "text-emerald-600 bg-emerald-50" },
    { label: "Vencendo em 30 dias", value: stats?.vencendo, icon: AlertTriangle, color: "text-amber-600 bg-amber-50" },
    { label: "Boletos pendentes", value: stats?.pendentes, icon: Receipt, color: "text-blue-600 bg-blue-50" },
    { label: "Em análise", value: stats?.analise, icon: Clock, color: "text-slate-600 bg-slate-100" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Dashboard</h1>
          <p className="text-sm text-slate-500 mt-1">Visão geral e autorizações</p>
        </div>
        <Link to="/aets/new">
          <Button><Plus className="h-4 w-4 mr-1.5" /> Nova AET</Button>
        </Link>
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

      <Card className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div>
            <label className="text-xs text-slate-500 mb-1 block">Situação</label>
            <Select value={situacao} onValueChange={setSituacao}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {SITUACOES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs text-slate-500 mb-1 block">Placa</label>
            <Input placeholder="Ex: ABC1D23" value={placa} onChange={(e) => setPlaca(e.target.value)} />
          </div>
          <div>
            <label className="text-xs text-slate-500 mb-1 block">Início ≥</label>
            <Input type="date" value={dataIni} onChange={(e) => setDataIni(e.target.value)} />
          </div>
          <div>
            <label className="text-xs text-slate-500 mb-1 block">Fim ≤</label>
            <Input type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)} />
          </div>
        </div>
      </Card>

      <Card className="p-0 overflow-hidden">
        <div className="px-5 py-4 border-b">
          <h2 className="font-semibold text-slate-900">AETs</h2>
          <p className="text-xs text-slate-500 mt-0.5">Ordenadas por cadastro mais recente</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <SortHeader k="numero_aet" label="Nº AET" />
                <SortHeader k="resolucao" label="Resolução" />
                <SortHeader k="origem_carga" label="Origem" />
                <SortHeader k="destino_carga" label="Destino" />
                <SortHeader k="situacao" label="Situação" />
                <SortHeader k="data_inicio" label="Validade" />
                <th className="text-right px-5 py-2.5 font-medium">Ações</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr><td colSpan={7} className="px-5 py-10 text-center text-slate-400">Carregando...</td></tr>
              )}
              {!isLoading && sorted.map((a: any) => (
                <tr key={a.id} className="border-t hover:bg-slate-50">
                  <td className="px-5 py-2.5 font-medium text-slate-900">{a.numero_aet ?? "—"}</td>
                  <td className="px-5 py-2.5">{a.resolucao ?? "—"}</td>
                  <td className="px-5 py-2.5">{a.origem_carga ?? "—"}</td>
                  <td className="px-5 py-2.5">{a.destino_carga ?? "—"}</td>
                  <td className="px-5 py-2.5"><SituacaoBadge situacao={a.situacao} /></td>
                  <td className="px-5 py-2.5 whitespace-nowrap">
                    {formatDateBR(a.data_inicio)} → {formatDateBR(a.data_fim)}
                  </td>
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
              {!isLoading && sorted.length === 0 && (
                <tr><td colSpan={7} className="px-5 py-10 text-center text-slate-500">Nenhuma AET encontrada.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
