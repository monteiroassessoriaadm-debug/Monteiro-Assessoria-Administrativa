"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/permissions";
import { addTimelineEvent } from "@/lib/timeline";
import { receivableSchema } from "@/lib/validations";
import { ReceivableStatus } from "@/generated/prisma/enums";

export type ReceivableFormState = {
  error?: string;
  fieldErrors?: Record<string, string>;
};

export async function createReceivableAction(
  _prevState: ReceivableFormState,
  formData: FormData,
): Promise<ReceivableFormState> {
  const session = await requireSession();

  const parsed = receivableSchema.safeParse({
    clientId: formData.get("clientId") || undefined,
    description: formData.get("description") || "",
    amount: formData.get("amount") || "",
    dueDate: formData.get("dueDate") || undefined,
    accountId: formData.get("accountId") || undefined,
    paymentMethod: formData.get("paymentMethod") || undefined,
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
  const count = await prisma.receivable.count();
  const receivable = await prisma.receivable.create({
    data: {
      number: count + 1,
      clientId: data.clientId || null,
      description: data.description,
      amount: data.amount,
      dueDate: data.dueDate ? new Date(data.dueDate) : null,
      accountId: data.accountId || null,
      paymentMethod: data.paymentMethod || null,
      notes: data.notes || null,
      createdById: session.userId,
    },
  });

  if (data.clientId) {
    await addTimelineEvent({
      clientId: data.clientId,
      type: "CONTA_A_RECEBER_CRIADA",
      description: `Conta a receber #${receivable.number} criada por ${session.name}.`,
      createdById: session.userId,
    });
  }

  revalidatePath("/financeiro/receber");
  redirect("/financeiro/receber");
}

async function setReceivableStatus(receivableId: string, status: ReceivableStatus) {
  const session = await requireSession();
  const receivable = await prisma.receivable.findUnique({ where: { id: receivableId } });
  if (!receivable) return;

  await prisma.receivable.update({
    where: { id: receivableId },
    data: {
      status,
      receivedAt: status === ReceivableStatus.RECEBIDO ? new Date() : null,
    },
  });

  if (receivable.clientId) {
    await addTimelineEvent({
      clientId: receivable.clientId,
      type: "CONTA_A_RECEBER_STATUS",
      description: `Conta a receber #${receivable.number} marcada como ${status} por ${session.name}.`,
      createdById: session.userId,
    });
  }

  revalidatePath("/financeiro/receber");
  revalidatePath("/financeiro/fluxo-caixa");
}

export async function markReceivableReceivedAction(receivableId: string) {
  await setReceivableStatus(receivableId, ReceivableStatus.RECEBIDO);
}

export async function cancelReceivableAction(receivableId: string) {
  await setReceivableStatus(receivableId, ReceivableStatus.CANCELADO);
}
