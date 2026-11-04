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
 * Saldo atual por conta = saldo inicial + recebido − pago, considerando só
 * movimentações (contas a receber RECEBIDO / contas a pagar PAGO) com data a
 * partir da data do saldo inicial da conta — lançamentos anteriores a essa
 * data já estão representados no saldo inicial e não devem ser somados de
 * novo. Contas sem data de saldo inicial consideram todo o histórico. Não
 * inclui comissões, que hoje não têm conta vinculada.
 */
export async function getAccountBalances(): Promise<AccountBalance[]> {
  const accounts = await prisma.financialAccount.findMany({
    orderBy: { createdAt: "asc" },
  });

  const balances = await Promise.all(
    accounts.map(async (a) => {
      const sinceFilter = a.openingBalanceAt ? { gte: a.openingBalanceAt } : undefined;

      const [receivedSum, paidSum] = await Promise.all([
        prisma.receivable.aggregate({
          where: { status: "RECEBIDO", accountId: a.id, receivedAt: sinceFilter },
          _sum: { amount: true },
        }),
        prisma.payable.aggregate({
          where: { status: "PAGO", accountId: a.id, paidAt: sinceFilter },
          _sum: { amount: true },
        }),
      ]);

      const openingBalance = Number(a.openingBalance ?? 0);
      const received = Number(receivedSum._sum.amount ?? 0);
      const paid = Number(paidSum._sum.amount ?? 0);

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
    }),
  );

  return balances;
}

export async function getTotalCurrentBalance(): Promise<number> {
  const balances = await getAccountBalances();
  return balances.filter((b) => b.active).reduce((sum, b) => sum + b.current, 0);
}
