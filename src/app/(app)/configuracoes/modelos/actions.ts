"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/permissions";
import { Role } from "@/generated/prisma/enums";
import { documentTemplateSchema } from "@/lib/validations";

export type TemplateFormState = {
  error?: string;
  fieldErrors?: Record<string, string>;
};

function extractTemplateData(formData: FormData) {
  return {
    name: formData.get("name") || "",
    category: formData.get("category") || undefined,
    content: formData.get("content") || "",
    headerNote: formData.get("headerNote") || undefined,
    footerNote: formData.get("footerNote") || undefined,
    fieldsSchema: formData.get("fieldsSchema") || "[]",
  };
}

export async function createTemplateAction(
  _prevState: TemplateFormState,
  formData: FormData,
): Promise<TemplateFormState> {
  const session = await requireRole(Role.ADMIN);
  const raw = extractTemplateData(formData);
  const parsed = documentTemplateSchema.safeParse(raw);

  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      fieldErrors[String(issue.path[0])] = issue.message;
    }
    return { error: "Verifique os campos destacados.", fieldErrors };
  }

  const data = parsed.data;
  const id = randomUUID();

  await prisma.documentTemplate.create({
    data: {
      id,
      baseTemplateId: id,
      name: data.name,
      category: data.category || null,
      content: data.content,
      headerNote: data.headerNote || null,
      footerNote: data.footerNote || null,
      fieldsSchema: JSON.stringify(data.fieldsSchema),
      createdById: session.userId,
    },
  });

  revalidatePath("/configuracoes/modelos");
  redirect("/configuracoes/modelos");
}

export async function updateTemplateAction(
  templateId: string,
  _prevState: TemplateFormState,
  formData: FormData,
): Promise<TemplateFormState> {
  const session = await requireRole(Role.ADMIN);
  const current = await prisma.documentTemplate.findUnique({ where: { id: templateId } });
  if (!current) {
    return { error: "Modelo não encontrado." };
  }

  const raw = extractTemplateData(formData);
  const parsed = documentTemplateSchema.safeParse(raw);

  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      fieldErrors[String(issue.path[0])] = issue.message;
    }
    return { error: "Verifique os campos destacados.", fieldErrors };
  }

  const data = parsed.data;

  // A próxima versão é sempre maior que qualquer versão já existente no
  // grupo — editar uma versão antiga (não a mais recente) não pode gerar
  // um número de versão que já exista em outra linha do mesmo modelo.
  const highestVersion = await prisma.documentTemplate.aggregate({
    where: { baseTemplateId: current.baseTemplateId },
    _max: { version: true },
  });
  const nextVersion = (highestVersion._max.version ?? current.version) + 1;

  // Editar sempre cria uma nova versão — documentos já gerados continuam
  // vinculados à versão do modelo utilizada na época.
  await prisma.$transaction([
    prisma.documentTemplate.update({
      where: { id: current.id },
      data: { active: false },
    }),
    prisma.documentTemplate.create({
      data: {
        baseTemplateId: current.baseTemplateId,
        version: nextVersion,
        name: data.name,
        category: data.category || null,
        content: data.content,
        headerNote: data.headerNote || null,
        footerNote: data.footerNote || null,
        fieldsSchema: JSON.stringify(data.fieldsSchema),
        active: true,
        createdById: session.userId,
      },
    }),
  ]);

  revalidatePath("/configuracoes/modelos");
  redirect("/configuracoes/modelos");
}

export async function duplicateTemplateAction(templateId: string) {
  await requireRole(Role.ADMIN);
  const template = await prisma.documentTemplate.findUnique({ where: { id: templateId } });
  if (!template) return;

  const id = randomUUID();
  await prisma.documentTemplate.create({
    data: {
      id,
      baseTemplateId: id,
      name: `${template.name} (cópia)`,
      category: template.category,
      content: template.content,
      headerNote: template.headerNote,
      footerNote: template.footerNote,
      fieldsSchema: template.fieldsSchema,
      active: true,
    },
  });

  revalidatePath("/configuracoes/modelos");
}

export async function toggleTemplateActiveAction(templateId: string) {
  await requireRole(Role.ADMIN);
  const template = await prisma.documentTemplate.findUnique({ where: { id: templateId } });
  if (!template) return;

  await prisma.documentTemplate.update({
    where: { id: templateId },
    data: { active: !template.active },
  });

  revalidatePath("/configuracoes/modelos");
}
