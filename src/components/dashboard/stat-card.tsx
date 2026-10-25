import Link from "next/link";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

export function StatCard({
  label,
  value,
  icon: Icon,
  tone = "slate",
  href,
}: {
  label: string;
  value: string | number;
  icon?: LucideIcon;
  tone?: "slate" | "green" | "red" | "amber" | "blue";
  href?: string;
}) {
  const toneClasses: Record<string, string> = {
    slate: "bg-slate-100 text-slate-700",
    green: "bg-emerald-100 text-emerald-700",
    red: "bg-red-100 text-red-700",
    amber: "bg-amber-100 text-amber-700",
    blue: "bg-blue-100 text-blue-700",
  };

  const content = (
    <>
      {Icon && (
        <div className={cn("rounded-lg p-2.5", toneClasses[tone])}>
          <Icon className="h-5 w-5" />
        </div>
      )}
      <div>
        <p className="text-2xl font-bold text-slate-900">{value}</p>
        <p className="text-xs text-slate-500">{label}</p>
      </div>
    </>
  );

  if (href) {
    return (
      <Link
        href={href}
        className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-colors hover:border-blue-300 hover:bg-blue-50/40"
      >
        {content}
      </Link>
    );
  }

  return (
    <div className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      {content}
    </div>
  );
}

export function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-slate-500">
      {children}
    </h2>
  );
}
