"use client";

import { useTransition } from "react";
import { Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { duplicateTemplateAction } from "./actions";

export function DuplicateTemplateButton({ templateId }: { templateId: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      variant="ghost"
      size="sm"
      disabled={pending}
      onClick={() => startTransition(() => duplicateTemplateAction(templateId))}
    >
      <Copy className="h-4 w-4" /> Duplicar
    </Button>
  );
}
