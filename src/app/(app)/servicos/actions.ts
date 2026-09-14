"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/permissions";
import { Role } from "@/generated/prisma/enums";
import { serviceSchema } from "@/lib/validations";

export type ServiceFormState = {
  error?: string;
  fieldErrors?: Record<string, string>;
};

function extractServiceData(formData: FormData) {
  return {
    name: formData.get("name") || "",
    category: formData.get("category") || undefined,
    description: formData.get("description") || undefined,
    defaultPrice: formData.get("defaultPrice") || undefined,
    defaultTermDays: formData.get("defaultTermDays") || undefined,
    checklistTemplate: formData.get("checklistTemplate") || undefined,
    defaultResponsibleId: formData.get("defaultResponsibleId") || undefined,
    active: formData.get("active") === "on",
  };
}

function checklistToJson(raw: string | undefined) {
  if (!raw) return null;
  const items = raw
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  return items.length ? JSON.stringify(items) : null;
}

export async function createServiceAction(
  _prevState: ServiceFormState,
  formData: FormData,
): Promise<ServiceFormState> {
  await requireRole(Role.ADMIN, Role.GESTOR);
  const raw = extractServiceData(formData);
  const parsed = serviceSchema.safeParse(raw);

  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      fieldErrors[String(issue.path[0])] = issue.message;
    }
    return { error: "Verifique os campos destacados.", fieldErrors };
  }

  const data = parsed.data;
  await prisma.service.create({
    data: {
      name: data.name,
      category: data.category || null,
      description: data.description || null,
      defaultPrice: data.defaultPrice ? Number(data.defaultPrice) : null,
      defaultTermDays: data.defaultTermDays ? Number(data.defaultTermDays) : null,
      checklistTemplate: checklistToJson(data.checklistTemplate),
      defaultResponsibleId: data.defaultResponsibleId || null,
      active: data.active,
    },
  });

  revalidatePath("/servicos");
  redirect("/servicos");
}

export async function updateServiceAction(
  serviceId: string,
  _prevState: ServiceFormState,
  formData: FormData,
): Promise<ServiceFormState> {
  await requireRole(Role.ADMIN, Role.GESTOR);
  const raw = extractServiceData(formData);
  const parsed = serviceSchema.safeParse(raw);

  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      fieldErrors[String(issue.path[0])] = issue.message;
    }
    return { error: "Verifique os campos destacados.", fieldErrors };
  }

  const data = parsed.data;
  await prisma.service.update({
    where: { id: serviceId },
    data: {
      name: data.name,
      category: data.category || null,
      description: data.description || null,
      defaultPrice: data.defaultPrice ? Number(data.defaultPrice) : null,
      defaultTermDays: data.defaultTermDays ? Number(data.defaultTermDays) : null,
      checklistTemplate: checklistToJson(data.checklistTemplate),
      defaultResponsibleId: data.defaultResponsibleId || null,
      active: data.active,
    },
  });

  revalidatePath("/servicos");
  redirect("/servicos");
}

export async function toggleServiceActiveAction(serviceId: string) {
  await requireRole(Role.ADMIN, Role.GESTOR);
  const service = await prisma.service.findUnique({ where: { id: serviceId } });
  if (!service) return;
  await prisma.service.update({
    where: { id: serviceId },
    data: { active: !service.active },
  });
  revalidatePath("/servicos");
}
