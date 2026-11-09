"use client";

import { useTransition } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { deleteCalendarEventAction } from "./actions";

export function DeleteEventButton({ eventId }: { eventId: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      variant="ghost"
      size="sm"
      className="min-w-11"
      aria-label="Excluir evento"
      disabled={pending}
      onClick={() => startTransition(() => deleteCalendarEventAction(eventId))}
    >
      <Trash2 className="h-4 w-4" />
    </Button>
  );
}
