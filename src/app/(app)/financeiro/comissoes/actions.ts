"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/permissions";
import { Role } from "@/generated/prisma/enums";
import { addTimelineEvent } from "@/lib/timeline";
import { commissionSchema } from "@/lib/validations";
import { CommissionStatus } from "@/generated/prisma/enums";

export type CommissionFormState = {
  error?: string;
  fieldErrors?: Record<string, string>;
};

export async function createCommissionAction(
  _prevState: CommissionFormState,
  formData: FormData,
): Promise<CommissionFormState> {
  const session = await requireRole(Role.ADMIN, Role.GESTOR);

  const parsed = commissionSchema.safeParse({
    userId: formData.get("userId") || "",
    clientId: formData.get("clientId") || undefined,
    category: formData.get("category") || "COMISSAO",
    baseAmount: formData.get("baseAmount") || undefined,
    percentage: formData.get("percentage") || undefined,
    amount: formData.get("amount") || "",
    date: formData.get("date") || undefined,
    notes: formData.get("notes") || undefined,
  });

  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      fieldErrors[String(issue.path[0])] = issue.message;
    }
    return { error: "Verifique os campos destacados.", fieldErrors };
  }

  const data = parsed.data;
  const commission = await prisma.commission.create({
    data: {
      userId: data.userId,
      clientId: data.clientId || null,
      category: data.category,
      baseAmount: data.baseAmount || null,
      percentage: data.percentage || null,
      amount: data.amount,
      date: data.date ? new Date(data.date) : new Date(),
      notes: data.notes || null,
      createdById: session.userId,
    },
    include: { user: true },
  });

  if (data.clientId) {
    await addTimelineEvent({
      clientId: data.clientId,
      type: "COMISSAO_LANCADA",
      description: `Lançamento financeiro (${data.category}) de ${commission.user.name} criado por ${session.name}.`,
      createdById: session.userId,
    });
  }

  revalidatePath("/financeiro/comissoes");
  redirect("/financeiro/comissoes");
}

export async function markCommissionPaidAction(commissionId: string) {
  await requireRole(Role.ADMIN, Role.GESTOR);
  const commission = await prisma.commission.findUnique({ where: { id: commissionId } });
  if (!commission) return;

  await prisma.commission.update({
    where: { id: commissionId },
    data: { status: CommissionStatus.PAGO, paidAt: new Date() },
  });

  revalidatePath("/financeiro/comissoes");
  revalidatePath("/financeiro/fluxo-caixa");
}
