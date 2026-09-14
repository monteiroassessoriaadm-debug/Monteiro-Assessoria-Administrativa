"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { markPayablePaidAction, cancelPayableAction } from "./actions";

export function PayableStatusActions({
  payableId,
  status,
}: {
  payableId: string;
  status: string;
}) {
  const [pending, startTransition] = useTransition();

  if (status !== "PENDENTE") return null;

  return (
    <div className="flex justify-end gap-2">
      <Button
        size="sm"
        disabled={pending}
        onClick={() => startTransition(() => markPayablePaidAction(payableId))}
      >
        Marcar pago
      </Button>
      <Button
        size="sm"
        variant="danger"
        disabled={pending}
        onClick={() => startTransition(() => cancelPayableAction(payableId))}
      >
        Cancelar
      </Button>
    </div>
  );
}
