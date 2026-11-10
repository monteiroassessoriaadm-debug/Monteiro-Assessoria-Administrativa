"use client";

import { useTransition } from "react";
import { Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { duplicateTemplateAction, toggleTemplateAction } from "../actions";

export function TemplateButtons({ templateId, active }: { templateId: string; active: boolean }) {
  const [pending, start] = useTransition();
  return (
    <>
      <Button variant="outline" size="sm" disabled={pending} onClick={() => start(() => duplicateTemplateAction(templateId))}>
        <Copy className="h-4 w-4" /> Duplicar
      </Button>
      <Button variant="ghost" size="sm" disabled={pending} onClick={() => start(() => toggleTemplateAction(templateId))}>
        {active ? "Desativar" : "Ativar"}
      </Button>
    </>
  );
}
