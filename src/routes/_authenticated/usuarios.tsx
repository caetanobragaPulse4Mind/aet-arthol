import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatDateBR } from "@/lib/format";
import { ShieldAlert } from "lucide-react";

export const Route = createFileRoute("/_authenticated/usuarios")({
  component: UsuariosPage,
});

type Profile = {
  id: string;
  nome: string;
  email: string;
  role: string;
  created_at: string;
};

function UsuariosPage() {
  const { profile } = useAuth();
  const isAdmin = profile?.role === "admin";
  const qc = useQueryClient();
  const [savingId, setSavingId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["profiles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*").order("nome");
      if (error) throw error;
      return (data ?? []) as Profile[];
    },
    enabled: isAdmin,
  });

  async function changeRole(p: Profile, role: string) {
    if (p.id === profile?.id && role !== "admin") {
      if (!confirm("Você está removendo seu próprio acesso de administrador. Confirmar?")) return;
    }
    setSavingId(p.id);
    const { error } = await supabase.from("profiles").update({ role }).eq("id", p.id);
    setSavingId(null);
    if (error) return toast.error(error.message);
    toast.success(`Papel de ${p.nome} atualizado para ${role}`);
    qc.invalidateQueries({ queryKey: ["profiles"] });
  }

  if (!isAdmin) {
    return (
      <Card className="p-10 text-center">
        <ShieldAlert className="h-10 w-10 text-amber-500 mx-auto mb-3" />
        <h2 className="text-lg font-semibold text-slate-900">Acesso restrito</h2>
        <p className="text-sm text-slate-500 mt-2">Somente administradores podem gerenciar usuários.</p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Usuários</h1>
        <p className="text-sm text-slate-500 mt-1">Gerencie os operadores e administradores do sistema</p>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>E-mail</TableHead>
              <TableHead>Cadastrado em</TableHead>
              <TableHead className="w-48">Papel</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && <TableRow><TableCell colSpan={4} className="text-center py-8 text-slate-400">Carregando...</TableCell></TableRow>}
            {data?.map((p) => (
              <TableRow key={p.id}>
                <TableCell className="font-medium">
                  {p.nome}
                  {p.id === profile?.id && <Badge variant="outline" className="ml-2">Você</Badge>}
                </TableCell>
                <TableCell>{p.email}</TableCell>
                <TableCell>{formatDateBR(p.created_at)}</TableCell>
                <TableCell>
                  <Select value={p.role} onValueChange={(r) => changeRole(p, r)} disabled={savingId === p.id}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Administrador</SelectItem>
                      <SelectItem value="operador">Operador</SelectItem>
                    </SelectContent>
                  </Select>
                </TableCell>
              </TableRow>
            ))}
            {data?.length === 0 && <TableRow><TableCell colSpan={4} className="text-center py-8 text-slate-400">Nenhum usuário cadastrado</TableCell></TableRow>}
          </TableBody>
        </Table>
      </Card>

      <Card className="p-4 bg-slate-50 border-dashed">
        <p className="text-sm text-slate-600">
          <strong>Novos usuários:</strong> peça ao usuário para se cadastrar na tela de login. Após o primeiro acesso, você poderá alterar o papel dele aqui.
        </p>
      </Card>
    </div>
  );
}
