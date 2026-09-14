"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/permissions";
import { addTimelineEvent } from "@/lib/timeline";
import { proposalSchema } from "@/lib/validations";
import { ProposalStatus } from "@/generated/prisma/enums";

export type ProposalFormState = {
  error?: string;
  fieldErrors?: Record<string, string>;
};

function extractProposalData(formData: FormData) {
  return {
    clientId: formData.get("clientId") || "",
    leadId: formData.get("leadId") || undefined,
    serviceId: formData.get("serviceId") || undefined,
    demand: formData.get("demand") || "",
    solution: formData.get("solution") || "",
    scope: formData.get("scope") || undefined,
    termText: formData.get("termText") || undefined,
    investment: formData.get("investment") || undefined,
    paymentTerms: formData.get("paymentTerms") || undefined,
    validUntil: formData.get("validUntil") || undefined,
    notes: formData.get("notes") || undefined,
  };
}

export async function createProposalAction(
  _prevState: ProposalFormState,
  formData: FormData,
): Promise<ProposalFormState> {
  const session = await requireSession();
  const raw = extractProposalData(formData);
  const parsed = proposalSchema.safeParse(raw);

  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      fieldErrors[String(issue.path[0])] = issue.message;
    }
    return { error: "Verifique os campos destacados.", fieldErrors };
  }

  const data = parsed.data;
  const count = await prisma.proposal.count();

  const proposal = await prisma.proposal.create({
    data: {
      number: count + 1,
      clientId: data.clientId,
      leadId: data.leadId || null,
      serviceId: data.serviceId || null,
      demand: data.demand,
      solution: data.solution,
      scope: data.scope || null,
      termText: data.termText || null,
      investment: data.investment || null,
      paymentTerms: data.paymentTerms || null,
      validUntil: data.validUntil ? new Date(data.validUntil) : null,
      notes: data.notes || null,
      createdById: session.userId,
    },
  });

  await addTimelineEvent({
    clientId: data.clientId,
    type: "PROPOSTA_CRIADA",
    description: `Proposta #${proposal.number} criada por ${session.name}.`,
    createdById: session.userId,
  });

  revalidatePath("/propostas");
  redirect(`/propostas/${proposal.id}`);
}

export async function updateProposalAction(
  proposalId: string,
  _prevState: ProposalFormState,
  formData: FormData,
): Promise<ProposalFormState> {
  const session = await requireSession();
  const raw = extractProposalData(formData);
  const parsed = proposalSchema.safeParse(raw);

  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      fieldErrors[String(issue.path[0])] = issue.message;
    }
    return { error: "Verifique os campos destacados.", fieldErrors };
  }

  const data = parsed.data;
  await prisma.proposal.update({
    where: { id: proposalId },
    data: {
      clientId: data.clientId,
      leadId: data.leadId || null,
      serviceId: data.serviceId || null,
      demand: data.demand,
      solution: data.solution,
      scope: data.scope || null,
      termText: data.termText || null,
      investment: data.investment || null,
      paymentTerms: data.paymentTerms || null,
      validUntil: data.validUntil ? new Date(data.validUntil) : null,
      notes: data.notes || null,
    },
  });

  await addTimelineEvent({
    clientId: data.clientId,
    type: "PROPOSTA_ATUALIZADA",
    description: `Proposta atualizada por ${session.name}.`,
    createdById: session.userId,
  });

  revalidatePath("/propostas");
  revalidatePath(`/propostas/${proposalId}`);
  redirect(`/propostas/${proposalId}`);
}

async function setProposalStatus(proposalId: string, status: ProposalStatus) {
  const session = await requireSession();
  const proposal = await prisma.proposal.findUnique({ where: { id: proposalId } });
  if (!proposal) return;

  await prisma.proposal.update({ where: { id: proposalId }, data: { status } });

  await addTimelineEvent({
    clientId: proposal.clientId,
    type: "PROPOSTA_STATUS",
    description: `Proposta #${proposal.number} marcada como ${status} por ${session.name}.`,
    createdById: session.userId,
  });

  revalidatePath("/propostas");
  revalidatePath(`/propostas/${proposalId}`);
}

export async function markProposalSentAction(proposalId: string) {
  await setProposalStatus(proposalId, ProposalStatus.ENVIADA);
}

export async function approveProposalAction(proposalId: string) {
  await setProposalStatus(proposalId, ProposalStatus.APROVADA);
}

export async function rejectProposalAction(proposalId: string) {
  await setProposalStatus(proposalId, ProposalStatus.RECUSADA);
}

export async function expireProposalAction(proposalId: string) {
  await setProposalStatus(proposalId, ProposalStatus.EXPIRADA);
}
