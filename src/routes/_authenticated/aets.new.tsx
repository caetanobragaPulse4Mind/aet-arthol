import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/_authenticated/aets/new")({
  component: NewAet,
});

function NewAet() {
  const navigate = useNavigate();
  const [composicaoId, setComposicaoId] = useState("");
  const [origem, setOrigem] = useState("");
  const [destino, setDestino] = useState("");
  const [numero, setNumero] = useState("");
  const [resolucao, setResolucao] = useState("");
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");
  const [saving, setSaving] = useState(false);

  const { data: composicoes } = useQuery({
    queryKey: ["composicoes-ativas"],
    queryFn: async () => {
      const { data } = await supabase
        .from("composicoes")
        .select("id, veiculos(placa), reboques(placa)")
        .eq("ativo", true)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const { error, data } = await supabase
      .from("aets")
      .insert({
        composicao_id: composicaoId || null,
        numero_aet: numero || null,
        resolucao: resolucao || null,
        origem_carga: origem,
        destino_carga: destino,
        data_inicio: dataInicio || null,
        data_fim: dataFim || null,
        situacao: "EM SOLICITAÇÃO",
        portal_origem: "SIAET",
      })
      .select("id")
      .single();
    setSaving(false);
    if (error) {
      toast.error("Erro ao criar AET", { description: error.message });
      return;
    }
    toast.success("AET criada com sucesso");
    navigate({ to: "/aets/$id", params: { id: data.id } });
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-3">
        <Link to="/aets"><Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4" /></Button></Link>
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Nova AET</h1>
          <p className="text-sm text-slate-500 mt-1">Cadastro de Autorização Especial de Trânsito</p>
        </div>
      </div>

      <Card className="p-6">
        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2 space-y-2">
              <Label>Composição</Label>
              <Select value={composicaoId} onValueChange={setComposicaoId}>
                <SelectTrigger><SelectValue placeholder="Selecione uma composição" /></SelectTrigger>
                <SelectContent>
                  {(composicoes ?? []).map((c: any) => (
                    <SelectItem key={c.id} value={c.id}>
                      {(c.veiculos?.placa ?? "—")} / {(c.reboques?.placa ?? "—")}
                    </SelectItem>
                  ))}
                  {composicoes && composicoes.length === 0 && (
                    <SelectItem value="__none" disabled>Nenhuma composição cadastrada</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Nº AET</Label>
              <Input value={numero} onChange={(e) => setNumero(e.target.value)} placeholder="Opcional no momento da solicitação" />
            </div>
            <div className="space-y-2">
              <Label>Resolução</Label>
              <Input value={resolucao} onChange={(e) => setResolucao(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Origem da carga *</Label>
              <Input required value={origem} onChange={(e) => setOrigem(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Destino da carga *</Label>
              <Input required value={destino} onChange={(e) => setDestino(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Data de início</Label>
              <Input type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Data de fim</Label>
              <Input type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)} />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Link to="/aets"><Button type="button" variant="outline">Cancelar</Button></Link>
            <Button type="submit" disabled={saving}>{saving ? "Salvando..." : "Criar AET"}</Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
