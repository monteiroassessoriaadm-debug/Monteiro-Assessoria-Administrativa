"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/permissions";
import { addTimelineEvent } from "@/lib/timeline";
import { receivableSchema } from "@/lib/validations";
import { ReceivableStatus } from "@/generated/prisma/enums";
import { OperationError, cancelReceivable, reverseMovement, updateReceivable } from "@/lib/crm-operations";

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
    category: formData.get("category") || undefined,
    businessLine: formData.get("businessLine") || undefined,
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
      category: data.category || null,
      businessLine: data.businessLine || null,
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

export async function updateReceivableAction(
  receivableId: string,
  _prevState: ReceivableFormState,
  formData: FormData,
): Promise<ReceivableFormState> {
  const session = await requireSession();

  // Conta já recebida trava valor e vencimento: campo desabilitado não vem no formulário.
  const amount = formData.get("amount") as string | null;
  const dueDate = formData.get("dueDate") as string | null;
  if (amount !== null && !/^\d+(\.\d{1,2})?$/.test(amount)) {
    return { error: "Verifique os campos destacados.", fieldErrors: { amount: "Informe um valor numérico válido." } };
  }

  try {
    await updateReceivable(
      receivableId,
      {
        description: String(formData.get("description") ?? ""),
        amount: amount === null ? undefined : Number(amount),
        dueDate: dueDate === null ? undefined : dueDate,
        clientId: String(formData.get("clientId") ?? ""),
        accountId: String(formData.get("accountId") ?? ""),
        paymentMethod: String(formData.get("paymentMethod") ?? ""),
        category: String(formData.get("category") ?? ""),
        businessLine: String(formData.get("businessLine") ?? ""),
        notes: String(formData.get("notes") ?? ""),
      },
      { userId: session.userId, source: "usuário", tool: "tela: editar conta a receber" },
    );
  } catch (e) {
    if (e instanceof OperationError) return { error: e.message };
    throw e;
  }

  revalidatePath("/financeiro/receber");
  revalidatePath("/financeiro/fluxo-caixa");
  revalidatePath("/dashboard");
  redirect("/financeiro/receber");
}

async function refresh() {
  revalidatePath("/financeiro/receber");
  revalidatePath("/financeiro/pagar");
  revalidatePath("/financeiro/fluxo-caixa");
  revalidatePath("/dashboard");
}

export async function markReceivableReceivedAction(receivableId: string) {
  const session = await requireSession();
  const receivable = await prisma.receivable.findUnique({ where: { id: receivableId } });
  if (!receivable) return;

  await prisma.receivable.update({
    where: { id: receivableId },
    data: { status: ReceivableStatus.RECEBIDO, receivedAt: new Date() },
  });

  if (receivable.clientId) {
    await addTimelineEvent({
      clientId: receivable.clientId,
      type: "CONTA_A_RECEBER_STATUS",
      description: `Conta a receber #${receivable.number} marcada como RECEBIDO por ${session.name}.`,
      createdById: session.userId,
    });
  }
  await refresh();
}

/** Devolve a mensagem de erro para a tela, ou null se deu certo. */
export async function cancelReceivableAction(receivableId: string): Promise<string | null> {
  const session = await requireSession();
  try {
    await cancelReceivable(receivableId, undefined, { userId: session.userId, source: "usuário", tool: "tela: cancelar conta a receber" });
  } catch (e) {
    if (e instanceof OperationError) return e.message;
    throw e;
  }
  await refresh();
  return null;
}

export async function reverseReceivableAction(receivableId: string): Promise<string | null> {
  const session = await requireSession();
  try {
    await reverseMovement("entrada", receivableId, {}, { userId: session.userId, source: "usuário", tool: "tela: estornar entrada" });
  } catch (e) {
    if (e instanceof OperationError) return e.message;
    throw e;
  }
  await refresh();
  return null;
}
