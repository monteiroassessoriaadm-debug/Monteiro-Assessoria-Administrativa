"use client";

import { useActionState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type PfState = { error?: string; success?: string; at?: number };

/**
 * Formulário das Finanças Pessoais: chama a ação do servidor, mostra o retorno
 * e limpa os campos quando salva (a menos que keepValues).
 */
export function PfForm({
  action,
  children,
  submitLabel = "Salvar",
  pendingLabel = "Salvando...",
  keepValues = false,
  className,
  compact = false,
  variant = "primary",
  confirmText,
}: {
  action: (prev: PfState, formData: FormData) => Promise<PfState>;
  children?: React.ReactNode;
  submitLabel?: string;
  pendingLabel?: string;
  keepValues?: boolean;
  className?: string;
  compact?: boolean;
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger";
  confirmText?: string;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const ref = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.success && !keepValues) ref.current?.reset();
  }, [state.at, state.success, keepValues]);

  return (
    <form
      ref={ref}
      action={formAction}
      onSubmit={(e) => {
        if (confirmText && !window.confirm(confirmText)) e.preventDefault();
      }}
      className={cn(compact ? "inline-flex flex-wrap items-center gap-2" : "space-y-4", className)}
    >
      {children}
      {!compact && state.error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>}
      {!compact && state.success && <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-800">{state.success}</p>}
      <div className={compact ? "contents" : "flex justify-end"}>
        <Button type="submit" size={compact ? "sm" : "md"} variant={variant} disabled={pending} className={compact ? "" : "w-full sm:w-auto"}>
          {pending ? pendingLabel : submitLabel}
        </Button>
      </div>
      {compact && state.error && <span className="w-full text-xs text-red-700">{state.error}</span>}
    </form>
  );
}
