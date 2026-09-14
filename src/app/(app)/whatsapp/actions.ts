"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/permissions";
import { addTimelineEvent } from "@/lib/timeline";
import { whatsAppMessageSchema } from "@/lib/validations";

export type WhatsAppMessageFormState = {
  error?: string;
  fieldErrors?: Record<string, string>;
};

export async function createWhatsAppMessageAction(
  _prevState: WhatsAppMessageFormState,
  formData: FormData,
): Promise<WhatsAppMessageFormState> {
  const session = await requireSession();

  const parsed = whatsAppMessageSchema.safeParse({
    clientId: formData.get("clientId") || "",
    templateId: formData.get("templateId") || undefined,
    direction: formData.get("direction") || "ENVIADA",
    content: formData.get("content") || "",
    sentAt: formData.get("sentAt") || undefined,
  });

  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      fieldErrors[String(issue.path[0])] = issue.message;
    }
    return { error: "Verifique os campos destacados.", fieldErrors };
  }

  const data = parsed.data;
  await prisma.whatsAppMessage.create({
    data: {
      clientId: data.clientId,
      templateId: data.templateId || null,
      direction: data.direction,
      content: data.content,
      sentAt: data.sentAt ? new Date(data.sentAt) : new Date(),
      createdById: session.userId,
    },
  });

  await addTimelineEvent({
    clientId: data.clientId,
    type: "WHATSAPP_REGISTRADO",
    description: `Mensagem de WhatsApp (${data.direction === "ENVIADA" ? "enviada" : "recebida"}) registrada por ${session.name}.`,
    createdById: session.userId,
  });

  revalidatePath(`/clientes/${data.clientId}`);
  redirect(`/clientes/${data.clientId}`);
}
