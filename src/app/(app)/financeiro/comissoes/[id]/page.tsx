import Link from "next/link";
import { notFound } from "next/navigation";
import { Role } from "@/generated/prisma/enums";
import { requireRole } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { displayClientName } from "@/lib/client-display";
import { formatCurrencyBRL, formatDateBR } from "@/lib/utils";
import { commissionCategoryLabels, commissionStatusLabels, commissionStatusTone } from "@/lib/lead-labels";
import { CommissionStatusActions } from "../status-actions";

export default async function ComissaoDetalhePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireRole(Role.ADMIN, Role.GESTOR);
  const { id } = await params;
  const commission = await prisma.commission.findUnique({
    where: { id },
    include: { user: true, client: true, account: true },
  });
  if (!commission) notFound();

  const rows: [string, React.ReactNode][] = [
    ["Valor", formatCurrencyBRL(commission.amount.toString())],
    ["Categoria", commissionCategoryLabels[commission.category]],
    [
      "Status",
      <Badge key="status" tone={commissionStatusTone[commission.status]}>
        {commissionStatusLabels[commission.status]}
      </Badge>,
    ],
    ["Data", formatDateBR(commission.date)],
    ["Pago em", formatDateBR(commission.paidAt)],
    ["Conta", commission.account?.name ?? "-"],
    ["Cliente", commission.client ? displayClientName(commission.client) : "-"],
  ];

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">{commission.user.name}</h1>
        <p className="text-sm text-slate-500">Lançamento de comissão ou pagamento</p>
      </div>
      <Card>
        <CardContent className="space-y-3 pt-5 text-sm">
          <dl className="space-y-2">
            {rows.map(([label, value]) => (
              <div key={label} className="flex items-start justify-between gap-3">
                <dt className="text-slate-500">{label}</dt>
                <dd className="min-w-0 text-right font-medium text-slate-900">{value}</dd>
              </div>
            ))}
          </dl>
          {commission.notes && <p className="whitespace-pre-wrap border-t border-slate-100 pt-3 text-slate-700">{commission.notes}</p>}
          <CommissionStatusActions commissionId={commission.id} status={commission.status} />
          {commission.payableId && (
            <Link href={`/financeiro/pagar/${commission.payableId}/editar`} className="inline-flex min-h-11 items-center text-blue-700 hover:underline md:min-h-0">
              Ver a saída no caixa →
            </Link>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
