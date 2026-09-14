"use client";

import { useTransition } from "react";
import { PlayCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { openServiceFromProposalAction } from "@/app/(app)/servicos-abertos/actions";

export function OpenServiceFromProposalButton({ proposalId }: { proposalId: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      variant="secondary"
      disabled={pending}
      onClick={() => startTransition(() => openServiceFromProposalAction(proposalId))}
    >
      <PlayCircle className="h-4 w-4" /> Abrir serviço
    </Button>
  );
}
