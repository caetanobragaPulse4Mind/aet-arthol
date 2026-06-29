import { createFileRoute } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";

export const Route = createFileRoute("/_authenticated/usuarios")({
  component: () => (
    <Card className="p-10 text-center">
      <h2 className="text-lg font-semibold text-slate-900">Usuários</h2>
      <p className="text-sm text-slate-500 mt-2">Módulo administrativo em desenvolvimento (Fase 3).</p>
    </Card>
  ),
});
