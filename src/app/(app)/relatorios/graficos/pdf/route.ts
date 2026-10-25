import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/permissions";
import { getMonthlyChartSeries } from "@/lib/dashboard-charts";
import { formatCompactBRL, formatCompactNumber } from "@/lib/utils";
import { GraficosPdf } from "@/lib/pdf/graficos-pdf";

export async function GET() {
  const session = await requireSession();
  const canSeeFinanceiro = session.role === "ADMIN" || session.role === "GESTOR";

  const [company, series] = await Promise.all([
    prisma.companySettings.findFirst(),
    getMonthlyChartSeries(canSeeFinanceiro),
  ]);

  const buffer = await renderToBuffer(
    GraficosPdf({
      company: {
        name: company?.name ?? "Monteiro Assessoria Administrativa",
        slogan: company?.slogan ?? null,
        logoData: company?.logoData ?? null,
      },
      generatedAt: new Date(),
      monthLabels: series.monthLabels,
      clientesSerie: series.clientesSerie,
      leadsSerie: series.leadsSerie,
      financeiro: canSeeFinanceiro
        ? { receitaSerie: series.receitaSerie, despesaSerie: series.despesaSerie }
        : null,
      numberFormatter: formatCompactNumber,
      currencyFormatter: formatCompactBRL,
    }),
  );

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="relatorio-evolucao-${new Date().toISOString().slice(0, 10)}.pdf"`,
    },
  });
}
