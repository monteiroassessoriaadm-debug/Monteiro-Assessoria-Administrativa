"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/permissions";
import { addTimelineEvent } from "@/lib/timeline";
import { mediaContentSchema } from "@/lib/validations";
import { MediaContentStatus } from "@/generated/prisma/enums";

export type MediaContentFormState = {
  error?: string;
  fieldErrors?: Record<string, string>;
};

export async function createMediaContentAction(
  _prevState: MediaContentFormState,
  formData: FormData,
): Promise<MediaContentFormState> {
  const session = await requireSession();

  const parsed = mediaContentSchema.safeParse({
    clientId: formData.get("clientId") || "",
    title: formData.get("title") || "",
    description: formData.get("description") || undefined,
    type: formData.get("type") || undefined,
    platform: formData.get("platform") || undefined,
    scheduledDate: formData.get("scheduledDate") || undefined,
    responsibleId: formData.get("responsibleId") || undefined,
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
  const count = await prisma.mediaContent.count();
  const content = await prisma.mediaContent.create({
    data: {
      number: count + 1,
      clientId: data.clientId,
      title: data.title,
      description: data.description || null,
      type: data.type || null,
      platform: data.platform || null,
      scheduledDate: data.scheduledDate ? new Date(data.scheduledDate) : null,
      responsibleId: data.responsibleId || null,
      notes: data.notes || null,
      createdById: session.userId,
    },
  });

  await addTimelineEvent({
    clientId: data.clientId,
    type: "CONTEUDO_CRIADO",
    description: `Conteúdo de mídia "${content.title}" criado por ${session.name}.`,
    createdById: session.userId,
  });

  revalidatePath("/midia");
  redirect(`/midia/${content.id}`);
}

export async function updateMediaContentAction(
  contentId: string,
  _prevState: MediaContentFormState,
  formData: FormData,
): Promise<MediaContentFormState> {
  await requireSession();

  const parsed = mediaContentSchema.safeParse({
    clientId: formData.get("clientId") || "",
    title: formData.get("title") || "",
    description: formData.get("description") || undefined,
    type: formData.get("type") || undefined,
    platform: formData.get("platform") || undefined,
    scheduledDate: formData.get("scheduledDate") || undefined,
    responsibleId: formData.get("responsibleId") || undefined,
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
  await prisma.mediaContent.update({
    where: { id: contentId },
    data: {
      clientId: data.clientId,
      title: data.title,
      description: data.description || null,
      type: data.type || null,
      platform: data.platform || null,
      scheduledDate: data.scheduledDate ? new Date(data.scheduledDate) : null,
      responsibleId: data.responsibleId || null,
      notes: data.notes || null,
    },
  });

  revalidatePath("/midia");
  revalidatePath(`/midia/${contentId}`);
  redirect(`/midia/${contentId}`);
}

async function transitionStatus(
  contentId: string,
  status: MediaContentStatus,
  describe: (userName: string) => string,
) {
  const session = await requireSession();
  const content = await prisma.mediaContent.findUnique({ where: { id: contentId } });
  if (!content) return;

  await prisma.mediaContent.update({
    where: { id: contentId },
    data: { status },
  });

  await addTimelineEvent({
    clientId: content.clientId,
    type: "CONTEUDO_STATUS",
    description: describe(session.name),
    createdById: session.userId,
  });

  revalidatePath("/midia");
  revalidatePath(`/midia/${contentId}`);
  revalidatePath(`/clientes/${content.clientId}`);
}

export async function startProductionAction(contentId: string) {
  await transitionStatus(
    contentId,
    MediaContentStatus.EM_PRODUCAO,
    (name) => `Conteúdo movido para produção por ${name}.`,
  );
}

export async function sendForApprovalAction(contentId: string) {
  await transitionStatus(
    contentId,
    MediaContentStatus.AGUARDANDO_APROVACAO,
    (name) => `Conteúdo enviado para aprovação por ${name}.`,
  );
}

export async function cancelMediaContentAction(contentId: string) {
  await transitionStatus(
    contentId,
    MediaContentStatus.CANCELADO,
    (name) => `Conteúdo cancelado por ${name}.`,
  );
}

export async function decideMediaContentApprovalAction(
  contentId: string,
  approved: boolean,
  formData: FormData,
) {
  const session = await requireSession();
  const content = await prisma.mediaContent.findUnique({ where: { id: contentId } });
  if (!content) return;

  const approvalNotes = String(formData.get("approvalNotes") || "").trim();

  await prisma.mediaContent.update({
    where: { id: contentId },
    data: {
      status: approved ? MediaContentStatus.APROVADO : MediaContentStatus.REPROVADO,
      approvalNotes: approvalNotes || null,
      approvedById: session.userId,
      approvedAt: new Date(),
    },
  });

  await addTimelineEvent({
    clientId: content.clientId,
    type: "CONTEUDO_STATUS",
    description: `Conteúdo "${content.title}" ${approved ? "aprovado" : "reprovado"} por ${session.name}.${
      approvalNotes ? ` Observação: ${approvalNotes}` : ""
    }`,
    createdById: session.userId,
  });

  revalidatePath("/midia");
  revalidatePath(`/midia/${contentId}`);
  revalidatePath(`/clientes/${content.clientId}`);
}

export async function publishMediaContentAction(contentId: string, formData: FormData) {
  const session = await requireSession();
  const content = await prisma.mediaContent.findUnique({ where: { id: contentId } });
  if (!content) return;

  const link = String(formData.get("link") || "").trim();

  await prisma.mediaContent.update({
    where: { id: contentId },
    data: {
      status: MediaContentStatus.PUBLICADO,
      publishedAt: new Date(),
      link: link || null,
    },
  });

  await addTimelineEvent({
    clientId: content.clientId,
    type: "CONTEUDO_STATUS",
    description: `Conteúdo "${content.title}" publicado por ${session.name}.${
      link ? ` Link: ${link}` : ""
    }`,
    createdById: session.userId,
  });

  revalidatePath("/midia");
  revalidatePath(`/midia/${contentId}`);
  revalidatePath(`/clientes/${content.clientId}`);
}
