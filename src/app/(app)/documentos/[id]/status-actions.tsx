"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
  markDocumentSentAction,
  markDocumentAwaitingSignatureAction,
  markDocumentSignedAction,
  cancelDocumentAction,
} from "../actions";

const actionsByStatus: Record<
  string,
  { label: string; action: (id: string) => Promise<void>; variant?: "primary" | "outline" | "danger" }[]
> = {
  GERADO: [
    { label: "Marcar como enviado", action: markDocumentSentAction },
    { label: "Cancelar", action: cancelDocumentAction, variant: "danger" },
  ],
  ENVIADO: [
    { label: "Aguardando assinatura", action: markDocumentAwaitingSignatureAction, variant: "outline" },
    { label: "Marcar como assinado", action: markDocumentSignedAction },
    { label: "Cancelar", action: cancelDocumentAction, variant: "danger" },
  ],
  AGUARDANDO_ASSINATURA: [
    { label: "Marcar como assinado", action: markDocumentSignedAction },
    { label: "Cancelar", action: cancelDocumentAction, variant: "danger" },
  ],
};

export function DocumentStatusActions({
  documentId,
  status,
}: {
  documentId: string;
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
          onClick={() => startTransition(() => a.action(documentId))}
        >
          {a.label}
        </Button>
      ))}
    </div>
  );
}
