"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/permissions";
import { leadSchema } from "@/lib/validations";

export type LeadFormState = {
  error?: string;
  fieldErrors?: Record<string, string>;
};

function extractLeadData(formData: FormData) {
  return {
    name: formData.get("name") || "",
    whatsapp: formData.get("whatsapp") || undefined,
    phone: formData.get("phone") || undefined,
    instagram: formData.get("instagram") || undefined,
    city: formData.get("city") || undefined,
    clientTypeGuess: formData.get("clientTypeGuess") || undefined,
    serviceInterestId: formData.get("serviceInterestId") || undefined,
    origin: formData.get("origin") || undefined,
    responsibleId: formData.get("responsibleId") || undefined,
    temperature: formData.get("temperature") || "MORNO",
    stage: formData.get("stage") || "NOVO_LEAD",
    nextContactDate: formData.get("nextContactDate") || undefined,
    notes: formData.get("notes") || undefined,
  };
}

export async function createLeadAction(
  _prevState: LeadFormState,
  formData: FormData,
): Promise<LeadFormState> {
  await requireSession();
  const raw = extractLeadData(formData);
  const parsed = leadSchema.safeParse(raw);

  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      fieldErrors[String(issue.path[0])] = issue.message;
    }
    return { error: "Verifique os campos destacados.", fieldErrors };
  }

  const data = parsed.data;
  const lead = await prisma.lead.create({
    data: {
      name: data.name,
      whatsapp: data.whatsapp || null,
      phone: data.phone || null,
      instagram: data.instagram || null,
      city: data.city || null,
      clientTypeGuess: data.clientTypeGuess || null,
      serviceInterestId: data.serviceInterestId || null,
      origin: data.origin || null,
      responsibleId: data.responsibleId || null,
      temperature: data.temperature,
      stage: data.stage,
      nextContactDate: data.nextContactDate
        ? new Date(data.nextContactDate)
        : null,
      notes: data.notes || null,
    },
  });

  const fromProspectId = formData.get("fromProspectId");
  if (typeof fromProspectId === "string" && fromProspectId) {
    await prisma.prospectingEntry.update({
      where: { id: fromProspectId },
      data: { convertedLeadId: lead.id },
    });
    revalidatePath("/prospeccao");
    revalidatePath(`/prospeccao/${fromProspectId}`);
  }

  revalidatePath("/leads");
  redirect(`/leads/${lead.id}`);
}

export async function updateLeadAction(
  leadId: string,
  _prevState: LeadFormState,
  formData: FormData,
): Promise<LeadFormState> {
  await requireSession();
  const raw = extractLeadData(formData);
  const parsed = leadSchema.safeParse(raw);

  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      fieldErrors[String(issue.path[0])] = issue.message;
    }
    return { error: "Verifique os campos destacados.", fieldErrors };
  }

  const data = parsed.data;
  await prisma.lead.update({
    where: { id: leadId },
    data: {
      name: data.name,
      whatsapp: data.whatsapp || null,
      phone: data.phone || null,
      instagram: data.instagram || null,
      city: data.city || null,
      clientTypeGuess: data.clientTypeGuess || null,
      serviceInterestId: data.serviceInterestId || null,
      origin: data.origin || null,
      responsibleId: data.responsibleId || null,
      temperature: data.temperature,
      stage: data.stage,
      lastContactDate: new Date(),
      nextContactDate: data.nextContactDate
        ? new Date(data.nextContactDate)
        : null,
      notes: data.notes || null,
    },
  });

  revalidatePath("/leads");
  revalidatePath(`/leads/${leadId}`);
  redirect(`/leads/${leadId}`);
}

export async function markLeadLostAction(leadId: string) {
  await requireSession();
  await prisma.lead.update({
    where: { id: leadId },
    data: { stage: "PERDIDO" },
  });
  revalidatePath("/leads");
  revalidatePath(`/leads/${leadId}`);
}
