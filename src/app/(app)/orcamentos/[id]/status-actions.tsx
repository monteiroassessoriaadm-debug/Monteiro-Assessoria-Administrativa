"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
  markQuoteSentAction,
  markQuoteViewedAction,
  markQuoteNegotiatingAction,
  approveQuoteAction,
  rejectQuoteAction,
  expireQuoteAction,
} from "../actions";

const actionsByStatus: Record<
  string,
  { label: string; action: (id: string) => Promise<void>; variant?: "primary" | "outline" | "danger" }[]
> = {
  RASCUNHO: [{ label: "Marcar como enviado", action: markQuoteSentAction }],
  ENVIADO: [
    { label: "Marcar como visualizado", action: markQuoteViewedAction, variant: "outline" },
    { label: "Em negociação", action: markQuoteNegotiatingAction, variant: "outline" },
    { label: "Aprovar", action: approveQuoteAction },
    { label: "Recusar", action: rejectQuoteAction, variant: "danger" },
    { label: "Marcar como expirado", action: expireQuoteAction, variant: "outline" },
  ],
  VISUALIZADO: [
    { label: "Em negociação", action: markQuoteNegotiatingAction, variant: "outline" },
    { label: "Aprovar", action: approveQuoteAction },
    { label: "Recusar", action: rejectQuoteAction, variant: "danger" },
    { label: "Marcar como expirado", action: expireQuoteAction, variant: "outline" },
  ],
  EM_NEGOCIACAO: [
    { label: "Aprovar", action: approveQuoteAction },
    { label: "Recusar", action: rejectQuoteAction, variant: "danger" },
    { label: "Marcar como expirado", action: expireQuoteAction, variant: "outline" },
  ],
};

export function QuoteStatusActions({
  quoteId,
  status,
}: {
  quoteId: string;
  status: string;
}) {
  const [pending, startTransition] = useTransition();
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
          onClick={() => startTransition(() => a.action(quoteId))}
        >
          {a.label}
        </Button>
      ))}
    </div>
  );
}
