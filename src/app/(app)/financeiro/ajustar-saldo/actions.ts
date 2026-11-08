"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/permissions";
import { Role } from "@/generated/prisma/enums";
import { OperationError, adjustBalance } from "@/lib/crm-operations";
import { formatCurrencyBRL } from "@/lib/utils";
import { parseMoney } from "@/lib/money";

export type AdjustBalanceState = { error?: string; success?: string };

export async function adjustBalanceAction(
  _prev: AdjustBalanceState,
  formData: FormData,
): Promise<AdjustBalanceState> {
  const session = await requireRole(Role.ADMIN, Role.GESTOR);
  const accountId = String(formData.get("accountId") ?? "");
  const raw = String(formData.get("realBalance") ?? "");
  const realBalance = parseMoney(raw);

  if (!accountId) return { error: "Escolha a conta." };
  if (realBalance === null) return { error: "Informe quanto tem na conta hoje, como 950,00." };

  try {
    const r = await adjustBalance(
      { accountId, realBalance, reason: String(formData.get("reason") ?? "") },
      { userId: session.userId, source: "usuário", tool: "tela: ajustar saldo" },
    );
    revalidatePath("/dashboard");
    revalidatePath("/financeiro/ajustar-saldo");
    revalidatePath("/financeiro/fluxo-caixa");
    revalidatePath("/financeiro/contas");
    const sinal = r.diferenca > 0 ? "+" : "";
    return {
      success: `${r.conta}: era ${formatCurrencyBRL(r.saldoAnterior)}, agora ${formatCurrencyBRL(r.saldoNovo)} (${sinal}${formatCurrencyBRL(r.diferenca)}).`,
    };
  } catch (e) {
    if (e instanceof OperationError) return { error: e.message };
    throw e;
  }
}
