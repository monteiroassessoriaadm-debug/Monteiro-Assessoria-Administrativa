"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { toggleFinancialAccountActiveAction } from "./actions";

export function ToggleAccountActiveButton({
  accountId,
  active,
}: {
  accountId: string;
  active: boolean;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      variant="ghost"
      size="sm"
      disabled={pending}
      onClick={() => startTransition(() => toggleFinancialAccountActiveAction(accountId))}
    >
      {active ? "Desativar" : "Ativar"}
    </Button>
  );
}
