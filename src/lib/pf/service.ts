import "server-only";
import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { OperationError } from "@/lib/crm-operations";
import { addDaysKey, brDayKey, brTodayRange, keyToUtc, parseDayKey } from "@/lib/br-time";
import type { PfAccountType, PfDebtStatus, PfDebtType, PfLiquidity, PfMovementType } from "@/generated/prisma/enums";
import {
  addMonths,
  budgetTone,
  compareStrategies,
  dayInMonth,
  debtRatioTone,
  invoiceMonthFor,
  monthOf,
  netWorthTone,
  percent,
  reserveTone,
  round2,
  savingsTone,
  simulatePayoff,
  splitInstallments,
  suggestedMonthly,
  type DebtInput,
  type Tone,
} from "@/lib/pf/calc";

// Tudo aqui é das Finanças Pessoais do dono. Nada lê nem grava tabela da empresa,
// exceto listWithdrawalCandidates, que só LÊ saídas pagas para o botão
// "Importar retirada da Monteiro" (copia valor e data, sem ligar as tabelas).

const n = (v: unknown) => Number(v ?? 0);

export function todayKey() {
  return brTodayRange().start.toISOString().slice(0, 10);
}

export function currentMonth() {
  return monthOf(todayKey());
}

function dayArg(value: string | undefined | null, label: string) {
  if (!value) return null;
  const d = parseDayKey(value);
  if (!d) throw new OperationError(`${label} inválida. Use o formato AAAA-MM-DD (ex.: 2026-11-14).`);
  return d;
}

function monthArg(value: string | undefined | null) {
  if (!value) return currentMonth();
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(value)) throw new OperationError("Mês inválido. Use AAAA-MM (ex.: 2026-11).");
  return value;
}

function positive(value: number | undefined | null, label: string) {
  if (value === undefined || value === null || !Number.isFinite(value) || value <= 0) {
    throw new OperationError(`${label} precisa ser maior que zero.`);
  }
  return round2(value);
}

function dayOfMonth(value: number | undefined | null, label: string) {
  if (!value || !Number.isInteger(value) || value < 1 || value > 31) throw new OperationError(`${label} precisa ser um dia entre 1 e 31.`);
  return value;
}

const monthRange = (month: string) => ({ gte: keyToUtc(`${month}-01`), lt: keyToUtc(`${addMonths(month, 1)}-01`) });

// ---------- Busca por nome ou ID (usada pelo conector) ----------

async function pick<T extends { id: string; name: string }>(items: T[], nameOrId: string, what: string) {
  const text = nameOrId.trim().toLowerCase();
  const exact = items.find((i) => i.id === nameOrId || i.name.toLowerCase() === text);
  if (exact) return exact;
  const partial = items.filter((i) => i.name.toLowerCase().includes(text));
  if (partial.length === 1) return partial[0];
  const names = items.map((i) => i.name).join(", ") || "nenhum cadastrado";
  if (partial.length === 0) throw new OperationError(`Não encontrei ${what} "${nameOrId}". Opções: ${names}.`);
  throw new OperationError(`Mais de ${what} para "${nameOrId}": ${partial.map((i) => i.name).join(", ")}. Seja mais específico.`);
}

export async function resolveCategory(nameOrId: string, type: PfMovementType) {
  const items = await prisma.pfCategory.findMany({ where: { type, active: true }, orderBy: { sortOrder: "asc" } });
  return pick(items, nameOrId, type === "ENTRADA" ? "uma fonte de renda" : "uma categoria");
}

export async function resolveAccount(nameOrId: string) {
  return pick(await prisma.pfAccount.findMany({ where: { active: true } }), nameOrId, "uma conta");
}

export async function resolveCard(nameOrId: string) {
  return pick(await prisma.pfCard.findMany({ where: { active: true } }), nameOrId, "um cartão");
}

/** "conta ou cartão": procura primeiro nas contas, depois nos cartões. */
export async function resolveAccountOrCard(nameOrId: string): Promise<{ accountId?: string; cardId?: string }> {
  const [accounts, cards] = await Promise.all([
    prisma.pfAccount.findMany({ where: { active: true } }),
    prisma.pfCard.findMany({ where: { active: true } }),
  ]);
  const text = nameOrId.trim().toLowerCase();
  const all = [
    ...accounts.map((a) => ({ id: a.id, name: a.name, kind: "account" as const })),
    ...cards.map((c) => ({ id: c.id, name: c.name, kind: "card" as const })),
  ];
  const found = all.find((i) => i.id === nameOrId || i.name.toLowerCase() === text) ?? (await pick(all, nameOrId, "uma conta ou cartão"));
  return found.kind === "account" ? { accountId: found.id } : { cardId: found.id };
}

// ---------- Contas e carteiras ----------

export async function getAccountsWithBalance() {
  const [accounts, txs, payments] = await Promise.all([
    prisma.pfAccount.findMany({ orderBy: [{ active: "desc" }, { createdAt: "asc" }] }),
    prisma.pfTransaction.groupBy({ by: ["accountId", "type"], where: { accountId: { not: null } }, _sum: { amount: true } }),
    prisma.pfCardPayment.groupBy({ by: ["accountId"], _sum: { amount: true } }),
  ]);
  return accounts.map((a) => {
    const entradas = n(txs.find((t) => t.accountId === a.id && t.type === "ENTRADA")?._sum.amount);
    const saidas = n(txs.find((t) => t.accountId === a.id && t.type === "SAIDA")?._sum.amount);
    const faturas = n(payments.find((p) => p.accountId === a.id)?._sum.amount);
    return {
      id: a.id,
      name: a.name,
      type: a.type,
      active: a.active,
      openingBalance: n(a.openingBalance),
      balance: round2(n(a.openingBalance) + entradas - saidas - faturas),
    };
  });
}

export async function saveAccount(input: { id?: string; name: string; type: PfAccountType; openingBalance?: number; active?: boolean }) {
  const name = input.name.trim();
  if (!name) throw new OperationError("Informe o nome da conta.");
  const data = { name, type: input.type, openingBalance: round2(input.openingBalance ?? 0), active: input.active ?? true };
  return input.id ? prisma.pfAccount.update({ where: { id: input.id }, data }) : prisma.pfAccount.create({ data });
}

// ---------- Categorias ----------

export async function listCategories(type?: PfMovementType, includeInactive = false) {
  return prisma.pfCategory.findMany({
    where: { ...(type ? { type } : {}), ...(includeInactive ? {} : { active: true }) },
    orderBy: [{ type: "asc" }, { sortOrder: "asc" }, { name: "asc" }],
  });
}

export async function saveCategory(input: { id?: string; name: string; type: PfMovementType; essential?: boolean; saving?: boolean; active?: boolean }) {
  const name = input.name.trim();
  if (!name) throw new OperationError("Informe o nome da categoria.");
  const clash = await prisma.pfCategory.findFirst({ where: { type: input.type, name: { equals: name, mode: "insensitive" }, NOT: input.id ? { id: input.id } : undefined } });
  if (clash) throw new OperationError(`Já existe a categoria "${clash.name}".`);
  const data = { name, type: input.type, essential: !!input.essential, saving: !!input.saving, active: input.active ?? true };
  if (input.id) return prisma.pfCategory.update({ where: { id: input.id }, data });
  const last = await prisma.pfCategory.aggregate({ where: { type: input.type }, _max: { sortOrder: true } });
  return prisma.pfCategory.create({ data: { ...data, sortOrder: (last._max.sortOrder ?? 0) + 1 } });
}

// ---------- Cartões ----------

export async function saveCard(input: { id?: string; name: string; limit: number; closingDay: number; dueDay: number; active?: boolean }) {
  const name = input.name.trim();
  if (!name) throw new OperationError("Informe o nome do cartão.");
  const data = {
    name,
    limit: round2(Math.max(0, input.limit || 0)),
    closingDay: dayOfMonth(input.closingDay, "O dia de fechamento"),
    dueDay: dayOfMonth(input.dueDay, "O dia de vencimento"),
    active: input.active ?? true,
  };
  return input.id ? prisma.pfCard.update({ where: { id: input.id }, data }) : prisma.pfCard.create({ data });
}

export async function getCardsOverview() {
  const today = todayKey();
  const [cards, txs, payments] = await Promise.all([
    prisma.pfCard.findMany({ orderBy: [{ active: "desc" }, { createdAt: "asc" }] }),
    prisma.pfTransaction.groupBy({ by: ["cardId", "invoiceMonth"], where: { cardId: { not: null } }, _sum: { amount: true } }),
    prisma.pfCardPayment.groupBy({ by: ["cardId", "invoiceMonth"], _sum: { amount: true } }),
  ]);
  return cards.map((c) => {
    const current = invoiceMonthFor(today, c.closingDay, c.dueDay);
    const months = new Set<string>();
    for (const t of txs) if (t.cardId === c.id && t.invoiceMonth) months.add(t.invoiceMonth);
    for (const p of payments) if (p.cardId === c.id) months.add(p.invoiceMonth);
    const invoices = [...months]
      .sort()
      .map((month) => {
        const total = n(txs.find((t) => t.cardId === c.id && t.invoiceMonth === month)?._sum.amount);
        const paid = n(payments.find((p) => p.cardId === c.id && p.invoiceMonth === month)?._sum.amount);
        const open = round2(total - paid);
        return {
          month,
          dueDate: dayInMonth(month, c.dueDay),
          total: round2(total),
          paid: round2(paid),
          open,
          situation: month < current ? (open > 0.005 ? "fechada" : "paga") : month === current ? "atual" : "futura",
        };
      })
      .filter((i) => i.month >= current || i.open > 0.005);
    const used = round2(invoices.reduce((s, i) => s + Math.max(0, i.open), 0));
    return {
      id: c.id,
      name: c.name,
      active: c.active,
      limit: n(c.limit),
      closingDay: c.closingDay,
      dueDay: c.dueDay,
      currentInvoiceMonth: current,
      currentInvoice: invoices.find((i) => i.month === current)?.open ?? 0,
      used,
      available: round2(n(c.limit) - used),
      invoices,
    };
  });
}

export async function payInvoice(input: { cardId: string; invoiceMonth: string; accountId: string; amount: number; date?: string }) {
  const card = await prisma.pfCard.findUnique({ where: { id: input.cardId } });
  if (!card) throw new OperationError("Cartão não encontrado.");
  const account = await prisma.pfAccount.findUnique({ where: { id: input.accountId } });
  if (!account) throw new OperationError("Escolha a conta de onde sai o pagamento.");
  return prisma.pfCardPayment.create({
    data: {
      cardId: card.id,
      invoiceMonth: monthArg(input.invoiceMonth),
      accountId: account.id,
      amount: positive(input.amount, "O valor pago"),
      date: dayArg(input.date, "Data") ?? keyToUtc(todayKey()),
    },
  });
}

// ---------- Lançamentos ----------

export type TransactionInput = {
  type: PfMovementType;
  date: string;
  amount: number;
  description: string;
  categoryId: string;
  accountId?: string | null;
  cardId?: string | null;
  installments?: number;
  notes?: string | null;
};

/** Cria o lançamento. No cartão com parcelas, cria uma por mês, cada uma na sua fatura. */
export async function createTransaction(input: TransactionInput) {
  const date = dayArg(input.date, "Data");
  if (!date) throw new OperationError("Informe a data.");
  const amount = positive(input.amount, "O valor");
  const description = input.description.trim();
  if (!description) throw new OperationError("Informe a descrição.");
  const category = await prisma.pfCategory.findUnique({ where: { id: input.categoryId } });
  if (!category) throw new OperationError("Categoria não encontrada.");
  if (category.type !== input.type) {
    throw new OperationError(input.type === "ENTRADA" ? "Escolha uma fonte de renda (categoria de entrada)." : "Escolha uma categoria de saída.");
  }
  if (!!input.accountId === !!input.cardId) throw new OperationError("Escolha uma conta OU um cartão.");
  if (input.cardId && input.type === "ENTRADA") throw new OperationError("Entrada não pode ser no cartão de crédito. Escolha uma conta.");

  if (input.accountId) {
    const account = await prisma.pfAccount.findUnique({ where: { id: input.accountId } });
    if (!account) throw new OperationError("Conta não encontrada.");
    return [
      await prisma.pfTransaction.create({
        data: { type: input.type, date, amount, description, categoryId: category.id, accountId: account.id, notes: input.notes || null },
      }),
    ];
  }

  const card = await prisma.pfCard.findUnique({ where: { id: input.cardId! } });
  if (!card) throw new OperationError("Cartão não encontrado.");
  const count = Math.min(Math.max(Math.floor(input.installments ?? 1), 1), 48);
  const dayKey = date.toISOString().slice(0, 10);
  const firstInvoice = invoiceMonthFor(dayKey, card.closingDay, card.dueDay);
  const parts = splitInstallments(amount, count);
  const groupId = count > 1 ? randomUUID() : null;
  return prisma.$transaction(
    parts.map((value, i) => {
      const month = addMonths(monthOf(dayKey), i);
      return prisma.pfTransaction.create({
        data: {
          type: "SAIDA",
          date: keyToUtc(dayInMonth(month, Number(dayKey.slice(8, 10)))),
          amount: value,
          description: count > 1 ? `${description} (${i + 1}/${count})` : description,
          categoryId: category.id,
          cardId: card.id,
          invoiceMonth: addMonths(firstInvoice, i),
          installmentGroupId: groupId,
          installmentNumber: count > 1 ? i + 1 : null,
          installmentTotal: count > 1 ? count : null,
          notes: input.notes || null,
        },
      });
    }),
  );
}

export async function updateTransaction(
  id: string,
  patch: { date?: string; amount?: number; description?: string; categoryId?: string; accountId?: string; notes?: string | null },
) {
  const tx = await prisma.pfTransaction.findUnique({ where: { id }, include: { card: true } });
  if (!tx) throw new OperationError("Lançamento não encontrado.");
  const data: Record<string, unknown> = {};
  if (patch.description !== undefined) {
    if (!patch.description.trim()) throw new OperationError("A descrição não pode ficar vazia.");
    data.description = patch.description.trim();
  }
  if (patch.amount !== undefined) data.amount = positive(patch.amount, "O valor");
  if (patch.notes !== undefined) data.notes = patch.notes || null;
  if (patch.date !== undefined) {
    const date = dayArg(patch.date, "Data");
    if (!date) throw new OperationError("Informe a data.");
    data.date = date;
    if (tx.card && !tx.installmentGroupId) data.invoiceMonth = invoiceMonthFor(patch.date, tx.card.closingDay, tx.card.dueDay);
  }
  if (patch.categoryId !== undefined) {
    const category = await prisma.pfCategory.findUnique({ where: { id: patch.categoryId } });
    if (!category || category.type !== tx.type) throw new OperationError("Categoria inválida para este tipo de lançamento.");
    data.categoryId = category.id;
  }
  if (patch.accountId !== undefined) {
    if (tx.cardId) throw new OperationError("Compra no cartão não troca para conta. Exclua e lance de novo.");
    const account = await prisma.pfAccount.findUnique({ where: { id: patch.accountId } });
    if (!account) throw new OperationError("Conta não encontrada.");
    data.accountId = account.id;
  }
  const before = { date: brDayKey(tx.date), amount: n(tx.amount), description: tx.description };
  const after = await prisma.pfTransaction.update({ where: { id }, data });
  return { before, after: { date: brDayKey(after.date), amount: n(after.amount), description: after.description } };
}

/** Exclui o lançamento (ou todas as parcelas da compra). Conta fixa paga volta a pendente. */
export async function deleteTransaction(id: string, allInstallments = false) {
  const tx = await prisma.pfTransaction.findUnique({ where: { id } });
  if (!tx) throw new OperationError("Lançamento não encontrado.");
  const ids =
    allInstallments && tx.installmentGroupId
      ? (await prisma.pfTransaction.findMany({ where: { installmentGroupId: tx.installmentGroupId }, select: { id: true } })).map((t) => t.id)
      : [id];
  await prisma.$transaction([
    prisma.pfBillOccurrence.updateMany({ where: { transactionId: { in: ids } }, data: { status: "PENDENTE", paidAt: null, transactionId: null } }),
    prisma.pfTransaction.deleteMany({ where: { id: { in: ids } } }),
  ]);
  return { removed: ids.length };
}

export async function listTransactions(filter: {
  month?: string;
  type?: PfMovementType;
  categoryId?: string;
  accountId?: string;
  cardId?: string;
  search?: string;
  take?: number;
}) {
  return prisma.pfTransaction.findMany({
    where: {
      ...(filter.month ? { date: monthRange(monthArg(filter.month)) } : {}),
      ...(filter.type ? { type: filter.type } : {}),
      ...(filter.categoryId ? { categoryId: filter.categoryId } : {}),
      ...(filter.accountId ? { accountId: filter.accountId } : {}),
      ...(filter.cardId ? { cardId: filter.cardId } : {}),
      ...(filter.search ? { description: { contains: filter.search, mode: "insensitive" as const } } : {}),
    },
    include: { category: true, account: true, card: true, attachment: { select: { id: true, fileName: true } } },
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    take: Math.min(filter.take ?? 200, 500),
  });
}

export const MAX_ATTACHMENT_BYTES = 3 * 1024 * 1024;
const ATTACHMENT_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic", "application/pdf"];

export async function saveAttachment(transactionId: string, file: { name: string; type: string; bytes: Uint8Array }) {
  if (file.bytes.byteLength === 0) throw new OperationError("Arquivo vazio.");
  if (file.bytes.byteLength > MAX_ATTACHMENT_BYTES) throw new OperationError("O comprovante pode ter no máximo 3 MB.");
  if (!ATTACHMENT_TYPES.includes(file.type)) throw new OperationError("Envie foto (JPG, PNG, WEBP, HEIC) ou PDF.");
  const tx = await prisma.pfTransaction.findUnique({ where: { id: transactionId } });
  if (!tx) throw new OperationError("Lançamento não encontrado.");
  const data = { fileName: file.name.slice(0, 200) || "comprovante", mimeType: file.type, data: Buffer.from(file.bytes) };
  return prisma.pfAttachment.upsert({ where: { transactionId }, create: { transactionId, ...data }, update: data, select: { id: true } });
}

// ---------- Importar retirada da Monteiro ----------

/**
 * Saídas já pagas pela empresa nos últimos 120 dias, para escolher qual virou
 * dinheiro pessoal. Só leitura. Por padrão mostra as que parecem retirada.
 */
export async function listWithdrawalCandidates(showAll = false) {
  const since = keyToUtc(addDaysKey(todayKey(), -120));
  const words = ["retirada", "pró-labore", "pro-labore", "pro labore", "prolabore", "distribuição de lucro", "lucro"];
  const payables = await prisma.payable.findMany({
    where: {
      status: "PAGO",
      reversedAt: null,
      paidAt: { gte: since },
      ...(showAll
        ? {}
        : {
            OR: words.flatMap((w) => [
              { description: { contains: w, mode: "insensitive" as const } },
              { category: { contains: w, mode: "insensitive" as const } },
            ]),
          }),
    },
    select: { id: true, number: true, description: true, category: true, amount: true, paidAt: true },
    orderBy: { paidAt: "desc" },
    take: 50,
  });
  // Avisa quando já existe entrada pessoal com o mesmo valor e data (provável importação repetida).
  const existing = await prisma.pfTransaction.findMany({
    where: { type: "ENTRADA", date: { gte: since } },
    select: { date: true, amount: true },
  });
  return payables.map((p) => {
    const day = brDayKey(p.paidAt!);
    return {
      id: p.id,
      number: p.number,
      description: p.description,
      category: p.category,
      amount: n(p.amount),
      date: day,
      alreadyImported: existing.some((e) => brDayKey(e.date) === day && n(e.amount) === n(p.amount)),
    };
  });
}

/** Cria a entrada pessoal copiando só o valor e a data da saída da empresa. */
export async function importWithdrawal(payableId: string, accountId: string) {
  const payable = await prisma.payable.findUnique({ where: { id: payableId }, select: { amount: true, paidAt: true, status: true } });
  if (!payable || payable.status !== "PAGO" || !payable.paidAt) throw new OperationError("Essa saída da empresa não está paga.");
  const category =
    (await prisma.pfCategory.findFirst({ where: { type: "ENTRADA", name: "Retirada Monteiro" } })) ??
    (await prisma.pfCategory.findFirst({ where: { type: "ENTRADA" }, orderBy: { sortOrder: "asc" } }));
  if (!category) throw new OperationError("Cadastre a fonte de renda \"Retirada Monteiro\".");
  return createTransaction({
    type: "ENTRADA",
    date: brDayKey(payable.paidAt),
    amount: n(payable.amount),
    description: "Retirada Monteiro",
    categoryId: category.id,
    accountId,
  });
}

// ---------- Contas fixas ----------

export async function saveBill(input: { id?: string; name: string; amount: number; dueDay: number; categoryId: string; accountId?: string | null; active?: boolean }) {
  const name = input.name.trim();
  if (!name) throw new OperationError("Informe o nome da conta fixa.");
  const category = await prisma.pfCategory.findUnique({ where: { id: input.categoryId } });
  if (!category || category.type !== "SAIDA") throw new OperationError("Escolha uma categoria de saída.");
  const data = {
    name,
    amount: positive(input.amount, "O valor"),
    dueDay: dayOfMonth(input.dueDay, "O dia de vencimento"),
    categoryId: category.id,
    accountId: input.accountId || null,
    active: input.active ?? true,
  };
  const bill = input.id
    ? await prisma.pfRecurringBill.update({ where: { id: input.id }, data })
    : await prisma.pfRecurringBill.create({ data: { ...data, startMonth: currentMonth() } });
  if (input.id) {
    // Mudou valor ou dia: atualiza as ocorrências ainda pendentes deste mês em diante.
    const pend = await prisma.pfBillOccurrence.findMany({ where: { billId: bill.id, status: "PENDENTE", month: { gte: currentMonth() } } });
    for (const o of pend) {
      await prisma.pfBillOccurrence.update({ where: { id: o.id }, data: { amount: data.amount, dueDate: keyToUtc(dayInMonth(o.month, data.dueDay)) } });
    }
  }
  await ensureBillOccurrences();
  return bill;
}

/** Geração automática: garante a ocorrência do mês atual e do próximo para cada conta fixa ativa. */
export async function ensureBillOccurrences() {
  const months = [currentMonth(), addMonths(currentMonth(), 1)];
  const bills = await prisma.pfRecurringBill.findMany({ where: { active: true } });
  const rows = bills.flatMap((b) =>
    months
      .filter((m) => m >= b.startMonth)
      .map((m) => ({ billId: b.id, month: m, amount: b.amount, dueDate: keyToUtc(dayInMonth(m, b.dueDay)) })),
  );
  if (rows.length) await prisma.pfBillOccurrence.createMany({ data: rows, skipDuplicates: true });
}

export async function listBillOccurrences(filter: { month?: string; status?: "PENDENTE" | "PAGO" }) {
  await ensureBillOccurrences();
  const today = todayKey();
  const rows = await prisma.pfBillOccurrence.findMany({
    where: { ...(filter.month ? { month: monthArg(filter.month) } : {}), ...(filter.status ? { status: filter.status } : {}) },
    include: { bill: { include: { category: true, account: true } } },
    orderBy: [{ dueDate: "asc" }],
  });
  return rows.map((o) => {
    const due = brDayKey(o.dueDate);
    const days = Math.round((keyToUtc(due).getTime() - keyToUtc(today).getTime()) / 86400000);
    return {
      id: o.id,
      billId: o.billId,
      name: o.bill.name,
      category: o.bill.category.name,
      account: o.bill.account?.name ?? null,
      accountId: o.bill.accountId,
      month: o.month,
      dueDate: due,
      amount: n(o.amount),
      status: o.status,
      paidAt: o.paidAt ? brDayKey(o.paidAt) : null,
      daysToDue: days,
      alert: o.status === "PENDENTE" ? (days < 0 ? "vencida" : days <= 3 ? `vence em ${days === 0 ? "hoje" : days === 1 ? "1 dia" : `${days} dias`}` : null) : null,
    };
  });
}

export async function upcomingBills(days = 7) {
  const today = todayKey();
  const limit = addDaysKey(today, days);
  return (await listBillOccurrences({ status: "PENDENTE" })).filter((o) => o.dueDate <= limit);
}

/** Marca como paga e lança a saída na conta. */
export async function markBillPaid(occurrenceId: string, opts: { accountId?: string | null; date?: string; amount?: number }) {
  const occ = await prisma.pfBillOccurrence.findUnique({ where: { id: occurrenceId }, include: { bill: true } });
  if (!occ) throw new OperationError("Conta fixa do mês não encontrada.");
  if (occ.status === "PAGO") throw new OperationError("Essa conta já está paga.");
  const accountId = opts.accountId || occ.bill.accountId;
  if (!accountId) throw new OperationError("Informe de qual conta saiu o pagamento.");
  const date = opts.date ?? todayKey();
  const [tx] = await createTransaction({
    type: "SAIDA",
    date,
    amount: opts.amount ?? n(occ.amount),
    description: occ.bill.name,
    categoryId: occ.bill.categoryId,
    accountId,
  });
  await prisma.pfBillOccurrence.update({ where: { id: occ.id }, data: { status: "PAGO", paidAt: keyToUtc(date), transactionId: tx.id, amount: tx.amount } });
  return { transactionId: tx.id, name: occ.bill.name, amount: n(tx.amount), date };
}

// ---------- Dívidas ----------

export type DebtInputData = {
  creditor: string;
  type: PfDebtType;
  balance: number;
  monthlyRate?: number;
  installment?: number;
  remainingInstallments?: number | null;
  dueDay?: number | null;
  status?: PfDebtStatus;
  daysLate?: number;
  notes?: string | null;
};

function debtData(input: Partial<DebtInputData>) {
  const data: Record<string, unknown> = {};
  if (input.creditor !== undefined) {
    if (!input.creditor.trim()) throw new OperationError("Informe o credor.");
    data.creditor = input.creditor.trim();
  }
  if (input.type !== undefined) data.type = input.type;
  if (input.balance !== undefined) {
    if (!(input.balance >= 0)) throw new OperationError("O saldo não pode ser negativo.");
    data.balance = round2(input.balance);
  }
  if (input.monthlyRate !== undefined) {
    if (!(input.monthlyRate >= 0) || input.monthlyRate > 100) throw new OperationError("Juros ao mês precisa estar entre 0 e 100 (em %).");
    data.monthlyRate = input.monthlyRate;
  }
  if (input.installment !== undefined) data.installment = round2(Math.max(0, input.installment));
  if (input.remainingInstallments !== undefined) data.remainingInstallments = input.remainingInstallments ?? null;
  if (input.dueDay !== undefined) data.dueDay = input.dueDay ? dayOfMonth(input.dueDay, "O dia de vencimento") : null;
  if (input.status !== undefined) data.status = input.status;
  if (input.daysLate !== undefined) data.daysLate = Math.max(0, Math.floor(input.daysLate));
  if (input.notes !== undefined) data.notes = input.notes || null;
  if (data.balance === 0) data.status = "QUITADA";
  if (data.status && data.status !== "ATRASADA" && input.daysLate === undefined) data.daysLate = 0;
  return data;
}

export async function createDebt(input: DebtInputData) {
  if (!input.creditor?.trim()) throw new OperationError("Informe o credor.");
  return prisma.pfDebt.create({ data: debtData(input) as never });
}

export async function updateDebt(id: string, patch: Partial<DebtInputData>) {
  const before = await prisma.pfDebt.findUnique({ where: { id } });
  if (!before) throw new OperationError("Dívida não encontrada.");
  const after = await prisma.pfDebt.update({ where: { id }, data: debtData(patch) });
  return { before, after };
}

export async function deleteDebt(id: string) {
  await prisma.pfDebt.delete({ where: { id } });
}

/** Pagamento de parcela: lança a saída em "Dívidas" e abate do saldo. */
export async function payDebt(id: string, input: { amount: number; accountId: string; date?: string }) {
  const debt = await prisma.pfDebt.findUnique({ where: { id } });
  if (!debt) throw new OperationError("Dívida não encontrada.");
  const category =
    (await prisma.pfCategory.findFirst({ where: { type: "SAIDA", name: "Dívidas" } })) ??
    (await prisma.pfCategory.findFirst({ where: { type: "SAIDA" }, orderBy: { sortOrder: "asc" } }));
  if (!category) throw new OperationError("Cadastre a categoria \"Dívidas\".");
  const amount = positive(input.amount, "O valor");
  await createTransaction({
    type: "SAIDA",
    date: input.date ?? todayKey(),
    amount,
    description: `Pagamento ${debt.creditor}`,
    categoryId: category.id,
    accountId: input.accountId,
  });
  const balance = round2(Math.max(0, n(debt.balance) - amount));
  return prisma.pfDebt.update({
    where: { id },
    data: {
      balance,
      remainingInstallments: debt.remainingInstallments ? Math.max(0, debt.remainingInstallments - 1) : debt.remainingInstallments,
      ...(balance === 0 ? { status: "QUITADA", daysLate: 0 } : {}),
    },
  });
}

export async function addNegotiation(debtId: string, input: { date?: string; proposal: string; result?: string | null }) {
  const debt = await prisma.pfDebt.findUnique({ where: { id: debtId } });
  if (!debt) throw new OperationError("Dívida não encontrada.");
  if (!input.proposal?.trim()) throw new OperationError("Descreva a proposta.");
  return prisma.pfDebtNegotiation.create({
    data: { debtId, date: dayArg(input.date, "Data") ?? keyToUtc(todayKey()), proposal: input.proposal.trim(), result: input.result || null },
  });
}

export async function listDebts(includePaid = true) {
  return prisma.pfDebt.findMany({
    where: includePaid ? {} : { status: { not: "QUITADA" } },
    include: { negotiations: { orderBy: { date: "desc" } } },
    orderBy: [{ status: "asc" }, { balance: "desc" }],
  });
}

async function openDebtInputs(): Promise<DebtInput[]> {
  const debts = await prisma.pfDebt.findMany({ where: { status: { not: "QUITADA" }, balance: { gt: 0 } } });
  return debts.map((d) => ({ id: d.id, name: d.creditor, balance: n(d.balance), monthlyRate: n(d.monthlyRate), installment: n(d.installment) }));
}

export async function simulateDebtPayoff(extraPerMonth: number) {
  const debts = await openDebtInputs();
  return { debts, ...compareStrategies(debts, Math.max(0, extraPerMonth || 0), currentMonth()) };
}

// ---------- Orçamento ----------

export async function setBudget(input: { month?: string; categoryId: string; limit: number }) {
  const month = monthArg(input.month);
  const category = await prisma.pfCategory.findUnique({ where: { id: input.categoryId } });
  if (!category || category.type !== "SAIDA") throw new OperationError("Orçamento só vale para categorias de saída.");
  const limit = round2(Math.max(0, input.limit || 0));
  return prisma.pfBudget.upsert({
    where: { month_categoryId: { month, categoryId: category.id } },
    create: { month, categoryId: category.id, limit },
    update: { limit },
  });
}

/** Limite de cada categoria no mês (o mais recente definido até aquele mês) e quanto já foi gasto. */
export async function getBudgetStatus(month?: string) {
  const m = monthArg(month);
  const [categories, budgets, spent] = await Promise.all([
    prisma.pfCategory.findMany({ where: { type: "SAIDA", active: true }, orderBy: { sortOrder: "asc" } }),
    prisma.pfBudget.findMany({ where: { month: { lte: m } }, orderBy: { month: "desc" } }),
    prisma.pfTransaction.groupBy({ by: ["categoryId"], where: { type: "SAIDA", date: monthRange(m) }, _sum: { amount: true } }),
  ]);
  return categories
    .map((c) => {
      const limit = n(budgets.find((b) => b.categoryId === c.id)?.limit);
      const value = round2(n(spent.find((s) => s.categoryId === c.id)?._sum.amount));
      return {
        categoryId: c.id,
        category: c.name,
        limit,
        spent: value,
        percent: limit > 0 ? Math.round((value / limit) * 1000) / 10 : null,
        tone: budgetTone(value, limit) as Tone,
      };
    })
    .filter((r) => r.limit > 0 || r.spent > 0);
}

// ---------- Metas ----------

export async function saveGoal(input: { id?: string; name?: string; target?: number; current?: number; deadline?: string | null; done?: boolean }) {
  const data: Record<string, unknown> = {};
  if (input.name !== undefined) {
    if (!input.name.trim()) throw new OperationError("Informe o nome da meta.");
    data.name = input.name.trim();
  }
  if (input.target !== undefined) data.target = round2(Math.max(0, input.target));
  if (input.current !== undefined) data.current = round2(Math.max(0, input.current));
  if (input.deadline !== undefined) data.deadline = input.deadline ? dayArg(input.deadline, "Prazo") : null;
  if (input.done !== undefined) data.done = input.done;
  if (input.id) {
    const goal = await prisma.pfGoal.findUnique({ where: { id: input.id } });
    if (!goal) throw new OperationError("Meta não encontrada.");
    if (goal.emergency && data.name) delete data.name; // a Reserva de Emergência mantém o nome
    return prisma.pfGoal.update({ where: { id: input.id }, data });
  }
  if (!data.name) throw new OperationError("Informe o nome da meta.");
  return prisma.pfGoal.create({ data: data as never });
}

export async function deleteGoal(id: string) {
  const goal = await prisma.pfGoal.findUnique({ where: { id } });
  if (!goal) throw new OperationError("Meta não encontrada.");
  if (goal.emergency) throw new OperationError("A Reserva de Emergência é fixa e não pode ser apagada.");
  await prisma.pfGoal.delete({ where: { id } });
}

export async function resolveGoal(nameOrId: string) {
  return pick(await prisma.pfGoal.findMany(), nameOrId, "uma meta");
}

export async function getGoalsProgress() {
  const today = todayKey();
  const goals = await prisma.pfGoal.findMany({ orderBy: [{ emergency: "desc" }, { done: "asc" }, { createdAt: "asc" }] });
  return goals.map((g) => {
    const target = n(g.target);
    const current = n(g.current);
    const deadline = g.deadline ? brDayKey(g.deadline) : null;
    return {
      id: g.id,
      name: g.name,
      emergency: g.emergency,
      done: g.done,
      target,
      current,
      missing: round2(Math.max(0, target - current)),
      percent: target > 0 ? Math.min(100, Math.round((current / target) * 1000) / 10) : 0,
      deadline,
      suggestedMonthly: suggestedMonthly(target, current, deadline, today),
    };
  });
}

// ---------- Investimentos ----------

export async function saveInvestment(input: {
  id?: string;
  name?: string;
  institution?: string | null;
  applied?: number;
  current?: number;
  liquidity?: PfLiquidity;
  appliedAt?: string;
  maturityDate?: string | null;
  redeemed?: boolean;
  fromAccountId?: string | null;
}) {
  const data: Record<string, unknown> = {};
  if (input.name !== undefined) {
    if (!input.name.trim()) throw new OperationError("Informe o nome do investimento.");
    data.name = input.name.trim();
  }
  if (input.institution !== undefined) data.institution = input.institution || null;
  if (input.applied !== undefined) data.applied = positive(input.applied, "O valor aplicado");
  if (input.current !== undefined) data.current = round2(Math.max(0, input.current));
  if (input.liquidity !== undefined) data.liquidity = input.liquidity;
  if (input.appliedAt !== undefined) data.appliedAt = dayArg(input.appliedAt, "Data da aplicação");
  if (input.maturityDate !== undefined) data.maturityDate = input.maturityDate ? dayArg(input.maturityDate, "Vencimento") : null;
  if (input.redeemed !== undefined) data.redeemed = input.redeemed;
  if (input.id) return prisma.pfInvestment.update({ where: { id: input.id }, data });

  if (!data.name || data.applied === undefined) throw new OperationError("Informe o nome e o valor aplicado.");
  if (!data.appliedAt) data.appliedAt = keyToUtc(todayKey());
  if (data.current === undefined) data.current = data.applied;
  const inv = await prisma.pfInvestment.create({ data: data as never });
  if (input.fromAccountId) {
    // O dinheiro saiu da conta: lança como "Reserva e Investimentos" (conta como guardado, não como gasto).
    const category =
      (await prisma.pfCategory.findFirst({ where: { type: "SAIDA", saving: true, active: true }, orderBy: { sortOrder: "asc" } })) ??
      (await prisma.pfCategory.findFirst({ where: { type: "SAIDA", name: "Outros" } }));
    if (category) {
      await createTransaction({
        type: "SAIDA",
        date: brDayKey(inv.appliedAt),
        amount: n(inv.applied),
        description: `Aplicação ${inv.name}`,
        categoryId: category.id,
        accountId: input.fromAccountId,
      });
    }
  }
  return inv;
}

export async function resolveInvestment(nameOrId: string) {
  return pick(await prisma.pfInvestment.findMany(), nameOrId, "um investimento");
}

export async function listInvestments(includeRedeemed = false) {
  const rows = await prisma.pfInvestment.findMany({
    where: includeRedeemed ? {} : { redeemed: false },
    orderBy: [{ redeemed: "asc" }, { appliedAt: "desc" }],
  });
  return rows.map((i) => {
    const applied = n(i.applied);
    const current = n(i.current);
    return {
      id: i.id,
      name: i.name,
      institution: i.institution,
      applied,
      current,
      yield: round2(current - applied),
      yieldPercent: applied > 0 ? Math.round(((current - applied) / applied) * 10000) / 100 : 0,
      liquidity: i.liquidity,
      appliedAt: brDayKey(i.appliedAt),
      maturityDate: i.maturityDate ? brDayKey(i.maturityDate) : null,
      redeemed: i.redeemed,
    };
  });
}

// ---------- Resumo do mês e painel ----------

type MonthTotals = { entradas: number; saidas: number; guardadoSaidas: number; essenciais: number; byCategory: Map<string, number> };

async function monthTotals(fromMonth: string, toMonth: string) {
  const txs = await prisma.pfTransaction.findMany({
    where: { date: { gte: keyToUtc(`${fromMonth}-01`), lt: keyToUtc(`${addMonths(toMonth, 1)}-01`) } },
    select: { type: true, amount: true, date: true, category: { select: { name: true, essential: true, saving: true } } },
  });
  const map = new Map<string, MonthTotals>();
  for (let m = fromMonth; m <= toMonth; m = addMonths(m, 1)) {
    map.set(m, { entradas: 0, saidas: 0, guardadoSaidas: 0, essenciais: 0, byCategory: new Map() });
  }
  for (const t of txs) {
    const row = map.get(monthOf(brDayKey(t.date)));
    if (!row) continue;
    const v = n(t.amount);
    if (t.type === "ENTRADA") {
      row.entradas += v;
      continue;
    }
    row.saidas += v;
    if (t.category.saving) row.guardadoSaidas += v;
    else row.byCategory.set(t.category.name, (row.byCategory.get(t.category.name) ?? 0) + v);
    if (t.category.essential) row.essenciais += v;
  }
  return map;
}

/**
 * Indicadores. Renda = entradas do mês (se ainda não entrou nada, a média dos 3
 * meses anteriores). Guardado = saídas para "Reserva e Investimentos" + a sobra
 * positiva. Gastos essenciais = média dos 3 meses anteriores (ou o mês atual,
 * se não houver histórico).
 */
export async function getMonthSummary(month?: string) {
  const m = monthArg(month);
  const totals = await monthTotals(addMonths(m, -3), m);
  const cur = totals.get(m)!;
  const prevMonth = addMonths(m, -1);
  const prev = totals.get(prevMonth)!;
  const previous3 = [1, 2, 3].map((i) => totals.get(addMonths(m, -i))!);

  const avg = (vals: number[]) => {
    const used = vals.filter((v) => v > 0);
    return used.length ? used.reduce((a, b) => a + b, 0) / used.length : 0;
  };
  const renda = cur.entradas > 0 ? cur.entradas : avg(previous3.map((r) => r.entradas));
  const sobra = round2(cur.entradas - cur.saidas);
  const guardado = round2(cur.guardadoSaidas + Math.max(0, sobra));
  const essenciaisMes = avg(previous3.map((r) => r.essenciais)) || cur.essenciais;

  const [debts, goals] = await Promise.all([
    prisma.pfDebt.findMany({ where: { status: { not: "QUITADA" } }, select: { installment: true } }),
    prisma.pfGoal.findFirst({ where: { emergency: true } }),
  ]);
  const parcelas = round2(debts.reduce((s, d) => s + n(d.installment), 0));
  const reserva = n(goals?.current);
  const comprometida = percent(parcelas, renda);
  const poupanca = percent(guardado, cur.entradas);
  const mesesReserva = essenciaisMes > 0 ? Math.round((reserva / essenciaisMes) * 10) / 10 : null;

  const gastos = round2(cur.saidas - cur.guardadoSaidas);
  const prevGastos = round2(prev.saidas - prev.guardadoSaidas);
  const variation = (a: number, b: number) => (b > 0 ? Math.round(((a - b) / b) * 1000) / 10 : null);

  return {
    month: m,
    entradas: round2(cur.entradas),
    saidas: round2(cur.saidas),
    gastos,
    guardado,
    sobra,
    porCategoria: [...cur.byCategory.entries()].map(([category, value]) => ({ category, value: round2(value) })).sort((a, b) => b.value - a.value),
    anterior: {
      month: prevMonth,
      entradas: round2(prev.entradas),
      saidas: round2(prev.saidas),
      gastos: prevGastos,
      sobra: round2(prev.entradas - prev.saidas),
      variacaoEntradas: variation(cur.entradas, prev.entradas),
      variacaoSaidas: variation(cur.saidas, prev.saidas),
      variacaoGastos: variation(gastos, prevGastos),
    },
    indicadores: {
      rendaConsiderada: round2(renda),
      parcelasDividas: parcelas,
      rendaComprometida: { percent: comprometida, tone: debtRatioTone(comprometida) },
      taxaPoupanca: { percent: poupanca, tone: savingsTone(poupanca) },
      mesesReserva: { meses: mesesReserva, reserva, gastosEssenciaisMes: round2(essenciaisMes), tone: reserveTone(mesesReserva) },
    },
  };
}

export async function getDashboard() {
  const month = currentMonth();
  const [accounts, investments, debts, summary, budget, goals, bills, debtInputs] = await Promise.all([
    getAccountsWithBalance(),
    listInvestments(),
    prisma.pfDebt.findMany({ where: { status: { not: "QUITADA" } }, select: { balance: true } }),
    getMonthSummary(month),
    getBudgetStatus(month),
    getGoalsProgress(),
    upcomingBills(7),
    openDebtInputs(),
  ]);

  const saldoTotal = round2(accounts.filter((a) => a.active).reduce((s, a) => s + a.balance, 0));
  const investido = round2(investments.reduce((s, i) => s + i.current, 0));
  const dividaTotal = round2(debts.reduce((s, d) => s + n(d.balance), 0));
  const patrimonio = round2(saldoTotal + investido - dividaTotal);

  await prisma.pfMonthlySnapshot.upsert({
    where: { month },
    create: { month, accountsTotal: saldoTotal, investedTotal: investido, debtTotal: dividaTotal, netWorth: patrimonio },
    update: { accountsTotal: saldoTotal, investedTotal: investido, debtTotal: dividaTotal, netWorth: patrimonio },
  });

  const first = addMonths(month, -11);
  const [totals, snapshots, allInvestments] = await Promise.all([
    monthTotals(first, month),
    prisma.pfMonthlySnapshot.findMany({ where: { month: { gte: first } }, orderBy: { month: "asc" } }),
    prisma.pfInvestment.findMany({ select: { applied: true, appliedAt: true } }),
  ]);
  const months = [...totals.keys()];
  const projection = simulatePayoff(debtInputs, 0, "avalanche", month);

  const fluxo = months.map((m) => ({ month: m, entradas: round2(totals.get(m)!.entradas), saidas: round2(totals.get(m)!.saidas) }));
  const snap = (m: string) => snapshots.find((s) => s.month === m);
  const dividaSerie = [
    ...months.filter((m) => snap(m)).map((m) => ({ month: m, real: n(snap(m)!.debtTotal) as number | null, previsto: m === month ? dividaTotal : (null as number | null) })),
    ...projection.balances.slice(0, 36).map((b) => ({ month: b.month, real: null, previsto: b.total })),
  ];
  const investidoSerie = months.map((m) => ({
    month: m,
    aplicado: round2(allInvestments.filter((i) => monthOf(brDayKey(i.appliedAt)) <= m).reduce((s, i) => s + n(i.applied), 0)),
    valorAtual: snap(m) ? n(snap(m)!.investedTotal) : null,
  }));
  const patrimonioSerie = months.filter((m) => snap(m)).map((m) => ({ month: m, valor: n(snap(m)!.netWorth) }));

  return {
    month,
    cards: { saldoTotal, entradasMes: summary.entradas, saidasMes: summary.saidas, sobraMes: summary.sobra },
    indicadores: {
      ...summary.indicadores,
      patrimonioLiquido: { valor: patrimonio, contas: saldoTotal, investimentos: investido, dividas: dividaTotal, tone: netWorthTone(patrimonio) },
    },
    liberdadeDividas: dividaTotal <= 0 ? { mes: month, quita: true } : { mes: projection.freedomMonth, quita: projection.paidOff },
    fluxo,
    gastosPorCategoria: summary.porCategoria,
    orcamento: budget.filter((b) => b.limit > 0),
    dividaSerie,
    metas: goals,
    investidoSerie,
    patrimonioSerie,
    proximasContas: bills,
    contas: accounts.filter((a) => a.active),
  };
}
