"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { markCommissionPaidAction, cancelCommissionAction } from "./actions";

export function CommissionStatusActions({
  commissionId,
  status,
}: {
  commissionId: string;
  status: string;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (status !== "PENDENTE") return null;

  return (
    <div className="flex w-full flex-col gap-2">
      <div className="flex flex-wrap justify-end gap-2">
        <Button
          size="sm"
          disabled={pending}
          onClick={() => startTransition(async () => setError(await markCommissionPaidAction(commissionId)))}
        >
          Marcar pago
        </Button>
        <Button
          size="sm"
          variant="danger"
          disabled={pending}
          onClick={() => {
            if (!window.confirm("Cancelar este lançamento? O registro continua no histórico.")) return;
            startTransition(async () => setError(await cancelCommissionAction(commissionId)));
          }}
        >
          Cancelar
        </Button>
      </div>
      {error && <p className="text-right text-xs text-red-600">{error}</p>}
    </div>
  );
}
