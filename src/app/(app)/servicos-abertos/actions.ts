"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/permissions";
import { addTimelineEvent } from "@/lib/timeline";
import { parseChecklistTemplate } from "@/lib/checklist";
import { serviceInstanceEditSchema } from "@/lib/validations";
import { ServiceInstanceStatus } from "@/generated/prisma/enums";

export type ServiceInstanceFormState = {
  error?: string;
  fieldErrors?: Record<string, string>;
};

function addDays(date: Date, days: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

/** Abre um serviço para cada item do orçamento aprovado, com checklist do catálogo. */
export async function openServicesFromQuoteAction(quoteId: string) {
  const session = await requireSession();

  const quote = await prisma.quote.findUnique({
    where: { id: quoteId },
    include: { items: { include: { service: true } } },
  });
  if (!quote || quote.status !== "APROVADO") return;

  const existing = await prisma.serviceInstance.count({ where: { quoteId } });
  if (existing > 0) return; // evita abrir duplicado se já foi aberto

  const count = await prisma.serviceInstance.count();
  let created = 0;

  for (const item of quote.items) {
    const number = count + created + 1;
    const dueDate = item.termDays ? addDays(new Date(), item.termDays) : null;

    const instance = await prisma.serviceInstance.create({
      data: {
        number,
        title: item.description,
        clientId: quote.clientId,
        serviceId: item.serviceId,
        quoteId: quote.id,
        price: item.unitPrice,
        dueDate,
        responsibleId: item.service?.defaultResponsibleId ?? null,
        createdById: session.userId,
        checklistItems: {
          create: parseChecklistTemplate(item.service?.checklistTemplate).map((desc, idx) => ({
            description: desc,
            order: idx,
          })),
        },
      },
    });
    created += 1;

    await addTimelineEvent({
      clientId: quote.clientId,
      type: "SERVICO_ABERTO",
      description: `Serviço "${instance.title}" aberto a partir do orçamento #${quote.number} por ${session.name}.`,
      createdById: session.userId,
    });
  }

  revalidatePath("/servicos-abertos");
  revalidatePath(`/orcamentos/${quoteId}`);
  revalidatePath(`/clientes/${quote.clientId}`);
}

/** Abre um serviço a partir de uma proposta aprovada. */
export async function openServiceFromProposalAction(proposalId: string) {
  const session = await requireSession();

  const proposal = await prisma.proposal.findUnique({
    where: { id: proposalId },
    include: { service: true },
  });
  if (!proposal || proposal.status !== "APROVADA") return;

  const existing = await prisma.serviceInstance.count({ where: { proposalId } });
  if (existing > 0) return; // evita abrir duplicado se já foi aberto

  const count = await prisma.serviceInstance.count();
  const instance = await prisma.serviceInstance.create({
    data: {
      number: count + 1,
      title: proposal.service?.name ?? proposal.demand.slice(0, 80),
      clientId: proposal.clientId,
      serviceId: proposal.serviceId,
      proposalId: proposal.id,
      price: proposal.investment,
      responsibleId: proposal.service?.defaultResponsibleId ?? null,
      createdById: session.userId,
      checklistItems: {
        create: parseChecklistTemplate(proposal.service?.checklistTemplate).map((desc, idx) => ({
          description: desc,
          order: idx,
        })),
      },
    },
  });

  await addTimelineEvent({
    clientId: proposal.clientId,
    type: "SERVICO_ABERTO",
    description: `Serviço "${instance.title}" aberto a partir da proposta #${proposal.number} por ${session.name}.`,
    createdById: session.userId,
  });

  revalidatePath("/servicos-abertos");
  revalidatePath(`/propostas/${proposalId}`);
  revalidatePath(`/clientes/${proposal.clientId}`);
}

export async function toggleChecklistItemAction(itemId: string) {
  await requireSession();
  const item = await prisma.checklistItem.findUnique({ where: { id: itemId } });
  if (!item) return;

  await prisma.checklistItem.update({
    where: { id: itemId },
    data: { done: !item.done, doneAt: !item.done ? new Date() : null },
  });

  revalidatePath(`/servicos-abertos/${item.serviceInstanceId}`);
}

async function createPostSaleTask(
  instance: {
    id: string;
    title: string;
    clientId: string;
    responsibleId: string | null;
  },
  fallbackAssigneeId: string,
) {
  await prisma.task.create({
    data: {
      title: `Fazer pós-venda: ${instance.title}`,
      description:
        "Agradecer, solicitar avaliação, solicitar indicação, verificar satisfação e oferecer outro serviço.",
      // Sem responsável definido no serviço, a tarefa vai para quem concluiu o
      // serviço — nunca fica sem dono, ou ficaria invisível em "Minhas tarefas".
      assignedToId: instance.responsibleId ?? fallbackAssigneeId,
      dueDate: addDays(new Date(), 3),
      clientId: instance.clientId,
      serviceInstanceId: instance.id,
    },
  });
}

export async function updateServiceInstanceStatusAction(
  instanceId: string,
  status: ServiceInstanceStatus,
) {
  const session = await requireSession();
  const instance = await prisma.serviceInstance.findUnique({ where: { id: instanceId } });
  if (!instance) return;

  await prisma.serviceInstance.update({
    where: { id: instanceId },
    data: {
      status,
      deliveredAt: status === ServiceInstanceStatus.CONCLUIDO ? new Date() : instance.deliveredAt,
    },
  });

  await addTimelineEvent({
    clientId: instance.clientId,
    type: "SERVICO_STATUS",
    description: `Serviço "${instance.title}" marcado como ${status} por ${session.name}.`,
    createdById: session.userId,
  });

  if (status === ServiceInstanceStatus.CONCLUIDO) {
    await createPostSaleTask(instance, session.userId);
    await addTimelineEvent({
      clientId: instance.clientId,
      type: "POS_VENDA_CRIADO",
      description: `Tarefa de pós-venda criada para "${instance.title}".`,
      createdById: session.userId,
    });
  }

  revalidatePath("/servicos-abertos");
  revalidatePath(`/servicos-abertos/${instanceId}`);
  revalidatePath("/tarefas");
}

export async function updateServiceInstanceAction(
  instanceId: string,
  _prevState: ServiceInstanceFormState,
  formData: FormData,
): Promise<ServiceInstanceFormState> {
  await requireSession();
  const parsed = serviceInstanceEditSchema.safeParse({
    title: formData.get("title") || "",
    responsibleId: formData.get("responsibleId") || undefined,
    dueDate: formData.get("dueDate") || undefined,
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
  await prisma.serviceInstance.update({
    where: { id: instanceId },
    data: {
      title: data.title,
      responsibleId: data.responsibleId || null,
      dueDate: data.dueDate ? new Date(data.dueDate) : null,
      notes: data.notes || null,
    },
  });

  revalidatePath("/servicos-abertos");
  revalidatePath(`/servicos-abertos/${instanceId}`);
  redirect(`/servicos-abertos/${instanceId}`);
}
