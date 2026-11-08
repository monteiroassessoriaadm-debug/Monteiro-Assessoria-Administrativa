import Link from "next/link";
import { AlertTriangle, Goal } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TableCard, TableCardList } from "@/components/ui/table-card";
import { formatCurrencyBRL, formatDateBR } from "@/lib/utils";
import { keyToUtc } from "@/lib/br-time";
import type { GoalsProgress } from "@/lib/goals";
import { GoalBar, LastWeeksChart } from "@/components/dashboard/goal-charts";

const percent = (v: number) => `${v.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;
const day = (key: string) => formatDateBR(keyToUtc(key));

function statusTone(pct: number) {
  return pct >= 100 ? ("green" as const) : ("slate" as const);
}

export function GoalsSection({ progress, showLink = true }: { progress: GoalsProgress; showLink?: boolean }) {
  const { week, month, mei, weekPeriod, monthPeriod, last8Weeks, config } = progress;
  const rows = [
    {
      label: "Semana atual",
      period: `${day(weekPeriod.start)} a ${day(weekPeriod.end)}`,
      original: week.metaOriginal !== week.metaAjustada ? week.metaOriginal : null,
      ...week,
    },
    {
      label: "Mês atual",
      period: `${day(monthPeriod.start)} a ${day(monthPeriod.end)}`,
      original: null,
      ...month,
    },
  ];

  return (
    <section className="space-y-4" aria-labelledby="metas-titulo">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="metas-titulo" className="flex items-center gap-2 text-base font-semibold text-slate-900">
          <Goal className="h-4 w-4" /> Metas
        </h2>
        {showLink && (
          <Link href="/metas" className="inline-flex min-h-11 items-center text-sm font-medium text-blue-700 hover:underline md:min-h-0">
            Detalhes e ajustes →
          </Link>
        )}
      </div>

      {config.fallbackFrom && (
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
          Salário mínimo de {config.year} ainda não cadastrado; usando o de {config.fallbackFrom}.{" "}
          <Link href="/metas" className="font-medium underline">
            Atualizar
          </Link>
        </p>
      )}

      {/* Em tablet, a coluna lateral aperta a tabela: ela rola só dentro do próprio quadro. */}
      <Card className="table-scroll hidden overflow-x-auto md:block">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Período</th>
              <th className="px-4 py-3 text-right">Meta</th>
              <th className="px-4 py-3 text-right">Recebido</th>
              <th className="px-4 py-3 text-right">A receber</th>
              <th className="px-4 py-3 text-right">Falta</th>
              <th className="px-4 py-3 text-right">Atingido</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((r) => (
              <tr key={r.label}>
                <td className="px-4 py-3">
                  <p className="font-medium text-slate-900">{r.label}</p>
                  <p className="text-xs text-slate-500">{r.period}</p>
                </td>
                <td className="px-4 py-3 text-right whitespace-nowrap text-slate-900">
                  {formatCurrencyBRL(r.meta)}
                  {r.original !== null && (
                    <p className="text-xs text-slate-500">original {formatCurrencyBRL(r.original)}</p>
                  )}
                </td>
                <td className="px-4 py-3 text-right whitespace-nowrap font-medium text-slate-900">{formatCurrencyBRL(r.recebido)}</td>
                <td className="px-4 py-3 text-right whitespace-nowrap text-slate-600">{formatCurrencyBRL(r.aReceber)}</td>
                <td className="px-4 py-3 text-right whitespace-nowrap text-slate-600">{formatCurrencyBRL(r.falta)}</td>
                <td className="px-4 py-3 text-right">
                  <Badge tone={statusTone(r.percentual)}>{percent(r.percentual)}</Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <TableCardList>
        {rows.map((r) => (
          <TableCard
            key={r.label}
            title={r.label}
            subtitle={r.period}
            fields={[
              {
                label: r.original !== null ? "Meta ajustada" : "Meta",
                value: formatCurrencyBRL(r.meta),
              },
              ...(r.original !== null ? [{ label: "Meta original", value: formatCurrencyBRL(r.original) }] : []),
              { label: "Recebido", value: formatCurrencyBRL(r.recebido) },
              { label: "A receber", value: formatCurrencyBRL(r.aReceber) },
              { label: "Falta", value: formatCurrencyBRL(r.falta) },
              { label: "Atingido", value: <Badge tone={statusTone(r.percentual)}>{percent(r.percentual)}</Badge> },
            ]}
          />
        ))}
      </TableCardList>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardContent className="space-y-5 pt-5">
            <GoalBar title="Semana atual" meta={week.meta} recebido={week.recebido} aReceber={week.aReceber} />
            <GoalBar title="Mês atual" meta={month.meta} recebido={month.recebido} aReceber={month.aReceber} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Últimas 8 semanas: meta x recebido</CardTitle>
          </CardHeader>
          <CardContent>
            <LastWeeksChart data={last8Weeks} />
          </CardContent>
        </Card>
      </div>

      <Card className={mei.alerta ? "border-amber-300 bg-amber-50" : undefined}>
        <CardContent className="space-y-2 pt-5">
          <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
            <p className="flex items-center gap-1.5 text-sm font-medium text-slate-900">
              {mei.alerta && <AlertTriangle className="h-4 w-4 text-amber-700" />}
              Teto do MEI em {config.year}
              {mei.alerta && <span className="text-amber-800">: atenção, {mei.ultrapassou ? "limite ultrapassado" : "acima de 80%"}</span>}
            </p>
            <p className="text-xs text-slate-600">
              {formatCurrencyBRL(mei.recebidoNoAno)} de {formatCurrencyBRL(mei.limite)} ({percent(mei.percentual)})
            </p>
          </div>
          <div className="h-2 w-full overflow-hidden rounded bg-slate-200">
            <div
              className={mei.alerta ? "h-full bg-amber-600" : "h-full bg-slate-500"}
              style={{ width: `${Math.min(100, Math.max(0, mei.percentual))}%` }}
            />
          </div>
          <p className="text-xs text-slate-500">Ainda cabem {formatCurrencyBRL(mei.restante)} neste ano.</p>
        </CardContent>
      </Card>
    </section>
  );
}
