"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { markLeadLostAction } from "../actions";

export function MarkLostButton({ leadId }: { leadId: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      variant="ghost"
      disabled={pending}
      onClick={() => startTransition(() => markLeadLostAction(leadId))}
    >
      Marcar como perdido
    </Button>
  );
}
