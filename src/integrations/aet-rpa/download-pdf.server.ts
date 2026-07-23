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

    // DEBUG temporário — sem import de módulo Node (quebrava o bundle do client).
    // Mostra só tamanho e últimos 6 caracteres, o suficiente pra comparar sem expor o token inteiro.
    const tokenPreview = AET_RPA_API_TOKEN
      ? `len=${AET_RPA_API_TOKEN.length} ...${AET_RPA_API_TOKEN.slice(-6)}`
      : "(vazio/undefined)";
    console.log("[downloadAetPdf] AET_RPA_API_TOKEN em uso:", tokenPreview);
    console.log("[downloadAetPdf] chamando:", `${AET_RPA_BASE_URL}/aet-especifica/${numeroAet}/${ano}`);

    const response = await fetch(
      `${AET_RPA_BASE_URL}/aet-especifica/${encodeURIComponent(numeroAet)}/${encodeURIComponent(ano)}`,
      {
        headers: {
          Authorization: `Bearer ${AET_RPA_API_TOKEN}`,
        },
      }
    );

    console.log("[downloadAetPdf] status da resposta:", response.status);

    if (!response.ok) {
      // A rota /aet-especifica devolve JSON { erro: "..." } nos casos de 400/404/500 —
      // repassa essa mensagem pro client em vez de um texto genérico.
      let mensagem = `Falha ao buscar PDF (status ${response.status})`;
      try {
        const body = await response.json();
        console.log("[downloadAetPdf] corpo do erro:", body);
        if (body?.erro) mensagem = body.erro;
      } catch (parseErr) {
        console.log("[downloadAetPdf] resposta não era JSON:", parseErr);
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

// Mesmo padrão do downloadAetPdf acima, mas aponta pra rota de boleto:
// GET /baixar-boleto/:numero/:ano (mesma auth, mesmos status codes, mesmo
// esquema de arquivo no volume — {numero}-{ano}.pdf em /app/pdfs/boletos).
// O número/ano do boleto são os mesmos da AET à qual ele está vinculado
// (1 boleto por AET, via índice único em aet_id).

type DownloadBoletoPdfInput = {
  numeroAet: string;
  ano: string;
};

export const downloadBoletoPdf = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: DownloadBoletoPdfInput) => data)
  .handler(async ({ data }) => {
    if (!AET_RPA_API_TOKEN) {
      throw new Error("AET_RPA_API_TOKEN não configurado no ambiente do servidor");
    }

    const { numeroAet, ano } = data;

    // DEBUG temporário — sem import de módulo Node (quebrava o bundle do client).
    // Mostra só tamanho e últimos 6 caracteres, o suficiente pra comparar sem expor o token inteiro.
    const tokenPreview = AET_RPA_API_TOKEN
      ? `len=${AET_RPA_API_TOKEN.length} ...${AET_RPA_API_TOKEN.slice(-6)}`
      : "(vazio/undefined)";
    console.log("[downloadBoletoPdf] AET_RPA_API_TOKEN em uso:", tokenPreview);
    console.log("[downloadBoletoPdf] chamando:", `${AET_RPA_BASE_URL}/baixar-boleto/${numeroAet}/${ano}`);

    const response = await fetch(
      `${AET_RPA_BASE_URL}/baixar-boleto/${encodeURIComponent(numeroAet)}/${encodeURIComponent(ano)}`,
      {
        headers: {
          Authorization: `Bearer ${AET_RPA_API_TOKEN}`,
        },
      }
    );

    console.log("[downloadBoletoPdf] status da resposta:", response.status);

    if (!response.ok) {
      // A rota /baixar-boleto devolve JSON { erro: "..." } nos casos de 400/404/500 —
      // repassa essa mensagem pro client em vez de um texto genérico.
      let mensagem = `Falha ao buscar boleto (status ${response.status})`;
      try {
        const body = await response.json();
        console.log("[downloadBoletoPdf] corpo do erro:", body);
        if (body?.erro) mensagem = body.erro;
      } catch (parseErr) {
        console.log("[downloadBoletoPdf] resposta não era JSON:", parseErr);
        // resposta não era JSON — mantém a mensagem genérica
      }
      throw new Error(mensagem);
    }

    const arrayBuffer = await response.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString("base64");

    return {
      base64,
      filename: `Boleto-${numeroAet}-${ano}.pdf`,
    };
  });