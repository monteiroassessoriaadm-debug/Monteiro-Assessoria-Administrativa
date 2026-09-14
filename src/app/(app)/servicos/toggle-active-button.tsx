"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { toggleServiceActiveAction } from "./actions";

export function ToggleActiveButton({
  serviceId,
  active,
}: {
  serviceId: string;
  active: boolean;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      variant="ghost"
      size="sm"
      disabled={pending}
      onClick={() => startTransition(() => toggleServiceActiveAction(serviceId))}
    >
      {active ? "Desativar" : "Ativar"}
    </Button>
  );
}
