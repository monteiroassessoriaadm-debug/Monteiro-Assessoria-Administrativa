"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/permissions";
import { addTimelineEvent } from "@/lib/timeline";
import { quoteSchema } from "@/lib/validations";
import { QuoteStatus } from "@/generated/prisma/enums";
import { formatCurrencyBRL } from "@/lib/utils";

export type QuoteFormState = {
  error?: string;
  fieldErrors?: Record<string, string>;
};

function extractQuoteData(formData: FormData) {
  return {
    clientId: formData.get("clientId") || "",
    paymentTerms: formData.get("paymentTerms") || undefined,
    validUntil: formData.get("validUntil") || undefined,
    notes: formData.get("notes") || undefined,
    items: formData.get("items") || "",
  };
}

function itemsTotal(items: { quantity: number; unitPrice: string }[]) {
  return items.reduce((sum, i) => sum + i.quantity * Number(i.unitPrice), 0);
}

export async function createQuoteAction(
  _prevState: QuoteFormState,
  formData: FormData,
): Promise<QuoteFormState> {
  const session = await requireSession();
  const raw = extractQuoteData(formData);
  const parsed = quoteSchema.safeParse(raw);

  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      fieldErrors[String(issue.path[0])] = issue.message;
    }
    return { error: "Verifique os campos destacados.", fieldErrors };
  }

  const data = parsed.data;
  const count = await prisma.quote.count();

  const quote = await prisma.quote.create({
    data: {
      number: count + 1,
      clientId: data.clientId,
      paymentTerms: data.paymentTerms || null,
      validUntil: data.validUntil ? new Date(data.validUntil) : null,
      notes: data.notes || null,
      createdById: session.userId,
      items: {
        create: data.items.map((item) => ({
          serviceId: item.serviceId || null,
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          termDays: item.termDays ? Number(item.termDays) : null,
        })),
      },
    },
  });

  await addTimelineEvent({
    clientId: data.clientId,
    type: "ORCAMENTO_CRIADO",
    description: `Orçamento #${quote.number} criado por ${session.name} (${formatCurrencyBRL(
      itemsTotal(data.items.map((i) => ({ quantity: i.quantity, unitPrice: i.unitPrice }))),
    )}).`,
    createdById: session.userId,
  });

  revalidatePath("/orcamentos");
  redirect(`/orcamentos/${quote.id}`);
}

export async function updateQuoteAction(
  quoteId: string,
  _prevState: QuoteFormState,
  formData: FormData,
): Promise<QuoteFormState> {
  const session = await requireSession();
  const raw = extractQuoteData(formData);
  const parsed = quoteSchema.safeParse(raw);

  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      fieldErrors[String(issue.path[0])] = issue.message;
    }
    return { error: "Verifique os campos destacados.", fieldErrors };
  }

  const data = parsed.data;

  await prisma.$transaction([
    prisma.quoteItem.deleteMany({ where: { quoteId } }),
    prisma.quote.update({
      where: { id: quoteId },
      data: {
        clientId: data.clientId,
        paymentTerms: data.paymentTerms || null,
        validUntil: data.validUntil ? new Date(data.validUntil) : null,
        notes: data.notes || null,
        items: {
          create: data.items.map((item) => ({
            serviceId: item.serviceId || null,
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            termDays: item.termDays ? Number(item.termDays) : null,
          })),
        },
      },
    }),
  ]);

  await addTimelineEvent({
    clientId: data.clientId,
    type: "ORCAMENTO_ATUALIZADO",
    description: `Orçamento atualizado por ${session.name}.`,
    createdById: session.userId,
  });

  revalidatePath("/orcamentos");
  revalidatePath(`/orcamentos/${quoteId}`);
  redirect(`/orcamentos/${quoteId}`);
}

async function setQuoteStatus(
  quoteId: string,
  status: QuoteStatus,
  extra: Record<string, unknown> = {},
) {
  const session = await requireSession();
  const quote = await prisma.quote.findUnique({ where: { id: quoteId } });
  if (!quote) return;

  await prisma.quote.update({
    where: { id: quoteId },
    data: { status, ...extra },
  });

  await addTimelineEvent({
    clientId: quote.clientId,
    type: "ORCAMENTO_STATUS",
    description: `Orçamento #${quote.number} marcado como ${status} por ${session.name}.`,
    createdById: session.userId,
  });

  revalidatePath("/orcamentos");
  revalidatePath(`/orcamentos/${quoteId}`);
}

export async function markQuoteSentAction(quoteId: string) {
  await setQuoteStatus(quoteId, QuoteStatus.ENVIADO, { sentAt: new Date() });
}

export async function markQuoteViewedAction(quoteId: string) {
  await setQuoteStatus(quoteId, QuoteStatus.VISUALIZADO);
}

export async function markQuoteNegotiatingAction(quoteId: string) {
  await setQuoteStatus(quoteId, QuoteStatus.EM_NEGOCIACAO);
}

export async function approveQuoteAction(quoteId: string) {
  await setQuoteStatus(quoteId, QuoteStatus.APROVADO, { respondedAt: new Date() });
}

export async function rejectQuoteAction(quoteId: string) {
  await setQuoteStatus(quoteId, QuoteStatus.RECUSADO, { respondedAt: new Date() });
}

export async function expireQuoteAction(quoteId: string) {
  await setQuoteStatus(quoteId, QuoteStatus.EXPIRADO);
}
