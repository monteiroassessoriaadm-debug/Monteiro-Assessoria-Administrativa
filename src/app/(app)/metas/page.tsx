import { Role } from "@/generated/prisma/enums";
import { requireRole } from "@/lib/permissions";
import { getGoalsProgress } from "@/lib/goals";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TableCard, TableCardEmpty, TableCardList } from "@/components/ui/table-card";
import { GoalsSection } from "@/components/dashboard/goals-section";
import { formatCurrencyBRL, formatDateBR } from "@/lib/utils";
import { keyToUtc } from "@/lib/br-time";
import { GoalOverrideForm, YearConfigForm } from "./goal-forms";

const day = (key: string) => formatDateBR(keyToUtc(key)).slice(0, 5);

export default async function MetasPage() {
  await requireRole(Role.ADMIN, Role.GESTOR);
  const progress = await getGoalsProgress();
  const { monthWeeks, byLine, config, today } = progress;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Metas</h1>
        <p className="text-sm text-slate-500">
          A meta conta dinheiro recebido no caixa, de qualquer linha de negócio. Venda ainda não paga aparece em &quot;a receber&quot;.
        </p>
      </div>

      <GoalsSection progress={progress} showLink={false} />

      <Card>
        <CardHeader>
          <CardTitle>Semanas deste mês</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-slate-500">
            Semana abaixo da meta passa a diferença para as restantes. Semana boa não reduz as próximas.
          </p>
          <div className="hidden overflow-hidden md:block">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">Semana</th>
                  <th className="px-4 py-3 text-right">Meta original</th>
                  <th className="px-4 py-3 text-right">Meta ajustada</th>
                  <th className="px-4 py-3 text-right">Recebido</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {monthWeeks.map((w) => (
                  <tr key={w.start}>
                    <td className="px-4 py-3 text-slate-900">
                      {day(w.start)} a {day(w.end)}
                      {w.start <= today && today <= w.end && <span className="ml-2 text-xs text-blue-700">atual</span>}
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap text-slate-600">{formatCurrencyBRL(w.original)}</td>
                    <td className="px-4 py-3 text-right whitespace-nowrap font-medium text-slate-900">{formatCurrencyBRL(w.adjusted)}</td>
                    <td className="px-4 py-3 text-right whitespace-nowrap text-slate-600">{formatCurrencyBRL(w.received)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <TableCardList>
            {monthWeeks.map((w) => (
              <TableCard
                key={w.start}
                title={`${day(w.start)} a ${day(w.end)}${w.start <= today && today <= w.end ? " (atual)" : ""}`}
                fields={[
                  { label: "Meta original", value: formatCurrencyBRL(w.original) },
                  { label: "Meta ajustada", value: formatCurrencyBRL(w.adjusted) },
                  { label: "Recebido", value: formatCurrencyBRL(w.received) },
                ]}
              />
            ))}
          </TableCardList>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recebido por linha de negócio</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-slate-500">Só para consulta: isto nunca muda a meta, que é uma só sobre o total.</p>
          <div className="hidden overflow-hidden md:block">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">Linha</th>
                  <th className="px-4 py-3 text-right">Semana</th>
                  <th className="px-4 py-3 text-right">Mês</th>
                  <th className="px-4 py-3 text-right">Ano</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {byLine.map((l) => (
                  <tr key={l.linha}>
                    <td className="px-4 py-3 text-slate-900">{l.linha}</td>
                    <td className="px-4 py-3 text-right whitespace-nowrap text-slate-600">{formatCurrencyBRL(l.semana)}</td>
                    <td className="px-4 py-3 text-right whitespace-nowrap text-slate-600">{formatCurrencyBRL(l.mes)}</td>
                    <td className="px-4 py-3 text-right whitespace-nowrap font-medium text-slate-900">{formatCurrencyBRL(l.ano)}</td>
                  </tr>
                ))}
                {byLine.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-slate-400">Nenhum recebimento neste ano.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <TableCardList>
            {byLine.map((l) => (
              <TableCard
                key={l.linha}
                title={l.linha}
                fields={[
                  { label: "Semana", value: formatCurrencyBRL(l.semana) },
                  { label: "Mês", value: formatCurrencyBRL(l.mes) },
                  { label: "Ano", value: formatCurrencyBRL(l.ano) },
                ]}
              />
            ))}
            {byLine.length === 0 && <TableCardEmpty>Nenhum recebimento neste ano.</TableCardEmpty>}
          </TableCardList>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Salário mínimo e teto do MEI</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-slate-500">Em janeiro, troque o ano e informe os novos valores.</p>
            <YearConfigForm year={config.year} minimumWage={config.minimumWage} meiAnnualLimit={config.meiAnnualLimit} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Definir meta à mão</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-slate-500">Só se quiser fugir do padrão: mês = salário mínimo; semana = parte proporcional.</p>
            <GoalOverrideForm today={today} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
