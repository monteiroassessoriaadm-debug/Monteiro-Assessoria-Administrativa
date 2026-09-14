"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { toggleTemplateActiveAction } from "./actions";

export function ToggleTemplateActiveButton({
  templateId,
  active,
}: {
  templateId: string;
  active: boolean;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      variant="ghost"
      size="sm"
      disabled={pending}
      onClick={() => startTransition(() => toggleTemplateActiveAction(templateId))}
    >
      {active ? "Desativar" : "Ativar"}
    </Button>
  );
}
