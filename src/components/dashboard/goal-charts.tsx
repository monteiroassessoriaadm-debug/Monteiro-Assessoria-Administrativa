"use client";

import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { TooltipContentProps } from "recharts";
import { formatCompactBRL, formatCurrencyBRL } from "@/lib/utils";

const RECEIVED = "#2a78d6";
const TO_RECEIVE = "#d97706";
const MISSING = "#cbd5e1";
const GOAL = "#14181f";

/** Barra única: recebido, a receber e o que ainda falta até a meta, com os valores escritos ao lado. */
export function GoalBar({
  title,
  meta,
  recebido,
  aReceber,
}: {
  title: string;
  meta: number;
  recebido: number;
  aReceber: number;
}) {
  const received = Math.max(0, recebido);
  const missing = Math.max(0, meta - received - aReceber);
  const total = Math.max(received + aReceber + missing, 1);
  const segments = [
    { key: "Recebido", value: received, color: RECEIVED },
    { key: "A receber", value: aReceber, color: TO_RECEIVE },
    // Diferente do "Falta" da tabela (meta menos recebido): aqui é o que o "a receber" ainda não cobre.
    { key: "Sem previsão", value: missing, color: MISSING },
  ];

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-baseline justify-between gap-x-3">
        <p className="text-sm font-medium text-slate-900">{title}</p>
        <p className="text-xs text-slate-500">Meta: {formatCurrencyBRL(meta)}</p>
      </div>
      <div
        className="flex h-6 w-full gap-0.5 overflow-hidden rounded bg-slate-100"
        role="img"
        aria-label={`${title}: recebido ${formatCurrencyBRL(received)}, a receber ${formatCurrencyBRL(aReceber)}, sem previsão ${formatCurrencyBRL(missing)}, meta ${formatCurrencyBRL(meta)}`}
      >
        {segments
          .filter((s) => s.value > 0)
          .map((s) => (
            <div
              key={s.key}
              title={`${s.key}: ${formatCurrencyBRL(s.value)}`}
              style={{ width: `${(s.value / total) * 100}%`, backgroundColor: s.color }}
            />
          ))}
      </div>
      <dl className="mt-2 flex flex-col gap-1 text-xs sm:flex-row sm:flex-wrap sm:gap-x-4">
        {segments.map((s) => (
          <div key={s.key} className="flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 shrink-0 rounded-sm" style={{ backgroundColor: s.color }} />
            <dt className="whitespace-nowrap text-slate-500">{s.key}:</dt>
            <dd className="whitespace-nowrap font-semibold text-slate-900">{formatCurrencyBRL(s.value)}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function WeeksTooltip({ active, payload, label }: TooltipContentProps) {
  if (!active || !payload || payload.length === 0) return null;
  const point = payload[0].payload as { meta: number; recebido: number };
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-md">
      <p className="mb-1 font-medium text-slate-500">Semana de {label}</p>
      <p className="text-slate-500">
        Recebido: <span className="font-semibold text-slate-900">{formatCurrencyBRL(point.recebido)}</span>
      </p>
      <p className="text-slate-500">
        Meta: <span className="font-semibold text-slate-900">{formatCurrencyBRL(point.meta)}</span>
      </p>
    </div>
  );
}

export function LastWeeksChart({
  data,
}: {
  data: { label: string; meta: number; recebido: number }[];
}) {
  return (
    <div>
      <ResponsiveContainer width="100%" height={180}>
        <ComposedChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid vertical={false} stroke="#e1e0d9" />
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={{ stroke: "#c3c2b7" }}
            interval="preserveStartEnd"
            minTickGap={10}
            tick={{ fontSize: 11, fill: "#64748b" }}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            width={68}
            tick={{ fontSize: 11, fill: "#64748b" }}
            tickFormatter={(v) => formatCompactBRL(Number(v))}
          />
          <Tooltip cursor={{ fill: "#f1f5f9" }} content={(props) => <WeeksTooltip {...props} />} />
          <Bar dataKey="recebido" fill={RECEIVED} radius={[4, 4, 0, 0]} maxBarSize={28} isAnimationActive={false} />
          <Line
            dataKey="meta"
            type="stepAfter"
            stroke={GOAL}
            strokeWidth={2}
            strokeDasharray="6 4"
            dot={false}
            activeDot={false}
            isAnimationActive={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
      <div className="mt-2 flex flex-wrap items-center gap-4 px-1 text-xs text-slate-600">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: RECEIVED }} /> Recebido
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-0 w-4 border-t-2 border-dashed" style={{ borderColor: GOAL }} /> Meta
        </span>
      </div>
    </div>
  );
}
