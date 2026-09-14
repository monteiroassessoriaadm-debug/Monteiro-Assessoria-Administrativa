"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/permissions";
import { payableSchema } from "@/lib/validations";
import { PayableStatus } from "@/generated/prisma/enums";

export type PayableFormState = {
  error?: string;
  fieldErrors?: Record<string, string>;
};

export async function createPayableAction(
  _prevState: PayableFormState,
  formData: FormData,
): Promise<PayableFormState> {
  await requireSession();

  const parsed = payableSchema.safeParse({
    description: formData.get("description") || "",
    category: formData.get("category") || undefined,
    supplier: formData.get("supplier") || undefined,
    amount: formData.get("amount") || "",
    dueDate: formData.get("dueDate") || undefined,
    accountId: formData.get("accountId") || undefined,
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
  const count = await prisma.payable.count();
  await prisma.payable.create({
    data: {
      number: count + 1,
      description: data.description,
      category: data.category || null,
      supplier: data.supplier || null,
      amount: data.amount,
      dueDate: data.dueDate ? new Date(data.dueDate) : null,
      accountId: data.accountId || null,
      notes: data.notes || null,
    },
  });

  revalidatePath("/financeiro/pagar");
  redirect("/financeiro/pagar");
}

async function setPayableStatus(payableId: string, status: PayableStatus) {
  await requireSession();
  const payable = await prisma.payable.findUnique({ where: { id: payableId } });
  if (!payable) return;

  await prisma.payable.update({
    where: { id: payableId },
    data: { status, paidAt: status === PayableStatus.PAGO ? new Date() : null },
  });

  revalidatePath("/financeiro/pagar");
  revalidatePath("/financeiro/fluxo-caixa");
}

export async function markPayablePaidAction(payableId: string) {
  await setPayableStatus(payableId, PayableStatus.PAGO);
}

export async function cancelPayableAction(payableId: string) {
  await setPayableStatus(payableId, PayableStatus.CANCELADO);
}
