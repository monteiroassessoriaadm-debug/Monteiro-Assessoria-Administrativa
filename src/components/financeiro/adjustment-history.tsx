import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrencyBRL, formatInstantBR } from "@/lib/utils";

/** Data, valor anterior, valor novo e diferença de cada ajuste de saldo. */
export async function AdjustmentHistory({ accountId }: { accountId?: string }) {
  const adjustments = await prisma.balanceAdjustment.findMany({
    where: { accountId },
    include: { account: { select: { name: true } }, createdBy: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Histórico de ajustes</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {adjustments.length === 0 && <p className="text-sm text-slate-400">Nenhum ajuste feito ainda.</p>}
        {adjustments.map((a) => {
          const amount = Number(a.amount);
          const newBalance = Number(a.newBalance);
          return (
            <div key={a.id} className="rounded-lg border border-slate-100 p-3 text-sm">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                <p className="font-medium text-slate-900">{a.account.name}</p>
                <p className="text-xs text-slate-500">{formatInstantBR(a.createdAt)}</p>
              </div>
              <dl className="mt-1 grid grid-cols-3 gap-2 text-xs">
                <div>
                  <dt className="text-slate-500">Anterior</dt>
                  <dd className="whitespace-nowrap text-slate-800">{formatCurrencyBRL(newBalance - amount)}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">Novo</dt>
                  <dd className="whitespace-nowrap font-medium text-slate-900">{formatCurrencyBRL(newBalance)}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">Diferença</dt>
                  <dd className={`whitespace-nowrap font-medium ${amount >= 0 ? "text-green-700" : "text-red-600"}`}>
                    {amount >= 0 ? "+" : ""}
                    {formatCurrencyBRL(amount)}
                  </dd>
                </div>
              </dl>
              {(a.reason || a.createdBy) && (
                <p className="mt-1 text-xs text-slate-500">
                  {a.reason}
                  {a.reason && a.createdBy ? " · " : ""}
                  {a.createdBy?.name}
                </p>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
