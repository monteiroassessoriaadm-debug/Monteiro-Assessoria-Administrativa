"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { updateServiceInstanceStatusAction } from "../actions";
import { ServiceInstanceStatus } from "@/generated/prisma/enums";

const actionsByStatus: Record<
  string,
  { label: string; status: ServiceInstanceStatus; variant?: "primary" | "outline" | "danger" }[]
> = {
  ABERTO: [
    { label: "Iniciar execução", status: ServiceInstanceStatus.EM_ANDAMENTO },
    { label: "Cancelar", status: ServiceInstanceStatus.CANCELADO, variant: "danger" },
  ],
  EM_ANDAMENTO: [
    { label: "Enviar para revisão", status: ServiceInstanceStatus.EM_REVISAO },
    { label: "Cancelar", status: ServiceInstanceStatus.CANCELADO, variant: "danger" },
  ],
  EM_REVISAO: [
    { label: "Voltar para execução", status: ServiceInstanceStatus.EM_ANDAMENTO, variant: "outline" },
    { label: "Marcar como entregue / concluído", status: ServiceInstanceStatus.CONCLUIDO },
  ],
};

export function ServiceInstanceStatusActions({
  instanceId,
  status,
}: {
  instanceId: string;
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
          onClick={() => startTransition(() => updateServiceInstanceStatusAction(instanceId, a.status))}
        >
          {a.label}
        </Button>
      ))}
    </div>
  );
}
