"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
  markQuoteSentAction,
  markQuoteViewedAction,
  markQuoteNegotiatingAction,
  approveQuoteAction,
  rejectQuoteAction,
  expireQuoteAction,
  cancelQuoteAction,
} from "../actions";

type QuoteAction = {
  label: string;
  action: (id: string) => Promise<void | string | null>;
  variant?: "primary" | "outline" | "danger";
  confirm?: string;
};

const CANCEL: QuoteAction = {
  label: "Cancelar orçamento",
  action: cancelQuoteAction,
  variant: "danger",
  confirm: "Cancelar este orçamento? O registro continua no histórico.",
};

const actionsByStatus: Record<string, QuoteAction[]> = {
  RASCUNHO: [{ label: "Marcar como enviado", action: markQuoteSentAction }, CANCEL],
  ENVIADO: [
    { label: "Marcar como visualizado", action: markQuoteViewedAction, variant: "outline" },
    { label: "Em negociação", action: markQuoteNegotiatingAction, variant: "outline" },
    { label: "Aprovar", action: approveQuoteAction },
    { label: "Recusar", action: rejectQuoteAction, variant: "danger" },
    { label: "Marcar como expirado", action: expireQuoteAction, variant: "outline" },
    CANCEL,
  ],
  VISUALIZADO: [
    { label: "Em negociação", action: markQuoteNegotiatingAction, variant: "outline" },
    { label: "Aprovar", action: approveQuoteAction },
    { label: "Recusar", action: rejectQuoteAction, variant: "danger" },
    { label: "Marcar como expirado", action: expireQuoteAction, variant: "outline" },
    CANCEL,
  ],
  EM_NEGOCIACAO: [
    { label: "Aprovar", action: approveQuoteAction },
    { label: "Recusar", action: rejectQuoteAction, variant: "danger" },
    { label: "Marcar como expirado", action: expireQuoteAction, variant: "outline" },
    CANCEL,
  ],
  APROVADO: [CANCEL],
};

export function QuoteStatusActions({
  quoteId,
  status,
}: {
  quoteId: string;
  status: string;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const actions = actionsByStatus[status] ?? [];

  if (actions.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {actions.map((a) => (
        <Button
          key={a.label}
          variant={a.variant ?? "primary"}
          size="sm"
          disabled={pending}
          onClick={() => {
            if (a.confirm && !window.confirm(a.confirm)) return;
            startTransition(async () => {
              const result = await a.action(quoteId);
              setError(typeof result === "string" ? result : null);
            });
          }}
        >
          {a.label}
        </Button>
      ))}
      {error && <p className="w-full text-xs text-red-600">{error}</p>}
    </div>
  );
}
