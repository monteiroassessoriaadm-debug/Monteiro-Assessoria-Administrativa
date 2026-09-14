"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { toggleWhatsAppTemplateActiveAction } from "./actions";

export function ToggleWhatsAppTemplateActiveButton({
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
      onClick={() => startTransition(() => toggleWhatsAppTemplateActiveAction(templateId))}
    >
      {active ? "Desativar" : "Ativar"}
    </Button>
  );
}
