import { requireRole } from "@/lib/permissions";
import { Role } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatCurrencyBRL } from "@/lib/utils";
import { commissionCategoryLabels } from "@/lib/lead-labels";

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function endOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
}

function StatRow({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex items-center justify-between border-b border-slate-100 py-2 text-sm last:border-0">
      <span className="text-slate-600">{label}</span>
      <span className="font-semibold text-slate-900">{value}</span>
    </div>
  );
}

export default async function RelatoriosPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  await requireRole(Role.ADMIN, Role.GESTOR);
  const { from, to } = await searchParams;

  const now = new Date();
  const rangeFrom = from ? new Date(from) : startOfMonth(now);
  const rangeTo = to ? new Date(`${to}T23:59:59`) : endOfMonth(now);
  const fromInput = rangeFrom.toISOString().slice(0, 10);
  const toInput = rangeTo.toISOString().slice(0, 10);

  const [
    leadsNovos,
    leadsConvertidos,
    leadsPerdidos,
    orcamentosAprovados,
    propostasAprovadas,
    clientesNovos,
    servicosConcluidos,
    conteudosPublicados,
    recebidoNoPeriodo,
    pagoNoPeriodo,
    comissoesPorCategoria,
  ] = await Promise.all([
    prisma.lead.count({ where: { createdAt: { gte: rangeFrom, lte: rangeTo } } }),
    prisma.lead.count({
      where: { stage: "CONTRATADO", updatedAt: { gte: rangeFrom, lte: rangeTo } },
    }),
    prisma.lead.count({
      where: { stage: "PERDIDO", updatedAt: { gte: rangeFrom, lte: rangeTo } },
    }),
    prisma.quote.aggregate({
      where: { status: "APROVADO", respondedAt: { gte: rangeFrom, lte: rangeTo } },
      _count: true,
    }),
    prisma.proposal.count({
      where: { status: "APROVADA", updatedAt: { gte: rangeFrom, lte: rangeTo } },
    }),
    prisma.client.count({ where: { createdAt: { gte: rangeFrom, lte: rangeTo } } }),
    prisma.serviceInstance.count({
      where: { status: "CONCLUIDO", deliveredAt: { gte: rangeFrom, lte: rangeTo } },
    }),
    prisma.mediaContent.count({
      where: { status: "PUBLICADO", publishedAt: { gte: rangeFrom, lte: rangeTo } },
    }),
    prisma.receivable.aggregate({
      where: { status: "RECEBIDO", receivedAt: { gte: rangeFrom, lte: rangeTo } },
      _sum: { amount: true },
    }),
    prisma.payable.aggregate({
      where: { status: "PAGO", paidAt: { gte: rangeFrom, lte: rangeTo } },
      _sum: { amount: true },
    }),
    prisma.commission.groupBy({
      by: ["category"],
      where: { status: "PAGO", paidAt: { gte: rangeFrom, lte: rangeTo } },
      _sum: { amount: true },
    }),
  ]);

  const totalLeadsFechados = leadsConvertidos + leadsPerdidos;
  const taxaConversao =
    totalLeadsFechados > 0 ? Math.round((leadsConvertidos / totalLeadsFechados) * 100) : null;

  const comissoesByCategory = Object.fromEntries(
    comissoesPorCategoria.map((c) => [c.category, Number(c._sum.amount ?? 0)]),
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Relatórios</h1>
        <p className="text-sm text-slate-500">
          Resultados consolidados no período — comercial, financeiro, operacional e mídia.
        </p>
      </div>

      <form className="flex flex-wrap items-end gap-3">
        <div>
          <Label>De</Label>
          <Input type="date" name="from" defaultValue={fromInput} />
        </div>
        <div>
          <Label>Até</Label>
          <Input type="date" name="to" defaultValue={toInput} />
        </div>
        <Button type="submit" variant="outline">
          Filtrar
        </Button>
      </form>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Comercial</CardTitle>
          </CardHeader>
          <CardContent>
            <StatRow label="Novos leads no período" value={leadsNovos} />
            <StatRow label="Leads convertidos (contratados)" value={leadsConvertidos} />
            <StatRow label="Leads perdidos" value={leadsPerdidos} />
            <StatRow
              label="Taxa de conversão"
              value={taxaConversao === null ? "-" : `${taxaConversao}%`}
            />
            <StatRow label="Orçamentos aprovados" value={orcamentosAprovados._count} />
            <StatRow label="Propostas aprovadas" value={propostasAprovadas} />
            <StatRow label="Novos clientes cadastrados" value={clientesNovos} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Financeiro</CardTitle>
          </CardHeader>
          <CardContent>
            <StatRow
              label="Recebido no período"
              value={formatCurrencyBRL(recebidoNoPeriodo._sum.amount?.toString() ?? "0")}
            />
            <StatRow
              label="Pago no período"
              value={formatCurrencyBRL(pagoNoPeriodo._sum.amount?.toString() ?? "0")}
            />
            {Object.entries(commissionCategoryLabels).map(([value, label]) => (
              <StatRow
                key={value}
                label={`${label} — pago no período`}
                value={formatCurrencyBRL(comissoesByCategory[value] ?? 0)}
              />
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Operacional</CardTitle>
          </CardHeader>
          <CardContent>
            <StatRow label="Serviços concluídos no período" value={servicosConcluidos} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Mídia</CardTitle>
          </CardHeader>
          <CardContent>
            <StatRow label="Conteúdo publicado no período" value={conteudosPublicados} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
