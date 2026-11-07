"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
  markProposalSentAction,
  approveProposalAction,
  rejectProposalAction,
  expireProposalAction,
  cancelProposalAction,
} from "../actions";

type ProposalAction = {
  label: string;
  action: (id: string) => Promise<void | string | null>;
  variant?: "primary" | "outline" | "danger";
  confirm?: string;
};

const CANCEL: ProposalAction = {
  label: "Cancelar proposta",
  action: cancelProposalAction,
  variant: "danger",
  confirm: "Cancelar esta proposta? O registro continua no histórico.",
};

const actionsByStatus: Record<string, ProposalAction[]> = {
  RASCUNHO: [{ label: "Marcar como enviada", action: markProposalSentAction }, CANCEL],
  ENVIADA: [
    { label: "Aprovar", action: approveProposalAction },
    { label: "Recusar", action: rejectProposalAction, variant: "danger" },
    { label: "Marcar como expirada", action: expireProposalAction, variant: "outline" },
    CANCEL,
  ],
  APROVADA: [CANCEL],
};

export function ProposalStatusActions({
  proposalId,
  status,
}: {
  proposalId: string;
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
              const result = await a.action(proposalId);
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
