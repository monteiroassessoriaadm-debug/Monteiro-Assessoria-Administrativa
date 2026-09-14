"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/permissions";
import { addTimelineEvent } from "@/lib/timeline";
import { generateDocumentSchema } from "@/lib/validations";
import { getClientTokens, parseFieldsSchema, renderTemplate } from "@/lib/document-tokens";
import { DocumentStatus } from "@/generated/prisma/enums";

export type GenerateDocumentFormState = {
  error?: string;
  fieldErrors?: Record<string, string>;
};

export async function generateDocumentAction(
  _prevState: GenerateDocumentFormState,
  formData: FormData,
): Promise<GenerateDocumentFormState> {
  const session = await requireSession();

  const parsed = generateDocumentSchema.safeParse({
    clientId: formData.get("clientId") || "",
    templateId: formData.get("templateId") || "",
    title: formData.get("title") || undefined,
    fieldValues: formData.get("fieldValues") || "{}",
  });

  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      fieldErrors[String(issue.path[0])] = issue.message;
    }
    return { error: "Verifique os campos destacados.", fieldErrors };
  }

  const { clientId, templateId, title, fieldValues } = parsed.data;

  const [client, template] = await Promise.all([
    prisma.client.findUnique({ where: { id: clientId } }),
    prisma.documentTemplate.findUnique({ where: { id: templateId } }),
  ]);

  if (!client) {
    return { error: "Cliente não encontrado.", fieldErrors: { clientId: "Selecione um cliente válido." } };
  }
  if (!template) {
    return { error: "Modelo não encontrado.", fieldErrors: { templateId: "Selecione um modelo válido." } };
  }

  const fieldDefs = parseFieldsSchema(template.fieldsSchema);
  const missing = fieldDefs.filter((f) => f.required && !fieldValues[f.key]?.trim());
  if (missing.length > 0) {
    return {
      error: `Preencha os campos obrigatórios: ${missing.map((f) => f.label).join(", ")}.`,
    };
  }

  const tokens = { ...getClientTokens(client), ...fieldValues };
  const renderedContent = renderTemplate(template.content, tokens);

  const count = await prisma.generatedDocument.count();
  const doc = await prisma.generatedDocument.create({
    data: {
      number: count + 1,
      templateId: template.id,
      clientId: client.id,
      title: title?.trim() || template.name,
      status: DocumentStatus.GERADO,
      fieldValues: JSON.stringify(fieldValues),
      renderedContent,
      createdById: session.userId,
    },
  });

  await addTimelineEvent({
    clientId: client.id,
    type: "DOCUMENTO_GERADO",
    description: `Documento "${doc.title}" gerado por ${session.name} (modelo: ${template.name} v${template.version}).`,
    createdById: session.userId,
  });

  revalidatePath("/documentos");
  redirect(`/documentos/${doc.id}`);
}

async function setDocumentStatus(documentId: string, status: DocumentStatus) {
  const session = await requireSession();
  const doc = await prisma.generatedDocument.findUnique({ where: { id: documentId } });
  if (!doc) return;

  await prisma.generatedDocument.update({ where: { id: documentId }, data: { status } });

  await addTimelineEvent({
    clientId: doc.clientId,
    type: "DOCUMENTO_STATUS",
    description: `Documento "${doc.title}" marcado como ${status} por ${session.name}.`,
    createdById: session.userId,
  });

  revalidatePath("/documentos");
  revalidatePath(`/documentos/${documentId}`);
}

export async function markDocumentSentAction(documentId: string) {
  await setDocumentStatus(documentId, DocumentStatus.ENVIADO);
}

export async function markDocumentAwaitingSignatureAction(documentId: string) {
  await setDocumentStatus(documentId, DocumentStatus.AGUARDANDO_ASSINATURA);
}

export async function markDocumentSignedAction(documentId: string) {
  await setDocumentStatus(documentId, DocumentStatus.ASSINADO);
}

export async function cancelDocumentAction(documentId: string) {
  await setDocumentStatus(documentId, DocumentStatus.CANCELADO);
}
