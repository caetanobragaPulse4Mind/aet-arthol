// src/integrations/aet-rpa/download-pdf.server.ts
//
// Server function chamada pelo client. Roda só no servidor (TanStack Start),
// então o AET_RPA_API_TOKEN nunca é exposto ao browser.
// attachSupabaseAuth já está registrado global em src/start.ts, então o Bearer
// token do Supabase é anexado automaticamente nessa chamada pelo client.
//
// Aponta para a rota real do aet-rpa: GET /aet-especifica/:numero/:ano
// (protegida por requireBearerToken na Hetzner — já testada em produção).
//
// O aet-rpa roda só na Hetzner (atrás do Traefik) — mesmo com o front rodando
// local no WSL para dev, AET_RPA_BASE_URL aponta pro domínio de produção.
// Não há porta pra mapear: 8080 é interno à rede overlay do Swarm.
//   AET_RPA_BASE_URL=https://aet-rpa.pulse4mind.com
//   AET_RPA_API_TOKEN=<mesmo token do .env do aet-rpa>

import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const AET_RPA_BASE_URL = process.env.AET_RPA_BASE_URL ?? "https://aet-rpa.pulse4mind.com";
const AET_RPA_API_TOKEN = process.env.AET_RPA_API_TOKEN;

type DownloadAetPdfInput = {
  numeroAet: string;
  ano: string;
};

export const downloadAetPdf = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: DownloadAetPdfInput) => data)
  .handler(async ({ data }) => {
    if (!AET_RPA_API_TOKEN) {
      throw new Error("AET_RPA_API_TOKEN não configurado no ambiente do servidor");
    }

    const { numeroAet, ano } = data;

    const response = await fetch(
      `${AET_RPA_BASE_URL}/aet-especifica/${encodeURIComponent(numeroAet)}/${encodeURIComponent(ano)}`,
      {
        headers: {
          Authorization: `Bearer ${AET_RPA_API_TOKEN}`,
        },
      }
    );

    if (!response.ok) {
      // A rota /aet-especifica devolve JSON { erro: "..." } nos casos de 400/404/500 —
      // repassa essa mensagem pro client em vez de um texto genérico.
      let mensagem = `Falha ao buscar PDF (status ${response.status})`;
      try {
        const body = await response.json();
        if (body?.erro) mensagem = body.erro;
      } catch {
        // resposta não era JSON — mantém a mensagem genérica
      }
      throw new Error(mensagem);
    }

    const arrayBuffer = await response.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString("base64");

    return {
      base64,
      filename: `AET-${numeroAet}-${ano}.pdf`,
    };
  });