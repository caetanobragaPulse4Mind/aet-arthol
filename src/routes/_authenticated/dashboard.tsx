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
import { FileText, AlertTriangle, Receipt, Clock, ExternalLink, Eye, Plus, ArrowUp, ArrowDown, ArrowUpDown, ChevronLeft, ChevronRight } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: Dashboard,
});

const SITUACOES = ["LIBERADA", "EM SOLICITAÇÃO", "EM PROCESSO DE ANÁLISE", "CANCELADA", "VENCIDA"];
const MESES = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

type SortKey = "numero_aet" | "resolucao" | "origem_carga" | "destino_carga" | "situacao" | "data_inicio" | "data_fim";

// Comparador "natural": trata trechos numéricos dentro da string como número,
// então "AET/2025/9" vem antes de "AET/2025/10" (string pura ordenaria errado)
const collator = new Intl.Collator("pt-BR", { numeric: true, sensitivity: "base" });

function monthRange(offset: number) {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() + offset, 1);
  const end = new Date(now.getFullYear(), now.getMonth() + offset + 1, 0);
  const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  return {
    start: iso(start),
    end: iso(end),
    year: start.getFullYear(),
    month: start.getMonth(), // 0-indexed
    label: `${MESES[start.getMonth()]} de ${start.getFullYear()}`,
  };
}

// offset (em meses, relativo a hoje) a partir de um ano/mês específico escolhido no select
function offsetFromYearMonth(year: number, month: number) {
  const now = new Date();
  return (year - now.getFullYear()) * 12 + (month - now.getMonth());
}

function Dashboard() {
  const today = todayISO();
  const in30 = addDaysISO(30);

  const [situacao, setSituacao] = useState<string>("all");
  const [placa, setPlaca] = useState("");
  const [monthOffset, setMonthOffset] = useState(0);
  const [sortKey, setSortKey] = useState<SortKey | null>("data_inicio");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const range = useMemo(() => monthRange(monthOffset), [monthOffset]);

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
    queryKey: ["dashboard-aets", situacao, placa, range.start, range.end],
    queryFn: async () => {
      // Mostra as AETs SOLICITADAS no mês selecionado (data_inicio dentro do período),
      // igual ao filtro por ano/mês do próprio site do SIAET — não mistura meses.
      let q = supabase
        .from("aets")
        .select("id, numero_aet, resolucao, origem_carga, destino_carga, situacao, data_inicio, data_fim, pdf_url, composicoes(veiculos(placa), reboques(placa))")
        .gte("data_inicio", range.start)
        .lte("data_inicio", range.end)
        .order("data_inicio", { ascending: true });
      if (situacao !== "all") q = q.eq("situacao", situacao);
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
      return collator.compare(String(av), String(bv)) * dir;
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

  // opções pro select de ano: uns anos pra trás e pra frente do atual
  const anoAtual = new Date().getFullYear();
  const anos = Array.from({ length: 6 }, (_, i) => anoAtual - 3 + i);

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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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
        </div>
      </Card>

      <Card className="p-0 overflow-hidden">
        <div className="px-5 py-4 border-b flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h2 className="font-semibold text-slate-900">AETs — {range.label}</h2>
            <p className="text-xs text-slate-500 mt-0.5">Solicitadas neste mês</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setMonthOffset((o) => o - 1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>

            <Select
              value={String(range.month)}
              onValueChange={(v) => setMonthOffset(offsetFromYearMonth(range.year, Number(v)))}
            >
              <SelectTrigger className="w-[140px] h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                {MESES.map((m, i) => <SelectItem key={m} value={String(i)}>{m}</SelectItem>)}
              </SelectContent>
            </Select>

            <Select
              value={String(range.year)}
              onValueChange={(v) => setMonthOffset(offsetFromYearMonth(Number(v), range.month))}
            >
              <SelectTrigger className="w-[90px] h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                {anos.map((a) => <SelectItem key={a} value={String(a)}>{a}</SelectItem>)}
              </SelectContent>
            </Select>

            <Button variant="outline" size="sm" onClick={() => setMonthOffset((o) => o + 1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
            {monthOffset !== 0 && (
              <Button variant="ghost" size="sm" onClick={() => setMonthOffset(0)}>Hoje</Button>
            )}
          </div>
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
                <SortHeader k="data_inicio" label="Data AET" />
                <SortHeader k="data_fim" label="Validade" />
                <th className="text-right px-5 py-2.5 font-medium">Ações</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr><td colSpan={8} className="px-5 py-10 text-center text-slate-400">Carregando...</td></tr>
              )}
              {!isLoading && sorted.map((a: any) => (
                <tr key={a.id} className="border-t hover:bg-slate-50">
                  <td className="px-5 py-2.5 font-medium text-slate-900">{a.numero_aet ?? "—"}</td>
                  <td className="px-5 py-2.5">{a.resolucao ?? "—"}</td>
                  <td className="px-5 py-2.5">{a.origem_carga ?? "—"}</td>
                  <td className="px-5 py-2.5">{a.destino_carga ?? "—"}</td>
                  <td className="px-5 py-2.5"><SituacaoBadge situacao={a.situacao} /></td>
                  <td className="px-5 py-2.5 whitespace-nowrap">{formatDateBR(a.data_inicio)}</td>
                  <td className="px-5 py-2.5 whitespace-nowrap">{formatDateBR(a.data_fim)}</td>
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
                <tr><td colSpan={8} className="px-5 py-10 text-center text-slate-500">Nenhuma AET solicitada neste mês.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}