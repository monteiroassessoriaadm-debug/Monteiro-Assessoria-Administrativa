import "server-only";
import { prisma } from "@/lib/prisma";

export type AccountBalance = {
  accountId: string;
  name: string;
  type: string | null;
  active: boolean;
  openingBalance: number;
  received: number;
  paid: number;
  current: number;
};

/**
 * Saldo atual por conta = saldo inicial + recebido (contas a receber com
 * status RECEBIDO ligadas à conta) − pago (contas a pagar com status PAGO
 * ligadas à conta). Não inclui comissões, que hoje não têm conta vinculada.
 */
export async function getAccountBalances(): Promise<AccountBalance[]> {
  const accounts = await prisma.financialAccount.findMany({
    orderBy: { createdAt: "asc" },
  });

  const [receivedByAccount, paidByAccount] = await Promise.all([
    prisma.receivable.groupBy({
      by: ["accountId"],
      where: { status: "RECEBIDO", accountId: { not: null } },
      _sum: { amount: true },
    }),
    prisma.payable.groupBy({
      by: ["accountId"],
      where: { status: "PAGO", accountId: { not: null } },
      _sum: { amount: true },
    }),
  ]);

  const receivedMap = new Map(
    receivedByAccount.map((r) => [r.accountId as string, Number(r._sum.amount ?? 0)]),
  );
  const paidMap = new Map(
    paidByAccount.map((p) => [p.accountId as string, Number(p._sum.amount ?? 0)]),
  );

  return accounts.map((a) => {
    const openingBalance = Number(a.openingBalance ?? 0);
    const received = receivedMap.get(a.id) ?? 0;
    const paid = paidMap.get(a.id) ?? 0;
    return {
      accountId: a.id,
      name: a.name,
      type: a.type,
      active: a.active,
      openingBalance,
      received,
      paid,
      current: openingBalance + received - paid,
    };
  });
}

export async function getTotalCurrentBalance(): Promise<number> {
  const balances = await getAccountBalances();
  return balances.filter((b) => b.active).reduce((sum, b) => sum + b.current, 0);
}
