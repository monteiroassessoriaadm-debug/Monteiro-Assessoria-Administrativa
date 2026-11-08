"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { MonthlyLineChart, type ChartPoint, type ChartSeries } from "@/components/dashboard/monthly-line-chart";

export type ChartTab = {
  key: string;
  label: string;
  title: string;
  data: ChartPoint[];
  series: ChartSeries[];
  format: "number" | "currency";
};

/** Os gráficos de 12 meses em abas, em vez de quatro empilhados. */
export function ChartTabs({ tabs }: { tabs: ChartTab[] }) {
  const [active, setActive] = useState(tabs[0]?.key);
  const tab = tabs.find((t) => t.key === active) ?? tabs[0];
  if (!tab) return null;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div role="tablist" aria-label="Gráficos dos últimos 12 meses" className="-mx-1 mb-3 flex gap-1 overflow-x-auto px-1">
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={t.key === tab.key}
            onClick={() => setActive(t.key)}
            className={cn(
              "min-h-11 shrink-0 rounded-lg px-3 text-sm font-medium md:min-h-9",
              t.key === tab.key ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>
      <p className="mb-2 text-sm font-medium text-slate-900">{tab.title}</p>
      <MonthlyLineChart data={tab.data} series={tab.series} format={tab.format} />
    </div>
  );
}
