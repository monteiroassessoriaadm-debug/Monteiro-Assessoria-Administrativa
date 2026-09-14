"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { startProductionAction, sendForApprovalAction, cancelMediaContentAction } from "../actions";

const actionsByStatus: Record<
  string,
  { label: string; run: (id: string) => Promise<void>; variant?: "primary" | "outline" | "danger" }[]
> = {
  IDEIA: [
    { label: "Iniciar produção", run: startProductionAction },
    { label: "Cancelar", run: cancelMediaContentAction, variant: "danger" },
  ],
  EM_PRODUCAO: [
    { label: "Enviar para aprovação", run: sendForApprovalAction },
    { label: "Cancelar", run: cancelMediaContentAction, variant: "danger" },
  ],
  REPROVADO: [
    { label: "Voltar para produção", run: startProductionAction, variant: "outline" },
    { label: "Cancelar", run: cancelMediaContentAction, variant: "danger" },
  ],
};

export function MediaContentStatusActions({ contentId, status }: { contentId: string; status: string }) {
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
          onClick={() => startTransition(() => a.run(contentId))}
        >
          {a.label}
        </Button>
      ))}
    </div>
  );
}
