"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/permissions";
import { Role } from "@/generated/prisma/enums";
import { OperationError } from "@/lib/crm-operations";
import { setGoal, setYearConfig } from "@/lib/goals";
import { parseMoney } from "@/lib/money";

export type GoalFormState = { error?: string; success?: string };

function refresh() {
  revalidatePath("/metas");
  revalidatePath("/dashboard");
}

export async function saveYearConfigAction(_prev: GoalFormState, formData: FormData): Promise<GoalFormState> {
  const session = await requireRole(Role.ADMIN, Role.GESTOR);
  try {
    await setYearConfig(
      {
        year: Number(formData.get("year")),
        minimumWage: parseMoney(String(formData.get("minimumWage") ?? "")) ?? 0,
        meiAnnualLimit: parseMoney(String(formData.get("meiAnnualLimit") ?? "")) ?? 0,
      },
      { userId: session.userId, source: "usuário", tool: "tela: configuração do ano" },
    );
  } catch (e) {
    if (e instanceof OperationError) return { error: e.message };
    throw e;
  }
  refresh();
  return { success: "Configuração salva." };
}

export async function saveGoalAction(_prev: GoalFormState, formData: FormData): Promise<GoalFormState> {
  const session = await requireRole(Role.ADMIN, Role.GESTOR);
  const automatic = formData.get("automatic") === "on";
  const amount = formData.get("amount");
  try {
    await setGoal(
      {
        type: formData.get("type") === "SEMANAL" ? "SEMANAL" : "MENSAL",
        date: String(formData.get("date") ?? ""),
        amount: amount ? (parseMoney(String(amount)) ?? undefined) : undefined,
        automatic,
      },
      { userId: session.userId, source: "usuário", tool: "tela: definir meta" },
    );
  } catch (e) {
    if (e instanceof OperationError) return { error: e.message };
    throw e;
  }
  refresh();
  return { success: automatic ? "Meta voltou ao cálculo automático." : "Meta salva." };
}
