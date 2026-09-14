"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/permissions";
import { addTimelineEvent } from "@/lib/timeline";
import { clientSchema } from "@/lib/validations";

export type ClientFormState = {
  error?: string;
  fieldErrors?: Record<string, string>;
};

function extractClientData(formData: FormData) {
  return {
    type: formData.get("type"),
    status: formData.get("status") || "ATIVO",
    fullName: formData.get("fullName") || undefined,
    cpf: formData.get("cpf") || undefined,
    rg: formData.get("rg") || undefined,
    birthDate: formData.get("birthDate") || undefined,
    maritalStatus: formData.get("maritalStatus") || undefined,
    profession: formData.get("profession") || undefined,
    legalName: formData.get("legalName") || undefined,
    tradeName: formData.get("tradeName") || undefined,
    cnpj: formData.get("cnpj") || undefined,
    stateRegistration: formData.get("stateRegistration") || undefined,
    responsibleName: formData.get("responsibleName") || undefined,
    responsibleCpf: formData.get("responsibleCpf") || undefined,
    responsibleRole: formData.get("responsibleRole") || undefined,
    addressStreet: formData.get("addressStreet") || undefined,
    addressNumber: formData.get("addressNumber") || undefined,
    addressComplement: formData.get("addressComplement") || undefined,
    addressNeighborhood: formData.get("addressNeighborhood") || undefined,
    addressCity: formData.get("addressCity") || undefined,
    addressState: formData.get("addressState") || undefined,
    addressZip: formData.get("addressZip") || undefined,
    phone: formData.get("phone") || undefined,
    whatsapp: formData.get("whatsapp") || undefined,
    email: formData.get("email") || undefined,
    instagram: formData.get("instagram") || undefined,
    notes: formData.get("notes") || undefined,
  };
}

export async function createClientAction(
  _prevState: ClientFormState,
  formData: FormData,
): Promise<ClientFormState> {
  const session = await requireSession();
  const raw = extractClientData(formData);
  const parsed = clientSchema.safeParse(raw);

  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      fieldErrors[String(issue.path[0])] = issue.message;
    }
    return { error: "Verifique os campos destacados.", fieldErrors };
  }

  const data = parsed.data;
  const client = await prisma.client.create({
    data: {
      type: data.type,
      status: data.status,
      fullName: data.fullName || null,
      cpf: data.cpf || null,
      rg: data.rg || null,
      birthDate: data.birthDate ? new Date(data.birthDate) : null,
      maritalStatus: data.maritalStatus || null,
      profession: data.profession || null,
      legalName: data.legalName || null,
      tradeName: data.tradeName || null,
      cnpj: data.cnpj || null,
      stateRegistration: data.stateRegistration || null,
      responsibleName: data.responsibleName || null,
      responsibleCpf: data.responsibleCpf || null,
      responsibleRole: data.responsibleRole || null,
      addressStreet: data.addressStreet || null,
      addressNumber: data.addressNumber || null,
      addressComplement: data.addressComplement || null,
      addressNeighborhood: data.addressNeighborhood || null,
      addressCity: data.addressCity || null,
      addressState: data.addressState || null,
      addressZip: data.addressZip || null,
      phone: data.phone || null,
      whatsapp: data.whatsapp || null,
      email: data.email || null,
      instagram: data.instagram || null,
      notes: data.notes || null,
      createdById: session.userId,
    },
  });

  await addTimelineEvent({
    clientId: client.id,
    type: "CLIENTE_CRIADO",
    description: `Cadastro criado por ${session.name}.`,
    createdById: session.userId,
  });

  const fromLeadId = formData.get("fromLeadId");
  if (typeof fromLeadId === "string" && fromLeadId) {
    await prisma.lead.update({
      where: { id: fromLeadId },
      data: { clientId: client.id },
    });
    await addTimelineEvent({
      clientId: client.id,
      type: "LEAD_CONVERTIDO",
      description: `Cliente convertido a partir de um lead por ${session.name}.`,
      createdById: session.userId,
    });
    revalidatePath("/leads");
    revalidatePath(`/leads/${fromLeadId}`);
  }

  revalidatePath("/clientes");
  redirect(`/clientes/${client.id}`);
}

export async function updateClientAction(
  clientId: string,
  _prevState: ClientFormState,
  formData: FormData,
): Promise<ClientFormState> {
  const session = await requireSession();
  const raw = extractClientData(formData);
  const parsed = clientSchema.safeParse(raw);

  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      fieldErrors[String(issue.path[0])] = issue.message;
    }
    return { error: "Verifique os campos destacados.", fieldErrors };
  }

  const data = parsed.data;
  await prisma.client.update({
    where: { id: clientId },
    data: {
      type: data.type,
      status: data.status,
      fullName: data.fullName || null,
      cpf: data.cpf || null,
      rg: data.rg || null,
      birthDate: data.birthDate ? new Date(data.birthDate) : null,
      maritalStatus: data.maritalStatus || null,
      profession: data.profession || null,
      legalName: data.legalName || null,
      tradeName: data.tradeName || null,
      cnpj: data.cnpj || null,
      stateRegistration: data.stateRegistration || null,
      responsibleName: data.responsibleName || null,
      responsibleCpf: data.responsibleCpf || null,
      responsibleRole: data.responsibleRole || null,
      addressStreet: data.addressStreet || null,
      addressNumber: data.addressNumber || null,
      addressComplement: data.addressComplement || null,
      addressNeighborhood: data.addressNeighborhood || null,
      addressCity: data.addressCity || null,
      addressState: data.addressState || null,
      addressZip: data.addressZip || null,
      phone: data.phone || null,
      whatsapp: data.whatsapp || null,
      email: data.email || null,
      instagram: data.instagram || null,
      notes: data.notes || null,
    },
  });

  await addTimelineEvent({
    clientId,
    type: "CLIENTE_ATUALIZADO",
    description: `Cadastro atualizado por ${session.name}.`,
    createdById: session.userId,
  });

  revalidatePath("/clientes");
  revalidatePath(`/clientes/${clientId}`);
  redirect(`/clientes/${clientId}`);
}

export async function toggleClientStatusAction(clientId: string) {
  const session = await requireSession();
  const client = await prisma.client.findUniqueOrThrow({
    where: { id: clientId },
  });
  const newStatus = client.status === "ATIVO" ? "INATIVO" : "ATIVO";

  await prisma.client.update({
    where: { id: clientId },
    data: { status: newStatus },
  });

  await addTimelineEvent({
    clientId,
    type: "STATUS_ALTERADO",
    description: `Status alterado para ${newStatus} por ${session.name}.`,
    createdById: session.userId,
  });

  revalidatePath("/clientes");
  revalidatePath(`/clientes/${clientId}`);
}
