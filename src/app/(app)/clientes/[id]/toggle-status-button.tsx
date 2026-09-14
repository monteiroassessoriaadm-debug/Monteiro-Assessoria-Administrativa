"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { toggleClientStatusAction } from "../actions";

export function ToggleStatusButton({
  clientId,
  status,
}: {
  clientId: string;
  status: "ATIVO" | "INATIVO";
}) {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      variant="ghost"
      disabled={pending}
      onClick={() => startTransition(() => toggleClientStatusAction(clientId))}
    >
      {status === "ATIVO" ? "Marcar como inativo" : "Reativar cliente"}
    </Button>
  );
}
