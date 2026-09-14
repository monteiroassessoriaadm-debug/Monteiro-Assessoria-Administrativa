"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/permissions";
import { Role } from "@/generated/prisma/enums";
import { financialAccountSchema } from "@/lib/validations";

export type FinancialAccountFormState = {
  error?: string;
  fieldErrors?: Record<string, string>;
};

export async function createFinancialAccountAction(
  _prevState: FinancialAccountFormState,
  formData: FormData,
): Promise<FinancialAccountFormState> {
  await requireRole(Role.ADMIN, Role.GESTOR);

  const parsed = financialAccountSchema.safeParse({
    name: formData.get("name") || "",
    type: formData.get("type") || undefined,
    active: formData.get("active") === "on",
  });

  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      fieldErrors[String(issue.path[0])] = issue.message;
    }
    return { error: "Verifique os campos destacados.", fieldErrors };
  }

  const data = parsed.data;
  await prisma.financialAccount.create({
    data: { name: data.name, type: data.type || null, active: data.active },
  });

  revalidatePath("/financeiro/contas");
  return {};
}

export async function toggleFinancialAccountActiveAction(accountId: string) {
  await requireRole(Role.ADMIN, Role.GESTOR);
  const account = await prisma.financialAccount.findUnique({ where: { id: accountId } });
  if (!account) return;

  await prisma.financialAccount.update({
    where: { id: accountId },
    data: { active: !account.active },
  });

  revalidatePath("/financeiro/contas");
}
