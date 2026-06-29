import { createFileRoute } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";

export const Route = createFileRoute("/_authenticated/veiculos")({
  component: () => (
    <Card className="p-10 text-center">
      <h2 className="text-lg font-semibold text-slate-900">Veículos</h2>
      <p className="text-sm text-slate-500 mt-2">Módulo em desenvolvimento (Fase 2).</p>
    </Card>
  ),
});
