"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/permissions";
import { payableSchema } from "@/lib/validations";
import { PayableStatus } from "@/generated/prisma/enums";
import { OperationError, cancelPayable, reverseMovement, updatePayable } from "@/lib/crm-operations";

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

export async function updatePayableAction(
  payableId: string,
  _prevState: PayableFormState,
  formData: FormData,
): Promise<PayableFormState> {
  const session = await requireSession();

  // Conta já paga trava valor e vencimento: campo desabilitado não vem no formulário.
  const amount = formData.get("amount") as string | null;
  const dueDate = formData.get("dueDate") as string | null;
  if (amount !== null && !/^\d+(\.\d{1,2})?$/.test(amount)) {
    return { error: "Verifique os campos destacados.", fieldErrors: { amount: "Informe um valor numérico válido." } };
  }

  try {
    await updatePayable(
      payableId,
      {
        description: String(formData.get("description") ?? ""),
        amount: amount === null ? undefined : Number(amount),
        dueDate: dueDate === null ? undefined : dueDate,
        supplier: String(formData.get("supplier") ?? ""),
        category: String(formData.get("category") ?? ""),
        accountId: String(formData.get("accountId") ?? ""),
        notes: String(formData.get("notes") ?? ""),
      },
      { userId: session.userId, source: "usuário", tool: "tela: editar conta a pagar" },
    );
  } catch (e) {
    if (e instanceof OperationError) return { error: e.message };
    throw e;
  }

  revalidatePath("/financeiro/pagar");
  revalidatePath("/financeiro/fluxo-caixa");
  redirect("/financeiro/pagar");
}

async function refresh() {
  revalidatePath("/financeiro/pagar");
  revalidatePath("/financeiro/receber");
  revalidatePath("/financeiro/fluxo-caixa");
  revalidatePath("/dashboard");
}

export async function markPayablePaidAction(payableId: string) {
  await requireSession();
  const payable = await prisma.payable.findUnique({ where: { id: payableId } });
  if (!payable) return;

  await prisma.payable.update({
    where: { id: payableId },
    data: { status: PayableStatus.PAGO, paidAt: new Date() },
  });
  await refresh();
}

/** Devolve a mensagem de erro para a tela, ou null se deu certo. */
export async function cancelPayableAction(payableId: string): Promise<string | null> {
  const session = await requireSession();
  try {
    await cancelPayable(payableId, undefined, { userId: session.userId, source: "usuário", tool: "tela: cancelar conta a pagar" });
  } catch (e) {
    if (e instanceof OperationError) return e.message;
    throw e;
  }
  await refresh();
  return null;
}

export async function reversePayableAction(payableId: string): Promise<string | null> {
  const session = await requireSession();
  try {
    await reverseMovement("saida", payableId, {}, { userId: session.userId, source: "usuário", tool: "tela: estornar saída" });
  } catch (e) {
    if (e instanceof OperationError) return e.message;
    throw e;
  }
  await refresh();
  return null;
}
