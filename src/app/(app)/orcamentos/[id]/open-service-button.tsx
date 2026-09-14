"use client";

import { useTransition } from "react";
import { PlayCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { openServicesFromQuoteAction } from "@/app/(app)/servicos-abertos/actions";

export function OpenServiceFromQuoteButton({ quoteId }: { quoteId: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      variant="secondary"
      disabled={pending}
      onClick={() => startTransition(() => openServicesFromQuoteAction(quoteId))}
    >
      <PlayCircle className="h-4 w-4" /> Abrir serviço(s)
    </Button>
  );
}
