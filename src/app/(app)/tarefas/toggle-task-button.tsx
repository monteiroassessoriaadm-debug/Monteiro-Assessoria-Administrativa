"use client";

import { useTransition } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { toggleTaskDoneAction } from "./actions";

export function ToggleTaskButton({ taskId, done }: { taskId: string; done: boolean }) {
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => startTransition(() => toggleTaskDoneAction(taskId))}
      className={cn(
        "flex h-5 w-5 shrink-0 items-center justify-center rounded border",
        done ? "border-emerald-600 bg-emerald-600 text-white" : "border-slate-300",
      )}
    >
      {done && <Check className="h-3.5 w-3.5" />}
    </button>
  );
}
