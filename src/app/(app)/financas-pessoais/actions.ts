"use server";

import { revalidatePath } from "next/cache";
import { requirePfOwner } from "@/lib/pf/access";
import { OperationError } from "@/lib/crm-operations";
import { parseMoney } from "@/lib/money";
import * as pf from "@/lib/pf/service";
import type { PfState } from "@/components/pf/pf-form";
import type { PfAccountType, PfDebtStatus, PfDebtType, PfLiquidity, PfMovementType } from "@/generated/prisma/enums";

// Toda ação confere de novo se quem chama é o dono: esconder o menu não basta,
// uma ação do servidor pode ser chamada direto.

async function act(fn: () => Promise<unknown>, success: string): Promise<PfState> {
  await requirePfOwner();
  try {
    await fn();
  } catch (e) {
    if (e instanceof OperationError) return { error: e.message, at: Date.now() };
    throw e;
  }
  revalidatePath("/financas-pessoais", "layout");
  return { success, at: Date.now() };
}

const str = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();
const opt = (fd: FormData, k: string) => str(fd, k) || null;
const money = (fd: FormData, k: string) => parseMoney(str(fd, k)) ?? NaN;
const moneyOpt = (fd: FormData, k: string) => (str(fd, k) ? (parseMoney(str(fd, k)) ?? NaN) : undefined);
const int = (fd: FormData, k: string) => (str(fd, k) ? Number.parseInt(str(fd, k), 10) : undefined);
const bool = (fd: FormData, k: string) => fd.get(k) === "on";
const num = (fd: FormData, k: string) => (str(fd, k) ? Number(str(fd, k).replace(",", ".")) : undefined);

// ---------- Contas, categorias e cartões ----------

export async function saveAccountAction(_p: PfState, fd: FormData) {
  return act(
    () =>
      pf.saveAccount({
        id: opt(fd, "id") ?? undefined,
        name: str(fd, "name"),
        type: (str(fd, "type") || "BANCO") as PfAccountType,
        openingBalance: parseMoney(str(fd, "openingBalance")) ?? 0,
        active: fd.has("activeField") ? bool(fd, "active") : true,
      }),
    "Conta salva.",
  );
}

export async function saveCategoryAction(_p: PfState, fd: FormData) {
  return act(
    () =>
      pf.saveCategory({
        id: opt(fd, "id") ?? undefined,
        name: str(fd, "name"),
        type: (str(fd, "type") || "SAIDA") as PfMovementType,
        essential: bool(fd, "essential"),
        saving: bool(fd, "saving"),
        active: fd.has("activeField") ? bool(fd, "active") : true,
      }),
    "Categoria salva.",
  );
}

export async function saveCardAction(_p: PfState, fd: FormData) {
  return act(
    () =>
      pf.saveCard({
        id: opt(fd, "id") ?? undefined,
        name: str(fd, "name"),
        limit: parseMoney(str(fd, "limit")) ?? 0,
        closingDay: int(fd, "closingDay") ?? 0,
        dueDay: int(fd, "dueDay") ?? 0,
        active: fd.has("activeField") ? bool(fd, "active") : true,
      }),
    "Cartão salvo.",
  );
}

export async function payInvoiceAction(_p: PfState, fd: FormData) {
  return act(
    () =>
      pf.payInvoice({
        cardId: str(fd, "cardId"),
        invoiceMonth: str(fd, "invoiceMonth"),
        accountId: str(fd, "accountId"),
        amount: money(fd, "amount"),
        date: opt(fd, "date") ?? undefined,
      }),
    "Pagamento da fatura registrado.",
  );
}

// ---------- Lançamentos ----------

export async function createTransactionAction(_p: PfState, fd: FormData) {
  const target = str(fd, "target"); // "conta:ID" ou "cartao:ID"
  const [kind, id] = target.split(":");
  return act(
    () =>
      pf.createTransaction({
        type: (str(fd, "type") || "SAIDA") as PfMovementType,
        date: str(fd, "date"),
        amount: money(fd, "amount"),
        description: str(fd, "description"),
        categoryId: str(fd, "categoryId"),
        accountId: kind === "conta" ? id : null,
        cardId: kind === "cartao" ? id : null,
        installments: int(fd, "installments") ?? 1,
        notes: opt(fd, "notes"),
      }),
    "Lançamento salvo.",
  );
}

export async function updateTransactionAction(_p: PfState, fd: FormData) {
  return act(
    () =>
      pf.updateTransaction(str(fd, "id"), {
        date: str(fd, "date") || undefined,
        amount: moneyOpt(fd, "amount"),
        description: str(fd, "description") || undefined,
        categoryId: str(fd, "categoryId") || undefined,
        accountId: str(fd, "accountId") || undefined,
        notes: fd.has("notes") ? opt(fd, "notes") : undefined,
      }),
    "Lançamento atualizado.",
  );
}

export async function deleteTransactionAction(_p: PfState, fd: FormData) {
  return act(() => pf.deleteTransaction(str(fd, "id"), bool(fd, "all") || str(fd, "all") === "1"), "Lançamento excluído.");
}

export async function importWithdrawalAction(_p: PfState, fd: FormData) {
  return act(() => pf.importWithdrawal(str(fd, "payableId"), str(fd, "accountId")), "Retirada importada como entrada pessoal.");
}

// ---------- Contas fixas ----------

export async function saveBillAction(_p: PfState, fd: FormData) {
  return act(
    () =>
      pf.saveBill({
        id: opt(fd, "id") ?? undefined,
        name: str(fd, "name"),
        amount: money(fd, "amount"),
        dueDay: int(fd, "dueDay") ?? 0,
        categoryId: str(fd, "categoryId"),
        accountId: opt(fd, "accountId"),
        active: fd.has("activeField") ? bool(fd, "active") : true,
      }),
    "Conta fixa salva. As do mês são geradas sozinhas.",
  );
}

export async function markBillPaidAction(_p: PfState, fd: FormData) {
  return act(
    () => pf.markBillPaid(str(fd, "id"), { accountId: opt(fd, "accountId"), date: opt(fd, "date") ?? undefined, amount: moneyOpt(fd, "amount") }),
    "Conta marcada como paga e lançada.",
  );
}

// ---------- Dívidas ----------

function debtFields(fd: FormData) {
  return {
    creditor: str(fd, "creditor"),
    type: (str(fd, "type") || "OUTRO") as PfDebtType,
    balance: parseMoney(str(fd, "balance")) ?? NaN,
    monthlyRate: num(fd, "monthlyRate") ?? 0,
    installment: parseMoney(str(fd, "installment")) ?? 0,
    remainingInstallments: int(fd, "remainingInstallments") ?? null,
    dueDay: int(fd, "dueDay") ?? null,
    status: (str(fd, "status") || "EM_DIA") as PfDebtStatus,
    daysLate: int(fd, "daysLate") ?? 0,
    notes: opt(fd, "notes"),
  };
}

export async function createDebtAction(_p: PfState, fd: FormData) {
  return act(() => pf.createDebt(debtFields(fd)), "Dívida cadastrada.");
}

export async function updateDebtAction(_p: PfState, fd: FormData) {
  return act(() => pf.updateDebt(str(fd, "id"), debtFields(fd)), "Dívida atualizada.");
}

export async function deleteDebtAction(_p: PfState, fd: FormData) {
  return act(() => pf.deleteDebt(str(fd, "id")), "Dívida excluída.");
}

export async function payDebtAction(_p: PfState, fd: FormData) {
  return act(
    () => pf.payDebt(str(fd, "id"), { amount: money(fd, "amount"), accountId: str(fd, "accountId"), date: opt(fd, "date") ?? undefined }),
    "Pagamento lançado e saldo da dívida atualizado.",
  );
}

export async function addNegotiationAction(_p: PfState, fd: FormData) {
  return act(
    () => pf.addNegotiation(str(fd, "debtId"), { date: opt(fd, "date") ?? undefined, proposal: str(fd, "proposal"), result: opt(fd, "result") }),
    "Negociação registrada.",
  );
}

// ---------- Orçamento, metas e investimentos ----------

export async function setBudgetAction(_p: PfState, fd: FormData) {
  return act(
    () => pf.setBudget({ month: opt(fd, "month") ?? undefined, categoryId: str(fd, "categoryId"), limit: parseMoney(str(fd, "limit")) ?? 0 }),
    "Limite salvo.",
  );
}

export async function saveGoalAction(_p: PfState, fd: FormData) {
  return act(
    () =>
      pf.saveGoal({
        id: opt(fd, "id") ?? undefined,
        name: fd.has("name") ? str(fd, "name") : undefined,
        target: moneyOpt(fd, "target"),
        current: moneyOpt(fd, "current"),
        deadline: fd.has("deadline") ? opt(fd, "deadline") : undefined,
        done: fd.has("doneField") ? bool(fd, "done") : undefined,
      }),
    "Meta salva.",
  );
}

export async function depositGoalAction(_p: PfState, fd: FormData) {
  return act(async () => {
    const goal = (await pf.getGoalsProgress()).find((g) => g.id === str(fd, "id"));
    if (!goal) throw new OperationError("Meta não encontrada.");
    const value = money(fd, "amount");
    if (!Number.isFinite(value) || value === 0) throw new OperationError("Informe o valor (negativo para retirar).");
    await pf.saveGoal({ id: goal.id, current: Math.max(0, goal.current + value) });
  }, "Valor da meta atualizado.");
}

export async function deleteGoalAction(_p: PfState, fd: FormData) {
  return act(() => pf.deleteGoal(str(fd, "id")), "Meta excluída.");
}

export async function saveInvestmentAction(_p: PfState, fd: FormData) {
  const isNew = !str(fd, "id");
  return act(
    () =>
      pf.saveInvestment({
        id: opt(fd, "id") ?? undefined,
        name: fd.has("name") ? str(fd, "name") : undefined,
        institution: fd.has("institution") ? opt(fd, "institution") : undefined,
        applied: moneyOpt(fd, "applied"),
        current: moneyOpt(fd, "current"),
        liquidity: (str(fd, "liquidity") || undefined) as PfLiquidity | undefined,
        appliedAt: str(fd, "appliedAt") || undefined,
        maturityDate: fd.has("maturityDate") ? opt(fd, "maturityDate") : undefined,
        redeemed: fd.has("redeemedField") ? bool(fd, "redeemed") : undefined,
        fromAccountId: isNew ? opt(fd, "fromAccountId") : null,
      }),
    isNew ? "Investimento registrado." : "Investimento atualizado.",
  );
}
