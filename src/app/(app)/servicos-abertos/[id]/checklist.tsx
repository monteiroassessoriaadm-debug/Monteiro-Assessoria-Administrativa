"use client";

import { useTransition } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { toggleChecklistItemAction } from "../actions";

type Item = { id: string; description: string; done: boolean };

export function Checklist({ items }: { items: Item[] }) {
  const [pending, startTransition] = useTransition();

  if (items.length === 0) {
    return <p className="text-sm text-slate-400">Este serviço não possui checklist.</p>;
  }

  return (
    <ul className="space-y-2">
      {items.map((item) => (
        <li key={item.id}>
          <button
            type="button"
            disabled={pending}
            onClick={() => startTransition(() => toggleChecklistItemAction(item.id))}
            className="flex w-full items-center gap-3 rounded-lg border border-slate-200 px-3 py-2 text-left text-sm hover:bg-slate-50"
          >
            <span
              className={cn(
                "flex h-5 w-5 shrink-0 items-center justify-center rounded border",
                item.done ? "border-emerald-600 bg-emerald-600 text-white" : "border-slate-300",
              )}
            >
              {item.done && <Check className="h-3.5 w-3.5" />}
            </span>
            <span className={cn(item.done && "text-slate-400 line-through")}>
              {item.description}
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}
