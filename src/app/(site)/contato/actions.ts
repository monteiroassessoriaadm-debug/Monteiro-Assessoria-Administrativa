"use server";

import { prisma } from "@/lib/prisma";
import { prospectSchema } from "@/lib/validations";

export type ContatoFormState = {
  error?: string;
  success?: boolean;
};

export async function enviarContatoAction(
  _prevState: ContatoFormState,
  formData: FormData,
): Promise<ContatoFormState> {
  // honeypot — campo invisível que só um robô preencheria
  if (String(formData.get("website") || "").length > 0) {
    return { success: true };
  }

  const parsed = prospectSchema.safeParse({
    name: formData.get("name"),
    whatsapp: formData.get("whatsapp") || undefined,
    potentialServiceId: formData.get("potentialServiceId") || undefined,
    notes: formData.get("notes") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Verifique os campos." };
  }

  const data = parsed.data;

  await prisma.prospectingEntry.create({
    data: {
      name: data.name,
      whatsapp: data.whatsapp || null,
      potentialServiceId: data.potentialServiceId || null,
      notes: data.notes || null,
    },
  });

  return { success: true };
}
