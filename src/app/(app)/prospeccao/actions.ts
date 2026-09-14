"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/permissions";
import { prospectSchema } from "@/lib/validations";

export type ProspectFormState = {
  error?: string;
  fieldErrors?: Record<string, string>;
};

function extractProspectData(formData: FormData) {
  return {
    name: formData.get("name") || "",
    segment: formData.get("segment") || undefined,
    city: formData.get("city") || undefined,
    contactName: formData.get("contactName") || undefined,
    whatsapp: formData.get("whatsapp") || undefined,
    instagram: formData.get("instagram") || undefined,
    potentialServiceId: formData.get("potentialServiceId") || undefined,
    responsibleId: formData.get("responsibleId") || undefined,
    contactDate: formData.get("contactDate") || undefined,
    result: formData.get("result") || undefined,
    nextContactDate: formData.get("nextContactDate") || undefined,
    notes: formData.get("notes") || undefined,
  };
}

export async function createProspectAction(
  _prevState: ProspectFormState,
  formData: FormData,
): Promise<ProspectFormState> {
  await requireSession();
  const raw = extractProspectData(formData);
  const parsed = prospectSchema.safeParse(raw);

  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      fieldErrors[String(issue.path[0])] = issue.message;
    }
    return { error: "Verifique os campos destacados.", fieldErrors };
  }

  const data = parsed.data;
  const prospect = await prisma.prospectingEntry.create({
    data: {
      name: data.name,
      segment: data.segment || null,
      city: data.city || null,
      contactName: data.contactName || null,
      whatsapp: data.whatsapp || null,
      instagram: data.instagram || null,
      potentialServiceId: data.potentialServiceId || null,
      responsibleId: data.responsibleId || null,
      contactDate: data.contactDate ? new Date(data.contactDate) : null,
      result: data.result || null,
      nextContactDate: data.nextContactDate ? new Date(data.nextContactDate) : null,
      notes: data.notes || null,
    },
  });

  revalidatePath("/prospeccao");
  redirect(`/prospeccao/${prospect.id}`);
}

export async function updateProspectAction(
  prospectId: string,
  _prevState: ProspectFormState,
  formData: FormData,
): Promise<ProspectFormState> {
  await requireSession();
  const raw = extractProspectData(formData);
  const parsed = prospectSchema.safeParse(raw);

  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      fieldErrors[String(issue.path[0])] = issue.message;
    }
    return { error: "Verifique os campos destacados.", fieldErrors };
  }

  const data = parsed.data;
  await prisma.prospectingEntry.update({
    where: { id: prospectId },
    data: {
      name: data.name,
      segment: data.segment || null,
      city: data.city || null,
      contactName: data.contactName || null,
      whatsapp: data.whatsapp || null,
      instagram: data.instagram || null,
      potentialServiceId: data.potentialServiceId || null,
      responsibleId: data.responsibleId || null,
      contactDate: data.contactDate ? new Date(data.contactDate) : null,
      result: data.result || null,
      nextContactDate: data.nextContactDate ? new Date(data.nextContactDate) : null,
      notes: data.notes || null,
    },
  });

  revalidatePath("/prospeccao");
  revalidatePath(`/prospeccao/${prospectId}`);
  redirect(`/prospeccao/${prospectId}`);
}
