"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { TooltipContentProps } from "recharts";
import { formatCompactBRL, formatCurrencyBRL, cn } from "@/lib/utils";

type Point = { label: string; saldo: number; entradas: number; saidas: number };

const COLOR = "#2a78d6";

function BalanceTooltip({ active, payload, label }: TooltipContentProps) {
  if (!active || !payload || payload.length === 0) return null;
  const p = payload[0].payload as Point;
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-md">
      <p className="mb-1 font-medium text-slate-500">{label}</p>
      <p className="font-semibold text-slate-900">Saldo: {formatCurrencyBRL(p.saldo)}</p>
      <p className="text-slate-500">Entrou: {formatCurrencyBRL(p.entradas)}</p>
      <p className="text-slate-500">Saiu: {formatCurrencyBRL(p.saidas)}</p>
    </div>
  );
}

export function BalanceCard({
  total,
  accounts,
  daily,
  monthly,
}: {
  total: number;
  accounts: { id: string; name: string; current: number }[];
  daily: Point[];
  monthly: Point[];
}) {
  const [range, setRange] = useState<"dia" | "mes">("dia");
  const data = range === "dia" ? daily : monthly;

  return (
    <section aria-label="Saldo em conta" className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <Link href="/financeiro/ajustar-saldo" className="block p-4 hover:bg-slate-50 md:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-medium text-slate-500">Saldo em conta</p>
            <p className={cn("mt-1 whitespace-nowrap text-3xl font-bold md:text-4xl", total >= 0 ? "text-slate-900" : "text-red-600")}>
              {formatCurrencyBRL(total)}
            </p>
          </div>
          <span className="flex shrink-0 items-center gap-0.5 pt-1 text-xs font-medium text-blue-700">
            Ajustar <ChevronRight className="h-4 w-4" />
          </span>
        </div>
        {accounts.length > 0 && (
          <dl className="mt-3 flex flex-wrap gap-x-6 gap-y-1 border-t border-slate-100 pt-3 text-sm">
            {accounts.map((a) => (
              <div key={a.id} className="flex items-baseline gap-1.5">
                <dt className="text-slate-500">{a.name}:</dt>
                <dd className="whitespace-nowrap font-semibold text-slate-900">{formatCurrencyBRL(a.current)}</dd>
              </div>
            ))}
          </dl>
        )}
      </Link>

      <div className="border-t border-slate-100 p-4 pt-3 md:p-5 md:pt-3">
        <div className="mb-2 flex items-center justify-between gap-2">
          <p className="text-xs font-medium text-slate-500">Evolução do saldo</p>
          <div className="flex rounded-lg bg-slate-100 p-0.5" role="group" aria-label="Período do gráfico">
            {(
              [
                ["dia", "30 dias"],
                ["mes", "12 meses"],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                aria-pressed={range === value}
                onClick={() => setRange(value)}
                className={cn(
                  "min-h-11 rounded-md px-3 text-xs font-medium md:min-h-8",
                  range === value ? "bg-white text-slate-900 shadow-sm" : "text-slate-500",
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <ResponsiveContainer width="100%" height={150}>
          <AreaChart data={data} margin={{ top: 6, right: 6, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="saldoFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={COLOR} stopOpacity={0.25} />
                <stop offset="100%" stopColor={COLOR} stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke="#e1e0d9" />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={{ stroke: "#c3c2b7" }}
              minTickGap={24}
              tick={{ fontSize: 11, fill: "#64748b" }}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              width={68}
              tick={{ fontSize: 11, fill: "#64748b" }}
              tickFormatter={(v) => formatCompactBRL(Number(v))}
            />
            <Tooltip cursor={{ stroke: "#c3c2b7" }} content={(props) => <BalanceTooltip {...props} />} />
            <Area type="monotone" dataKey="saldo" stroke={COLOR} strokeWidth={2} fill="url(#saldoFill)" isAnimationActive={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
