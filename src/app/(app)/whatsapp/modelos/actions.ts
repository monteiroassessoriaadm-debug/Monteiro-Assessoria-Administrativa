"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/permissions";
import { Role } from "@/generated/prisma/enums";
import { whatsAppTemplateSchema } from "@/lib/validations";

export type WhatsAppTemplateFormState = {
  error?: string;
  fieldErrors?: Record<string, string>;
};

function extractTemplateData(formData: FormData) {
  return {
    name: formData.get("name") || "",
    category: formData.get("category") || undefined,
    content: formData.get("content") || "",
    active: formData.get("active") === "on",
  };
}

export async function createWhatsAppTemplateAction(
  _prevState: WhatsAppTemplateFormState,
  formData: FormData,
): Promise<WhatsAppTemplateFormState> {
  const session = await requireRole(Role.ADMIN, Role.GESTOR);

  const parsed = whatsAppTemplateSchema.safeParse(extractTemplateData(formData));
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      fieldErrors[String(issue.path[0])] = issue.message;
    }
    return { error: "Verifique os campos destacados.", fieldErrors };
  }

  const data = parsed.data;
  await prisma.whatsAppTemplate.create({
    data: {
      name: data.name,
      category: data.category || null,
      content: data.content,
      active: data.active,
      createdById: session.userId,
    },
  });

  revalidatePath("/whatsapp/modelos");
  redirect("/whatsapp/modelos");
}

export async function updateWhatsAppTemplateAction(
  templateId: string,
  _prevState: WhatsAppTemplateFormState,
  formData: FormData,
): Promise<WhatsAppTemplateFormState> {
  await requireRole(Role.ADMIN, Role.GESTOR);

  const parsed = whatsAppTemplateSchema.safeParse(extractTemplateData(formData));
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      fieldErrors[String(issue.path[0])] = issue.message;
    }
    return { error: "Verifique os campos destacados.", fieldErrors };
  }

  const data = parsed.data;
  await prisma.whatsAppTemplate.update({
    where: { id: templateId },
    data: {
      name: data.name,
      category: data.category || null,
      content: data.content,
      active: data.active,
    },
  });

  revalidatePath("/whatsapp/modelos");
  redirect("/whatsapp/modelos");
}

export async function toggleWhatsAppTemplateActiveAction(templateId: string) {
  await requireRole(Role.ADMIN, Role.GESTOR);
  const template = await prisma.whatsAppTemplate.findUnique({ where: { id: templateId } });
  if (!template) return;

  await prisma.whatsAppTemplate.update({
    where: { id: templateId },
    data: { active: !template.active },
  });

  revalidatePath("/whatsapp/modelos");
}
