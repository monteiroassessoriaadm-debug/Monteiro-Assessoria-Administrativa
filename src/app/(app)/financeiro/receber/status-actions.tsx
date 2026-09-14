"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { markReceivableReceivedAction, cancelReceivableAction } from "./actions";

export function ReceivableStatusActions({
  receivableId,
  status,
}: {
  receivableId: string;
  status: string;
}) {
  const [pending, startTransition] = useTransition();

  if (status !== "PENDENTE") return null;

  return (
    <div className="flex justify-end gap-2">
      <Button
        size="sm"
        disabled={pending}
        onClick={() => startTransition(() => markReceivableReceivedAction(receivableId))}
      >
        Marcar recebido
      </Button>
      <Button
        size="sm"
        variant="danger"
        disabled={pending}
        onClick={() => startTransition(() => cancelReceivableAction(receivableId))}
      >
        Cancelar
      </Button>
    </div>
  );
}
