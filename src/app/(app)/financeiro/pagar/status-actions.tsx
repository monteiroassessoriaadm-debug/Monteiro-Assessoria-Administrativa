"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { markPayablePaidAction, cancelPayableAction, reversePayableAction } from "./actions";

export function PayableStatusActions({
  payableId,
  status,
  reversed,
  isReversal,
}: {
  payableId: string;
  status: string;
  reversed?: boolean;
  isReversal?: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (status === "CANCELADO") return null;

  const runWithConfirm = (message: string, action: (id: string) => Promise<string | null>) => {
    if (!window.confirm(message)) return;
    startTransition(async () => setError(await action(payableId)));
  };

  return (
    <div className="flex w-full flex-col gap-2">
      <div className="flex flex-wrap justify-end gap-2">
        <Link href={`/financeiro/pagar/${payableId}/editar`}>
          <Button size="sm" variant="outline" type="button">
            Editar
          </Button>
        </Link>
        {status === "PENDENTE" && (
          <>
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
              onClick={() => runWithConfirm("Cancelar esta conta a pagar? O registro continua no histórico.", cancelPayableAction)}
            >
              Cancelar
            </Button>
          </>
        )}
        {status === "PAGO" && !reversed && !isReversal && (
          <Button
            size="sm"
            variant="danger"
            disabled={pending}
            onClick={() => runWithConfirm("Estornar este pagamento? Será lançada uma entrada de mesmo valor no caixa.", reversePayableAction)}
          >
            Estornar
          </Button>
        )}
      </div>
      {error && <p className="text-right text-xs text-red-600">{error}</p>}
    </div>
  );
}
