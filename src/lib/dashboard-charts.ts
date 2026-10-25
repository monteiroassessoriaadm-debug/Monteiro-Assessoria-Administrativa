import { prisma } from "@/lib/prisma";
import { lastNMonths, sumByMonth, countByMonth } from "@/lib/monthly-series";

/** Dados mensais (últimos 12 meses) usados nos gráficos do dashboard e no relatório em PDF. */
export async function getMonthlyChartSeries(canSeeFinanceiro: boolean) {
  const months = lastNMonths(12);
  const twelveMonthsAgoStart = months[0].start;

  const [clientesCriadosSerie, leadsConvertidosSerie] = await Promise.all([
    prisma.client.findMany({
      where: { createdAt: { gte: twelveMonthsAgoStart } },
      select: { createdAt: true },
    }),
    prisma.lead.findMany({
      where: { stage: "CONTRATADO", updatedAt: { gte: twelveMonthsAgoStart } },
      select: { updatedAt: true },
    }),
  ]);

  const clientesSerie = countByMonth(clientesCriadosSerie, months, (c) => c.createdAt);
  const leadsSerie = countByMonth(leadsConvertidosSerie, months, (l) => l.updatedAt);

  let receitaSerie: number[] = [];
  let despesaSerie: number[] = [];
  if (canSeeFinanceiro) {
    const [receivablesRecebidosSerie, payablesPagosSerie] = await Promise.all([
      prisma.receivable.findMany({
        where: { status: "RECEBIDO", receivedAt: { gte: twelveMonthsAgoStart } },
        select: { amount: true, receivedAt: true },
      }),
      prisma.payable.findMany({
        where: { status: "PAGO", paidAt: { gte: twelveMonthsAgoStart } },
        select: { amount: true, paidAt: true },
      }),
    ]);
    receitaSerie = sumByMonth(
      receivablesRecebidosSerie,
      months,
      (r) => r.receivedAt as Date,
      (r) => Number(r.amount),
    );
    despesaSerie = sumByMonth(
      payablesPagosSerie,
      months,
      (p) => p.paidAt as Date,
      (p) => Number(p.amount),
    );
  }

  return {
    monthLabels: months.map((m) => m.label),
    clientesSerie,
    leadsSerie,
    receitaSerie,
    despesaSerie,
  };
}
