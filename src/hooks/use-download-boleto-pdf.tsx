// src/hooks/use-download-boleto-pdf.tsx
import { useMutation } from "@tanstack/react-query";
import { downloadBoletoPdf } from "@/integrations/aet-rpa/download-pdf.server";

function base64ToBlob(base64: string, contentType = "application/pdf") {
  const byteChars = atob(base64);
  const byteNumbers = new Array(byteChars.length);
  for (let i = 0; i < byteChars.length; i++) {
    byteNumbers[i] = byteChars.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  return new Blob([byteArray], { type: contentType });
}

export function useDownloadBoletoPdf() {
  return useMutation({
    mutationFn: async ({ numeroAet, ano }: { numeroAet: string; ano: string }) => {
      const { base64 } = await downloadBoletoPdf({ data: { numeroAet, ano } });
      const blob = base64ToBlob(base64);
      const url = URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = url;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      document.body.appendChild(link);
      link.click();
      link.remove();

      // Revoga depois de um tempo generoso pra dar chance do PDF carregar na aba nova
      // antes do Blob URL deixar de existir.
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    },
  });
}