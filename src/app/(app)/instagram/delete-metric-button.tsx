"use client";

import { useTransition } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { deleteInstagramMetricAction } from "./actions";

export function DeleteMetricButton({ metricId }: { metricId: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      variant="ghost"
      size="sm"
      disabled={pending}
      onClick={() => startTransition(() => deleteInstagramMetricAction(metricId))}
    >
      <Trash2 className="h-4 w-4" />
    </Button>
  );
}
