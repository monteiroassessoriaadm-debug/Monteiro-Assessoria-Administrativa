"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { markCommissionPaidAction } from "./actions";

export function CommissionStatusActions({
  commissionId,
  status,
}: {
  commissionId: string;
  status: string;
}) {
  const [pending, startTransition] = useTransition();

  if (status !== "PENDENTE") return null;

  return (
    <Button
      size="sm"
      disabled={pending}
      onClick={() => startTransition(() => markCommissionPaidAction(commissionId))}
    >
      Marcar pago
    </Button>
  );
}
