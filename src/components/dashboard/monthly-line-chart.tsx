"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { TooltipContentProps } from "recharts";
import { formatCompactBRL, formatCompactNumber } from "@/lib/utils";

const FORMATTERS = {
  number: formatCompactNumber,
  currency: formatCompactBRL,
} as const;

export type ChartSeries = {
  key: string;
  label: string;
  color: string;
  dashed?: boolean;
};

export type ChartPoint = Record<string, string | number> & { label: string };

function CustomTooltip({
  active,
  payload,
  label,
  series,
  valueFormatter,
}: TooltipContentProps & {
  series: ChartSeries[];
  valueFormatter: (v: number) => string;
}) {
  if (!active || !payload || payload.length === 0) return null;

  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-md">
      <p className="mb-1 text-xs font-medium text-slate-500">{label}</p>
      <div className="space-y-1">
        {series.map((s) => {
          const entry = payload.find((p) => p.dataKey === s.key);
          if (!entry) return null;
          return (
            <div key={s.key} className="flex items-center gap-2 text-xs">
              <span
                className="inline-block h-0.5 w-3 shrink-0"
                style={{ backgroundColor: s.color }}
              />
              <span className="text-slate-500">{s.label}:</span>
              <span className="font-semibold text-slate-900">
                {valueFormatter(Number(entry.value ?? 0))}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function MonthlyLineChart({
  data,
  series,
  format = "number",
  height = 220,
}: {
  data: ChartPoint[];
  series: ChartSeries[];
  format?: keyof typeof FORMATTERS;
  height?: number;
}) {
  const valueFormatter = FORMATTERS[format];

  return (
    <div>
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={data} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
          <CartesianGrid vertical={false} stroke="#e1e0d9" />
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={{ stroke: "#c3c2b7" }}
            tick={{ fontSize: 11, fill: "#898781" }}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            width={48}
            tick={{ fontSize: 11, fill: "#898781" }}
            tickFormatter={(v) => valueFormatter(Number(v))}
          />
          <Tooltip
            cursor={{ stroke: "#c3c2b7", strokeWidth: 1 }}
            content={(props) => (
              <CustomTooltip {...props} series={series} valueFormatter={valueFormatter} />
            )}
          />
          {series.map((s) => (
            <Line
              key={s.key}
              type="monotone"
              dataKey={s.key}
              name={s.label}
              stroke={s.color}
              strokeWidth={2}
              strokeDasharray={s.dashed ? "6 4" : undefined}
              dot={{ r: 3, fill: s.color, strokeWidth: 0 }}
              activeDot={{ r: 5, stroke: "#fcfcfb", strokeWidth: 2 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
      {series.length > 1 && (
        <div className="mt-2 flex flex-wrap items-center gap-4 px-1">
          {series.map((s) => (
            <div key={s.key} className="flex items-center gap-1.5 text-xs text-slate-600">
              <span
                className="inline-block h-0.5 w-4 shrink-0"
                style={{
                  backgroundColor: s.color,
                  ...(s.dashed
                    ? {
                        backgroundImage: `repeating-linear-gradient(to right, ${s.color} 0, ${s.color} 4px, transparent 4px, transparent 7px)`,
                        backgroundColor: "transparent",
                      }
                    : {}),
                }}
              />
              {s.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
