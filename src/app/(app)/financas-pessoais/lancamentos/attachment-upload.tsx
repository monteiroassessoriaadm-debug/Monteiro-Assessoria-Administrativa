"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Paperclip } from "lucide-react";

/** Envia o comprovante para a rota própria (aceita até 3 MB, mais que uma ação do servidor). */
export function AttachmentUpload({ transactionId, hasFile }: { transactionId: string; hasFile: boolean }) {
  const input = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const [status, setStatus] = useState<string | null>(null);

  async function send(file: File) {
    setStatus("Enviando...");
    const body = new FormData();
    body.set("transactionId", transactionId);
    body.set("file", file);
    const res = await fetch("/financas-pessoais/anexo", { method: "POST", body });
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    if (!res.ok) {
      setStatus(data.error ?? "Não consegui enviar.");
      return;
    }
    setStatus(null);
    router.refresh();
  }

  return (
    <span className="inline-flex items-center gap-1">
      <input
        ref={input}
        type="file"
        accept="image/*,application/pdf"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void send(f);
          e.target.value = "";
        }}
      />
      <button
        type="button"
        onClick={() => input.current?.click()}
        className="inline-flex min-h-11 items-center gap-1 rounded-lg px-2 text-xs text-slate-600 hover:bg-slate-100 md:min-h-8"
      >
        <Paperclip className="h-3.5 w-3.5" />
        {hasFile ? "Trocar" : "Anexar"}
      </button>
      {status && <span className="text-xs text-slate-500">{status}</span>}
    </span>
  );
}
