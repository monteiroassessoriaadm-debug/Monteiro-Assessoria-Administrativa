import Link from "next/link";
import { Wallet, ArrowDownCircle, ArrowUpCircle, PiggyBank } from "lucide-react";
import { requirePfOwner } from "@/lib/pf/access";
import { getDashboard } from "@/lib/pf/service";
import { monthLabel, monthLabelFull } from "@/lib/pf/calc";
import { StatCard } from "@/components/dashboard/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CategoryDonut, FlowChart, PF_COLORS, TrendChart } from "@/components/pf/pf-charts";
import { Empty, Indicator, Money, ProgressBar, dayBR, pctText } from "@/components/pf/pf-ui";
import { formatCurrencyBRL } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function FinancasPessoaisPage() {
  await requirePfOwner();
  const d = await getDashboard();
  const ind = d.indicadores;
  const liberdade = d.liberdadeDividas;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Saldo total" value={formatCurrencyBRL(d.cards.saldoTotal)} icon={Wallet} tone="blue" href="/financas-pessoais/contas" />
        <StatCard label={`Entradas de ${monthLabel(d.month)}`} value={formatCurrencyBRL(d.cards.entradasMes)} icon={ArrowDownCircle} tone="green" href="/financas-pessoais/lancamentos?tipo=ENTRADA" />
        <StatCard label={`Saídas de ${monthLabel(d.month)}`} value={formatCurrencyBRL(d.cards.saidasMes)} icon={ArrowUpCircle} tone="red" href="/financas-pessoais/lancamentos?tipo=SAIDA" />
        <StatCard
          label="Sobra do mês"
          value={formatCurrencyBRL(d.cards.sobraMes)}
          icon={PiggyBank}
          tone={d.cards.sobraMes >= 0 ? "green" : "red"}
          href="/financas-pessoais/fechamento"
        />
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Indicator
          label="Renda comprometida com dívidas"
          value={pctText(ind.rendaComprometida.percent)}
          tone={ind.rendaComprometida.tone}
          hint={`${formatCurrencyBRL(ind.parcelasDividas)} de parcelas`}
        />
        <Indicator label="Taxa de poupança do mês" value={pctText(ind.taxaPoupanca.percent)} tone={ind.taxaPoupanca.tone} hint="ideal: 20% ou mais" />
        <Indicator
          label="Meses de reserva"
          value={ind.mesesReserva.meses === null ? "—" : `${ind.mesesReserva.meses.toString().replace(".", ",")} meses`}
          tone={ind.mesesReserva.tone}
          hint="ideal: 6 meses"
        />
        <Indicator label="Patrimônio líquido" value={formatCurrencyBRL(ind.patrimonioLiquido.valor)} tone={ind.patrimonioLiquido.tone} hint="contas + invest. − dívidas" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Entradas x saídas (12 meses)</CardTitle>
          </CardHeader>
          <CardContent>
            <FlowChart data={d.fluxo.map((f) => ({ label: monthLabel(f.month), entradas: f.entradas, saidas: f.saidas }))} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Gastos de {monthLabelFull(d.month)} por categoria</CardTitle>
          </CardHeader>
          <CardContent>
            <CategoryDonut data={d.gastosPorCategoria} />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Orçamento x gasto</CardTitle>
            <Link href="/financas-pessoais/orcamento" className="text-sm text-blue-600">
              Ajustar →
            </Link>
          </CardHeader>
          <CardContent className="space-y-3">
            {d.orcamento.length === 0 && <Empty>Defina limites por categoria em Orçamento.</Empty>}
            {d.orcamento.map((b) => (
              <div key={b.categoryId}>
                <div className="mb-1 flex items-center justify-between gap-2 text-sm">
                  <span className="text-slate-700">{b.category}</span>
                  <span className="text-slate-500">
                    <Money value={b.spent} className="font-medium text-slate-900" /> de <Money value={b.limit} />
                  </span>
                </div>
                <ProgressBar value={b.percent ?? 0} tone={b.tone} />
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Próximas contas (7 dias)</CardTitle>
            <Link href="/financas-pessoais/contas-fixas" className="text-sm text-blue-600">
              Ver todas →
            </Link>
          </CardHeader>
          <CardContent className="space-y-2">
            {d.proximasContas.length === 0 && <Empty>Nenhuma conta vencendo nos próximos 7 dias.</Empty>}
            {d.proximasContas.map((c) => (
              <div key={c.id} className="flex items-center justify-between gap-3 rounded-lg border border-slate-100 px-3 py-2 text-sm">
                <div className="min-w-0">
                  <p className="truncate font-medium text-slate-900">{c.name}</p>
                  <p className="text-xs text-slate-500">vence {dayBR(c.dueDate)}</p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <Money value={c.amount} className="font-medium text-slate-900" />
                  {c.alert && <Badge tone={c.daysToDue < 0 ? "red" : "yellow"}>{c.alert}</Badge>}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Dívida total mês a mês</CardTitle>
          <span className="text-right text-sm text-slate-600">
            {ind.patrimonioLiquido.dividas <= 0
              ? "Sem dívidas abertas"
              : liberdade.quita && liberdade.mes
                ? <>Livre das dívidas em <strong className="text-slate-900">{monthLabelFull(liberdade.mes)}</strong></>
                : "Com as parcelas atuais a dívida não acaba"}
          </span>
        </CardHeader>
        <CardContent>
          <TrendChart
            data={d.dividaSerie.map((p) => ({ label: monthLabel(p.month), real: p.real, previsto: p.previsto }))}
            series={[
              { key: "real", label: "Dívida registrada", color: PF_COLORS.divida },
              { key: "previsto", label: "Previsão pagando as parcelas", color: PF_COLORS.divida, dashed: true },
            ]}
          />
          <p className="mt-2 text-xs text-slate-500">
            A previsão considera só as parcelas atuais. Use o simulador em <Link className="text-blue-600" href="/financas-pessoais/dividas">Dívidas</Link> para ver com valor extra.
          </p>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Dinheiro investido no tempo</CardTitle>
          </CardHeader>
          <CardContent>
            <TrendChart
              data={d.investidoSerie.map((p) => ({ label: monthLabel(p.month), aplicado: p.aplicado, valorAtual: p.valorAtual }))}
              series={[
                { key: "aplicado", label: "Total aplicado", color: PF_COLORS.investido, area: true },
                { key: "valorAtual", label: "Valor atual", color: PF_COLORS.entrada },
              ]}
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Patrimônio líquido no tempo</CardTitle>
          </CardHeader>
          <CardContent>
            <TrendChart
              data={d.patrimonioSerie.map((p) => ({ label: monthLabel(p.month), valor: p.valor }))}
              series={[{ key: "valor", label: "Patrimônio líquido", color: PF_COLORS.patrimonio }]}
            />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Metas</CardTitle>
          <Link href="/financas-pessoais/metas" className="text-sm text-blue-600">
            Ver metas →
          </Link>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          {d.metas.map((g) => (
            <div key={g.id}>
              <div className="mb-1 flex items-center justify-between gap-2 text-sm">
                <span className="font-medium text-slate-800">{g.name}</span>
                <span className="text-slate-500">{g.target > 0 ? `${pctText(g.percent)}` : "defina o alvo"}</span>
              </div>
              <ProgressBar value={g.percent} tone={g.percent >= 100 ? "green" : "slate"} className="[&>div]:bg-blue-600" />
              <p className="mt-1 text-xs text-slate-500">
                <Money value={g.current} /> de <Money value={g.target} />
                {g.suggestedMonthly ? ` · guardar ${formatCurrencyBRL(g.suggestedMonthly)}/mês` : ""}
              </p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
