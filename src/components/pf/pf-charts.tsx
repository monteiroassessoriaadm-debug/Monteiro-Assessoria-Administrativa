"use client";

import {
  Area,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatCompactBRL, formatCurrencyBRL } from "@/lib/utils";

// Mesmo estilo dos gráficos do painel da empresa (grade, eixos e cores).
const GRID = "#e1e0d9";
const AXIS = "#c3c2b7";
const TICK = { fontSize: 11, fill: "#898781" };
export const PF_COLORS = {
  entrada: "#008300",
  saida: "#e34948",
  divida: "#c2410c",
  investido: "#2a78d6",
  patrimonio: "#6250d6",
};
const CATEGORY_COLORS = ["#2a78d6", "#e34948", "#008300", "#d97706", "#6250d6", "#0891b2", "#db2777", "#65a30d", "#78716c"];

type Point = Record<string, string | number | null>;
export type TrendSeries = { key: string; label: string; color: string; dashed?: boolean; area?: boolean };

function TooltipBox({ label, rows }: { label?: string; rows: { name: string; color: string; value: number }[] }) {
  if (rows.length === 0) return null;
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-md">
      {label && <p className="mb-1 text-xs font-medium text-slate-500">{label}</p>}
      {rows.map((r) => (
        <div key={r.name} className="flex items-center gap-2 text-xs">
          <span className="inline-block h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: r.color }} />
          <span className="text-slate-500">{r.name}:</span>
          <span className="font-semibold text-slate-900">{formatCurrencyBRL(r.value)}</span>
        </div>
      ))}
    </div>
  );
}

function Legend({ items }: { items: { label: string; color: string; dashed?: boolean }[] }) {
  return (
    <div className="mt-2 flex flex-wrap items-center gap-4 px-1">
      {items.map((s) => (
        <div key={s.label} className="flex items-center gap-1.5 text-xs text-slate-600">
          <span
            className="inline-block h-1 w-4 shrink-0 rounded"
            style={
              s.dashed
                ? { backgroundImage: `repeating-linear-gradient(to right, ${s.color} 0, ${s.color} 4px, transparent 4px, transparent 7px)` }
                : { backgroundColor: s.color }
            }
          />
          {s.label}
        </div>
      ))}
    </div>
  );
}

/** Barras lado a lado: entradas x saídas dos últimos 12 meses. */
export function FlowChart({ data }: { data: { label: string; entradas: number; saidas: number }[] }) {
  return (
    <div>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }} barGap={2}>
          <CartesianGrid vertical={false} stroke={GRID} />
          <XAxis dataKey="label" tickLine={false} axisLine={{ stroke: AXIS }} tick={TICK} interval="preserveStartEnd" />
          <YAxis tickLine={false} axisLine={false} width={64} tick={TICK} tickFormatter={(v) => formatCompactBRL(Number(v))} />
          <Tooltip
            cursor={{ fill: "#f1f5f9" }}
            content={({ active, payload, label }) =>
              active && payload ? (
                <TooltipBox
                  label={String(label)}
                  rows={payload.map((p) => ({ name: String(p.name), color: String(p.color), value: Number(p.value ?? 0) }))}
                />
              ) : null
            }
          />
          <Bar dataKey="entradas" name="Entradas" fill={PF_COLORS.entrada} radius={[3, 3, 0, 0]} maxBarSize={18} />
          <Bar dataKey="saidas" name="Saídas" fill={PF_COLORS.saida} radius={[3, 3, 0, 0]} maxBarSize={18} />
        </BarChart>
      </ResponsiveContainer>
      <Legend
        items={[
          { label: "Entradas", color: PF_COLORS.entrada },
          { label: "Saídas", color: PF_COLORS.saida },
        ]}
      />
    </div>
  );
}

/** Rosca dos gastos do mês por categoria; categorias pequenas viram "Demais". */
export function CategoryDonut({ data }: { data: { category: string; value: number }[] }) {
  const top = data.slice(0, 8);
  const rest = data.slice(8).reduce((s, d) => s + d.value, 0);
  const slices = rest > 0 ? [...top, { category: "Demais", value: rest }] : top;
  const total = slices.reduce((s, d) => s + d.value, 0);
  if (total <= 0) return <p className="py-10 text-center text-sm text-slate-400">Nenhum gasto neste mês.</p>;
  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row">
      <div className="relative h-44 w-44 shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={slices} dataKey="value" nameKey="category" innerRadius="62%" outerRadius="100%" paddingAngle={1} stroke="none">
              {slices.map((s, i) => (
                <Cell key={s.category} fill={CATEGORY_COLORS[i % CATEGORY_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              content={({ active, payload }) =>
                active && payload?.[0] ? (
                  <TooltipBox
                    rows={[{ name: String(payload[0].name), color: String(payload[0].payload?.fill ?? "#999"), value: Number(payload[0].value ?? 0) }]}
                  />
                ) : null
              }
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-[11px] text-slate-500">Gastos</span>
          <span className="text-sm font-bold text-slate-900">{formatCompactBRL(total)}</span>
        </div>
      </div>
      <ul className="w-full min-w-0 space-y-1.5 text-sm">
        {slices.map((s, i) => (
          <li key={s.category} className="flex items-center justify-between gap-2">
            <span className="flex min-w-0 items-center gap-2">
              <span className="inline-block h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: CATEGORY_COLORS[i % CATEGORY_COLORS.length] }} />
              <span className="truncate text-slate-700">{s.category}</span>
            </span>
            <span className="shrink-0 text-slate-900">
              {formatCurrencyBRL(s.value)} <span className="text-xs text-slate-500">{Math.round((s.value / total) * 100)}%</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Linha ou área no tempo (dívida, investido, patrimônio). Valor vazio não desenha ponto. */
export function TrendChart({ data, series, height = 200 }: { data: Point[]; series: TrendSeries[]; height?: number }) {
  if (data.length === 0) return <p className="py-10 text-center text-sm text-slate-400">Ainda sem histórico. O gráfico se forma mês a mês.</p>;
  return (
    <div>
      <ResponsiveContainer width="100%" height={height}>
        <ComposedChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid vertical={false} stroke={GRID} />
          <XAxis dataKey="label" tickLine={false} axisLine={{ stroke: AXIS }} tick={TICK} interval="preserveStartEnd" />
          <YAxis tickLine={false} axisLine={false} width={64} tick={TICK} tickFormatter={(v) => formatCompactBRL(Number(v))} />
          <Tooltip
            cursor={{ stroke: AXIS, strokeWidth: 1 }}
            content={({ active, payload, label }) =>
              active && payload ? (
                <TooltipBox
                  label={String(label)}
                  rows={payload
                    .filter((p) => p.value !== null && p.value !== undefined)
                    .map((p) => ({ name: String(p.name), color: String(p.stroke ?? p.color), value: Number(p.value) }))}
                />
              ) : null
            }
          />
          {series.map((s) =>
            s.area ? (
              <Area
                key={s.key}
                type="monotone"
                dataKey={s.key}
                name={s.label}
                stroke={s.color}
                fill={s.color}
                fillOpacity={0.12}
                strokeWidth={2}
                connectNulls
              />
            ) : (
              <Line
                key={s.key}
                type="monotone"
                dataKey={s.key}
                name={s.label}
                stroke={s.color}
                strokeWidth={2}
                strokeDasharray={s.dashed ? "6 4" : undefined}
                dot={data.length <= 14 ? { r: 3, fill: s.color, strokeWidth: 0 } : false}
                connectNulls={false}
              />
            ),
          )}
        </ComposedChart>
      </ResponsiveContainer>
      {series.length > 1 && <Legend items={series} />}
    </div>
  );
}
