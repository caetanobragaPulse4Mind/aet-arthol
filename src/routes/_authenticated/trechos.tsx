import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Upload, Search, FileSpreadsheet } from "lucide-react";
import { formatDateBR } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/trechos")({
  component: TrechosPage,
});

type Trecho = {
  id: string;
  br: number;
  estado: string;
  km_ini: number;
  km_fim: number;
  linha: number | null;
  ativo: boolean;
  fonte: string;
  updated_at: string;
};

type Importacao = {
  id: string;
  arquivo: string;
  inseridos: number;
  atualizados: number;
  desativados: number;
  status: string;
  created_at: string;
};

function TrechosPage() {
  const { profile } = useAuth();
  const isAdmin = profile?.role === "admin";
  const qc = useQueryClient();
  const [busca, setBusca] = useState("");
  const [uf, setUf] = useState("");
  const [importing, setImporting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const { data: trechos, isLoading } = useQuery({
    queryKey: ["trechos", busca, uf],
    queryFn: async () => {
      let q = supabase.from("trechos").select("*").eq("ativo", true).order("estado").order("br").order("km_ini").limit(500);
      if (uf) q = q.eq("estado", uf.toUpperCase());
      if (busca) {
        const n = Number(busca);
        if (!isNaN(n)) q = q.eq("br", n);
      }
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as Trecho[];
    },
  });

  const { data: importacoes } = useQuery({
    queryKey: ["importacoes-trechos"],
    queryFn: async () => {
      const { data } = await supabase
        .from("importacoes_trechos")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(10);
      return (data ?? []) as Importacao[];
    },
    enabled: isAdmin,
  });

  async function handleImport(file: File) {
    setImporting(true);
    const tid = toast.loading("Processando planilha...");
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows: any[] = XLSX.utils.sheet_to_json(ws, { defval: null });

      // Parse rows -> {br, estado, km_ini, km_fim, linha}
      const parsed: { br: number; estado: string; km_ini: number; km_fim: number; linha: number }[] = [];
      for (let i = 0; i < rows.length; i++) {
        const r = rows[i];
        const br = Number(r.BR ?? r.br ?? r.Br);
        const estado = String(r.UF ?? r.uf ?? r.ESTADO ?? r.estado ?? "").toUpperCase().trim();
        const km_ini = Number(String(r.KM_INI ?? r.km_ini ?? r["KM INICIAL"] ?? r.KMI ?? "").toString().replace(",", "."));
        const km_fim = Number(String(r.KM_FIM ?? r.km_fim ?? r["KM FINAL"] ?? r.KMF ?? "").toString().replace(",", "."));
        if (!br || !estado || isNaN(km_ini) || isNaN(km_fim)) continue;
        parsed.push({ br, estado, km_ini, km_fim, linha: i + 2 });
      }

      if (parsed.length === 0) {
        toast.error("Nenhuma linha válida encontrada", { id: tid, description: "Colunas esperadas: BR, UF, KM_INI, KM_FIM" });
        return;
      }

      // Fetch existing trechos to compute diff
      const { data: existing } = await supabase.from("trechos").select("id, br, estado, km_ini, km_fim, ativo");
      const key = (t: { br: number; estado: string; km_ini: number; km_fim: number }) =>
        `${t.estado}|${t.br}|${t.km_ini.toFixed(3)}|${t.km_fim.toFixed(3)}`;
      const existingMap = new Map((existing ?? []).map((e) => [key(e as any), e]));
      const parsedKeys = new Set(parsed.map(key));

      let inseridos = 0, atualizados = 0, desativados = 0;

      // Upsert in batches
      const batchSize = 500;
      for (let i = 0; i < parsed.length; i += batchSize) {
        const batch = parsed.slice(i, i + batchSize).map((p) => ({ ...p, ativo: true, fonte: "importacao" }));
        const { error } = await supabase.from("trechos").upsert(batch, { onConflict: "estado,br,km_ini,km_fim" });
        if (error) throw error;
      }

      for (const p of parsed) {
        const ex = existingMap.get(key(p));
        if (!ex) inseridos++;
        else if (!ex.ativo) atualizados++;
        else atualizados++;
      }

      // Desativar trechos ausentes na nova planilha
      const toDeactivate = (existing ?? []).filter((e) => e.ativo && !parsedKeys.has(key(e as any))).map((e) => e.id);
      if (toDeactivate.length > 0) {
        // chunked
        for (let i = 0; i < toDeactivate.length; i += 200) {
          const ids = toDeactivate.slice(i, i + 200);
          const { error } = await supabase.from("trechos").update({ ativo: false }).in("id", ids);
          if (error) throw error;
        }
        desativados = toDeactivate.length;
      }

      const { data: userData } = await supabase.auth.getUser();
      await supabase.from("importacoes_trechos").insert({
        arquivo: file.name,
        inseridos,
        atualizados: atualizados - inseridos,
        desativados,
        status: "concluido",
        user_id: userData.user?.id ?? null,
      });

      toast.success("Importação concluída", {
        id: tid,
        description: `${parsed.length} linhas processadas • ${desativados} desativados`,
      });
      qc.invalidateQueries({ queryKey: ["trechos"] });
      qc.invalidateQueries({ queryKey: ["importacoes-trechos"] });
    } catch (err: any) {
      toast.error("Falha na importação", { id: tid, description: err.message });
    } finally {
      setImporting(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Trechos rodoviários</h1>
          <p className="text-sm text-slate-500 mt-1">Base de referência de trechos ativos por BR e UF</p>
        </div>
        {isAdmin && (
          <div>
            <input
              ref={fileRef}
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleImport(e.target.files[0])}
            />
            <Button onClick={() => fileRef.current?.click()} disabled={importing}>
              <Upload className="h-4 w-4 mr-2" />
              {importing ? "Importando..." : "Importar XLSX"}
            </Button>
          </div>
        )}
      </div>

      <Card className="p-4">
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input placeholder="Buscar por BR (número)" className="pl-9" value={busca} onChange={(e) => setBusca(e.target.value)} />
          </div>
          <Input placeholder="UF (ex. SP)" className="w-32" maxLength={2} value={uf} onChange={(e) => setUf(e.target.value)} />
        </div>
      </Card>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>UF</TableHead>
              <TableHead>BR</TableHead>
              <TableHead>KM inicial</TableHead>
              <TableHead>KM final</TableHead>
              <TableHead>Extensão (km)</TableHead>
              <TableHead>Fonte</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && <TableRow><TableCell colSpan={6} className="text-center py-8 text-slate-400">Carregando...</TableCell></TableRow>}
            {trechos?.map((t) => (
              <TableRow key={t.id}>
                <TableCell className="font-medium">{t.estado}</TableCell>
                <TableCell>BR-{String(t.br).padStart(3, "0")}</TableCell>
                <TableCell>{t.km_ini.toFixed(2)}</TableCell>
                <TableCell>{t.km_fim.toFixed(2)}</TableCell>
                <TableCell>{(t.km_fim - t.km_ini).toFixed(2)}</TableCell>
                <TableCell><Badge variant="outline">{t.fonte}</Badge></TableCell>
              </TableRow>
            ))}
            {trechos?.length === 0 && <TableRow><TableCell colSpan={6} className="text-center py-8 text-slate-400">Nenhum trecho encontrado</TableCell></TableRow>}
          </TableBody>
        </Table>
      </Card>

      {isAdmin && importacoes && importacoes.length > 0 && (
        <Card>
          <div className="p-4 border-b flex items-center gap-2">
            <FileSpreadsheet className="h-4 w-4 text-slate-500" />
            <div className="text-sm font-medium">Histórico de importações</div>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Arquivo</TableHead>
                <TableHead>Inseridos</TableHead>
                <TableHead>Atualizados</TableHead>
                <TableHead>Desativados</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {importacoes.map((i) => (
                <TableRow key={i.id}>
                  <TableCell>{formatDateBR(i.created_at)}</TableCell>
                  <TableCell>{i.arquivo}</TableCell>
                  <TableCell>{i.inseridos}</TableCell>
                  <TableCell>{i.atualizados}</TableCell>
                  <TableCell>{i.desativados}</TableCell>
                  <TableCell><Badge>{i.status}</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}
