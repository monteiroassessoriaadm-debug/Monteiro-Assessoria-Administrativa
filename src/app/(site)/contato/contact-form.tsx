"use client";

import { useActionState } from "react";
import { CheckCircle2 } from "lucide-react";
import { enviarContatoAction, type ContatoFormState } from "./actions";

const initialState: ContatoFormState = {};

const inputClass =
  "h-11 w-full rounded-lg border border-white/15 bg-white/5 px-3 text-sm text-white placeholder:text-neutral-500 focus:border-[#d4af37] focus:outline-none focus:ring-1 focus:ring-[#d4af37]";

export function ContactForm({
  servicos,
  servicoSelecionado,
}: {
  servicos: { id: string; name: string }[];
  servicoSelecionado?: string;
}) {
  const [state, formAction, pending] = useActionState(enviarContatoAction, initialState);

  if (state.success) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-[#d4af37]/30 bg-white/5 p-10 text-center">
        <CheckCircle2 className="h-10 w-10 text-[#d4af37]" />
        <p className="text-lg font-semibold text-white">Mensagem enviada!</p>
        <p className="text-sm text-neutral-400">
          Recebemos seu contato e vamos retornar o quanto antes.
        </p>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      {/* honeypot anti-spam, invisível para pessoas */}
      <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" />

      <div>
        <label className="mb-1 block text-sm font-medium text-neutral-300">Nome *</label>
        <input name="name" required className={inputClass} placeholder="Seu nome" />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-neutral-300">WhatsApp</label>
        <input name="whatsapp" className={inputClass} placeholder="(00) 00000-0000" />
      </div>
      {servicos.length > 0 && (
        <div>
          <label className="mb-1 block text-sm font-medium text-neutral-300">
            Serviço de interesse
          </label>
          <select
            name="potentialServiceId"
            defaultValue={servicoSelecionado ?? ""}
            className={inputClass}
          >
            <option value="">Não sei / outro assunto</option>
            {servicos.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
      )}
      <div>
        <label className="mb-1 block text-sm font-medium text-neutral-300">Mensagem</label>
        <textarea
          name="notes"
          rows={4}
          className={inputClass.replace("h-11", "py-2")}
          placeholder="Conte pra gente o que você precisa"
        />
      </div>

      {state.error && (
        <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-300">{state.error}</p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-[#d4af37] px-6 py-3 text-sm font-semibold text-neutral-950 transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {pending ? "Enviando..." : "Enviar mensagem"}
      </button>
    </form>
  );
}
