import "server-only";
import { prisma } from "@/lib/prisma";
import { addDaysKey, brDayKey } from "@/lib/br-time";

export type AccountBalance = {
  accountId: string;
  name: string;
  type: string | null;
  active: boolean;
  openingBalance: number;
  received: number;
  paid: number;
  commissions: number;
  adjustments: number;
  current: number;
};

/**
 * Saldo atual por conta = saldo inicial + recebido − pago − comissões + ajustes,
 * considerando só movimentações com data a partir da data do saldo inicial da
 * conta — lançamentos anteriores a essa data já estão representados no saldo
 * inicial e não devem ser somados de novo. Contas sem data de saldo inicial
 * consideram todo o histórico.
 *
 * Comissão paga pelo sistema já gera uma saída em contas a pagar (payableId), que
 * entra em "pago"; aqui só contam as pagas com conta e sem essa saída, senão o
 * desconto seria em dobro.
 */
export async function getAccountBalances(): Promise<AccountBalance[]> {
  const accounts = await prisma.financialAccount.findMany({
    orderBy: { createdAt: "asc" },
  });

  const balances = await Promise.all(
    accounts.map(async (a) => {
      const sinceFilter = a.openingBalanceAt ? { gte: a.openingBalanceAt } : undefined;

      const [receivedSum, paidSum, commissionSum, adjustmentSum] = await Promise.all([
        prisma.receivable.aggregate({
          where: { status: "RECEBIDO", accountId: a.id, receivedAt: sinceFilter },
          _sum: { amount: true },
        }),
        prisma.payable.aggregate({
          where: { status: "PAGO", accountId: a.id, paidAt: sinceFilter },
          _sum: { amount: true },
        }),
        prisma.commission.aggregate({
          where: { status: "PAGO", accountId: a.id, payableId: null, paidAt: sinceFilter },
          _sum: { amount: true },
        }),
        prisma.balanceAdjustment.aggregate({
          where: { accountId: a.id, createdAt: sinceFilter },
          _sum: { amount: true },
        }),
      ]);

      const openingBalance = Number(a.openingBalance ?? 0);
      const received = Number(receivedSum._sum.amount ?? 0);
      const paid = Number(paidSum._sum.amount ?? 0);
      const commissions = Number(commissionSum._sum.amount ?? 0);
      const adjustments = Number(adjustmentSum._sum.amount ?? 0);

      return {
        accountId: a.id,
        name: a.name,
        type: a.type,
        active: a.active,
        openingBalance,
        received,
        paid,
        commissions,
        adjustments,
        current: round2(openingBalance + received - paid - commissions + adjustments),
      };
    }),
  );

  return balances;
}

export async function getTotalCurrentBalance(): Promise<number> {
  const balances = await getAccountBalances();
  return balances.filter((b) => b.active).reduce((sum, b) => sum + b.current, 0);
}

function round2(v: number) {
  return Math.round(v * 100) / 100;
}

export type BalancePoint = { label: string; saldo: number; entradas: number; saidas: number };

/**
 * Saldo somado das contas ativas ao fim de cada dia (últimos 30) e de cada mês
 * (últimos 12), com as mesmas regras de getAccountBalances, além do total que
 * entrou e saiu em cada período. Ajuste muda o saldo, mas não entra em entradas
 * nem saídas: não é movimento de dinheiro.
 */
export async function getBalanceSeries(now: Date = new Date()) {
  const accounts = await prisma.financialAccount.findMany({ where: { active: true } });
  const ids = accounts.map((a) => a.id);
  const sinceById = new Map(accounts.map((a) => [a.id, a.openingBalanceAt]));
  const opening = accounts.reduce((sum, a) => sum + Number(a.openingBalance ?? 0), 0);

  const [received, paid, commissions, adjustments] = await Promise.all([
    prisma.receivable.findMany({
      where: { status: "RECEBIDO", accountId: { in: ids } },
      select: { accountId: true, amount: true, receivedAt: true },
    }),
    prisma.payable.findMany({
      where: { status: "PAGO", accountId: { in: ids } },
      select: { accountId: true, amount: true, paidAt: true },
    }),
    prisma.commission.findMany({
      where: { status: "PAGO", accountId: { in: ids }, payableId: null },
      select: { accountId: true, amount: true, paidAt: true },
    }),
    prisma.balanceAdjustment.findMany({
      where: { accountId: { in: ids } },
      select: { accountId: true, amount: true, createdAt: true },
    }),
  ]);

  type Event = { day: string; delta: number; kind: "in" | "out" | "adjust" };
  const events: Event[] = [];
  const push = (accountId: string | null, date: Date | null, delta: number, kind: Event["kind"]) => {
    if (!accountId || !date) return;
    const since = sinceById.get(accountId);
    if (since && date < since) return;
    events.push({ day: brDayKey(date), delta, kind });
  };
  for (const r of received) push(r.accountId, r.receivedAt, Number(r.amount), "in");
  for (const p of paid) push(p.accountId, p.paidAt, -Number(p.amount), "out");
  for (const c of commissions) push(c.accountId, c.paidAt, -Number(c.amount), "out");
  for (const a of adjustments) push(a.accountId, a.createdAt, Number(a.amount), "adjust");

  const totals = (from: string, to: string) => {
    let balance = opening;
    let entradas = 0;
    let saidas = 0;
    for (const e of events) {
      if (e.day <= to) balance += e.delta;
      if (e.day >= from && e.day <= to) {
        if (e.kind === "in") entradas += e.delta;
        if (e.kind === "out") saidas -= e.delta;
      }
    }
    return { saldo: round2(balance), entradas: round2(entradas), saidas: round2(saidas) };
  };

  // +1 ms: "agora" é sempre um instante, nunca só o dia.
  const today = brDayKey(new Date(now.getTime() + 1));

  const daily: BalancePoint[] = [];
  for (let i = 29; i >= 0; i--) {
    const day = addDaysKey(today, -i);
    daily.push({ label: `${day.slice(8, 10)}/${day.slice(5, 7)}`, ...totals(day, day) });
  }

  const monthly: BalancePoint[] = [];
  const [year, month] = today.split("-").map(Number);
  for (let i = 11; i >= 0; i--) {
    const first = new Date(Date.UTC(year, month - 1 - i, 1)).toISOString().slice(0, 10);
    const last = new Date(Date.UTC(year, month - i, 0)).toISOString().slice(0, 10);
    const end = last < today ? last : today;
    monthly.push({ label: `${first.slice(5, 7)}/${first.slice(2, 4)}`, ...totals(first, end) });
  }

  return { daily, monthly };
}

export type BalanceSeries = Awaited<ReturnType<typeof getBalanceSeries>>;
