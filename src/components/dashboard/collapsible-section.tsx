"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

/** Bloco recolhível no celular; no computador fica sempre aberto. */
export function CollapsibleSection({
  title,
  summary,
  defaultOpen = false,
  children,
}: {
  title: string;
  summary?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section>
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex min-h-11 w-full items-center justify-between gap-2 text-left md:hidden"
      >
        <span className="text-xs font-semibold uppercase tracking-widest text-slate-500">{title}</span>
        <span className="flex items-center gap-1 text-xs text-slate-500">
          {!open && summary}
          <ChevronDown className={cn("h-4 w-4 transition-transform", open && "rotate-180")} />
        </span>
      </button>
      <h2 className="mb-3 hidden text-xs font-semibold uppercase tracking-widest text-slate-500 md:block">{title}</h2>
      <div className={cn(open ? "mt-2 block" : "hidden", "md:mt-0 md:block")}>{children}</div>
    </section>
  );
}
