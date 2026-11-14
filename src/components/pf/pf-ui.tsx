import { cn, formatCurrencyBRL } from "@/lib/utils";
import { TONE_BAR, TONE_DOT, TONE_TEXT } from "@/lib/pf/labels";
import type { Tone } from "@/lib/pf/calc";

export function PageTitle({ title, subtitle, children }: { title: string; subtitle?: string; children?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h2 className="text-lg font-bold text-slate-900">{title}</h2>
        {subtitle && <p className="text-sm text-slate-500">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

export function ProgressBar({ value, tone = "green", className }: { value: number; tone?: Tone; className?: string }) {
  const width = Math.max(0, Math.min(100, value));
  return (
    <div className={cn("h-2.5 w-full overflow-hidden rounded-full bg-slate-100", className)}>
      <div className={cn("h-full rounded-full", TONE_BAR[tone])} style={{ width: `${width}%` }} />
    </div>
  );
}

export function ToneDot({ tone }: { tone: Tone }) {
  return <span className={cn("inline-block h-2.5 w-2.5 shrink-0 rounded-full", TONE_DOT[tone])} aria-hidden="true" />;
}

export function Indicator({ label, value, tone, hint }: { label: string; value: string; tone: Tone; hint?: string }) {
  const word = { green: "bom", yellow: "atenção", red: "alerta", slate: "sem dados" }[tone];
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm md:p-4">
      <div className="flex items-center gap-2">
        <ToneDot tone={tone} />
        <p className="text-xs text-slate-500">{label}</p>
      </div>
      <p className={cn("mt-1 text-lg font-bold lg:text-2xl", TONE_TEXT[tone])}>{value}</p>
      <p className="text-xs text-slate-500">
        <span className={cn("font-medium", TONE_TEXT[tone])}>{word}</span>
        {hint ? ` · ${hint}` : ""}
      </p>
    </div>
  );
}

export function Money({ value, signed = false, className }: { value: number; signed?: boolean; className?: string }) {
  const tone = signed ? (value < 0 ? "text-red-700" : "text-emerald-700") : "";
  return <span className={cn("whitespace-nowrap", tone, className)}>{formatCurrencyBRL(value)}</span>;
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <p className="rounded-lg border border-dashed border-slate-200 p-6 text-center text-sm text-slate-400">{children}</p>;
}

export function pctText(value: number | null) {
  return value === null ? "—" : `${value.toString().replace(".", ",")}%`;
}

/** Dia guardado como AAAA-MM-DD → DD/MM/AAAA. */
export function dayBR(key: string | null | undefined) {
  if (!key) return "-";
  const [y, m, d] = key.split("-");
  return `${d}/${m}/${y}`;
}
