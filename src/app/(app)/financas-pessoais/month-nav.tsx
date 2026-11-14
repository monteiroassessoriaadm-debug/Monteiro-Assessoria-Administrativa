import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { addMonths, monthLabelFull } from "@/lib/pf/calc";

/** Setas de mês anterior / próximo, mantendo os outros filtros da URL. */
export function MonthNav({ month, basePath, params = {} }: { month: string; basePath: string; params?: Record<string, string | undefined> }) {
  const href = (m: string) => {
    const q = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) if (v) q.set(k, v);
    q.set("mes", m);
    return `${basePath}?${q.toString()}`;
  };
  const btn = "inline-flex h-11 w-11 items-center justify-center rounded-lg bg-white ring-1 ring-slate-200 hover:bg-slate-50 md:h-9 md:w-9";
  return (
    <div className="flex items-center gap-2">
      <Link href={href(addMonths(month, -1))} className={btn} aria-label="Mês anterior">
        <ChevronLeft className="h-4 w-4" />
      </Link>
      <span className="min-w-36 text-center text-sm font-medium first-letter:uppercase text-slate-900">{monthLabelFull(month)}</span>
      <Link href={href(addMonths(month, 1))} className={btn} aria-label="Próximo mês">
        <ChevronRight className="h-4 w-4" />
      </Link>
    </div>
  );
}

export function monthParam(value: string | string[] | undefined, fallback: string) {
  const v = Array.isArray(value) ? value[0] : value;
  return v && /^\d{4}-(0[1-9]|1[0-2])$/.test(v) ? v : fallback;
}
