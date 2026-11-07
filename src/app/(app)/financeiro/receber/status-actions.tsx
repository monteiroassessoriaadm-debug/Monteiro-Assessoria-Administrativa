"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { markReceivableReceivedAction, cancelReceivableAction, reverseReceivableAction } from "./actions";

export function ReceivableStatusActions({
  receivableId,
  status,
  reversed,
  isReversal,
}: {
  receivableId: string;
  status: string;
  reversed?: boolean;
  isReversal?: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (status === "CANCELADO") return null;

  const runWithConfirm = (message: string, action: (id: string) => Promise<string | null>) => {
    if (!window.confirm(message)) return;
    startTransition(async () => setError(await action(receivableId)));
  };

  return (
    <div className="flex w-full flex-col gap-2">
      <div className="flex flex-wrap justify-end gap-2">
        <Link href={`/financeiro/receber/${receivableId}/editar`}>
          <Button size="sm" variant="outline" type="button">
            Editar
          </Button>
        </Link>
        {status === "PENDENTE" && (
          <>
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
              onClick={() => runWithConfirm("Cancelar esta conta a receber? O registro continua no histórico.", cancelReceivableAction)}
            >
              Cancelar
            </Button>
          </>
        )}
        {status === "RECEBIDO" && !reversed && !isReversal && (
          <Button
            size="sm"
            variant="danger"
            disabled={pending}
            onClick={() => runWithConfirm("Estornar este recebimento? Será lançada uma saída de mesmo valor e a meta será abatida.", reverseReceivableAction)}
          >
            Estornar
          </Button>
        )}
      </div>
      {error && <p className="text-right text-xs text-red-600">{error}</p>}
    </div>
  );
}
