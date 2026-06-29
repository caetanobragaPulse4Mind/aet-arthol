import { cn } from "@/lib/utils";

const STYLES: Record<string, string> = {
  LIBERADA: "bg-emerald-100 text-emerald-800 border-emerald-200",
  "EM SOLICITAÇÃO": "bg-blue-100 text-blue-800 border-blue-200",
  "EM PROCESSO DE ANÁLISE": "bg-amber-100 text-amber-800 border-amber-200",
  CANCELADA: "bg-red-100 text-red-800 border-red-200",
  VENCIDA: "bg-slate-200 text-slate-700 border-slate-300",
};

export function SituacaoBadge({ situacao }: { situacao: string }) {
  const cls = STYLES[situacao] ?? "bg-slate-100 text-slate-700 border-slate-200";
  return (
    <span className={cn("inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium", cls)}>
      {situacao}
    </span>
  );
}

const BOLETO: Record<string, string> = {
  PENDENTE: "bg-amber-100 text-amber-800 border-amber-200",
  PAGO: "bg-emerald-100 text-emerald-800 border-emerald-200",
  VENCIDO: "bg-red-100 text-red-800 border-red-200",
};

export function BoletoStatusBadge({ status }: { status: string }) {
  const cls = BOLETO[status] ?? "bg-slate-100 text-slate-700 border-slate-200";
  return (
    <span className={cn("inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium", cls)}>
      {status}
    </span>
  );
}
