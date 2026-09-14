"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
  markProposalSentAction,
  approveProposalAction,
  rejectProposalAction,
  expireProposalAction,
} from "../actions";

const actionsByStatus: Record<
  string,
  { label: string; action: (id: string) => Promise<void>; variant?: "primary" | "outline" | "danger" }[]
> = {
  RASCUNHO: [{ label: "Marcar como enviada", action: markProposalSentAction }],
  ENVIADA: [
    { label: "Aprovar", action: approveProposalAction },
    { label: "Recusar", action: rejectProposalAction, variant: "danger" },
    { label: "Marcar como expirada", action: expireProposalAction, variant: "outline" },
  ],
};

export function ProposalStatusActions({
  proposalId,
  status,
}: {
  proposalId: string;
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
          onClick={() => startTransition(() => a.action(proposalId))}
        >
          {a.label}
        </Button>
      ))}
    </div>
  );
}
