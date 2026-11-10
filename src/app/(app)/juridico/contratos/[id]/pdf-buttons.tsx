"use client";

import { useState } from "react";
import { Check, Copy, Download, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Abre o PDF e, no celular, compartilha o arquivo direto (WhatsApp, e-mail...). */
export function PdfButtons({ href, filename }: { href: string; filename: string }) {
  const [sharing, setSharing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function share() {
    setError(null);
    setSharing(true);
    try {
      const res = await fetch(href);
      if (!res.ok) throw new Error("PDF indisponível");
      const file = new File([await res.blob()], filename, { type: "application/pdf" });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: filename });
      } else {
        // Sem compartilhamento de arquivo (computador): baixa o PDF.
        const url = URL.createObjectURL(file);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (e) {
      if ((e as Error).name !== "AbortError") setError("Não consegui compartilhar. Abra o PDF e compartilhe por ele.");
    } finally {
      setSharing(false);
    }
  }

  return (
    <>
      <a href={href} target="_blank" rel="noreferrer">
        <Button variant="outline">
          <Download className="h-4 w-4" /> PDF
        </Button>
      </a>
      <Button variant="outline" onClick={share} disabled={sharing}>
        <Share2 className="h-4 w-4" /> {sharing ? "Preparando..." : "Compartilhar"}
      </Button>
      {error && <p className="w-full text-xs text-red-600">{error}</p>}
    </>
  );
}

export function CopyTextButton({ text, label = "Copiar mensagem" }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={async () => {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
    >
      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />} {copied ? "Copiada" : label}
    </Button>
  );
}
