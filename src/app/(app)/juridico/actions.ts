"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole, requireSession } from "@/lib/permissions";
import { Role } from "@/generated/prisma/enums";
import type { ContractKind, ContractStatus } from "@/generated/prisma/enums";
import {
  OperationError,
  changeContractStatus,
  createContract,
  createContractTemplate,
  duplicateContractTemplate,
  recordLegalConsultation,
  toggleContractTemplate,
  updateContract,
  updateContractTemplate,
  userActor,
} from "@/lib/contracts";
import { parseContractFields } from "@/lib/contract-render";

export type JuridicoFormState = { error?: string };

function jsonRecord(raw: FormDataEntryValue | null): Record<string, string> {
  try {
    const parsed = JSON.parse(String(raw ?? "{}"));
    return parsed && typeof parsed === "object" ? (parsed as Record<string, string>) : {};
  } catch {
    return {};
  }
}

function str(formData: FormData, key: string) {
  const v = formData.get(key);
  return v === null ? undefined : String(v);
}

function revalidateContracts(id?: string) {
  revalidatePath("/juridico/contratos");
  revalidatePath("/dashboard");
  if (id) revalidatePath(`/juridico/contratos/${id}`);
}

// ---------- contratos ----------

export async function createContractAction(_prev: JuridicoFormState, formData: FormData): Promise<JuridicoFormState> {
  const session = await requireSession();
  let id: string;
  try {
    const contract = await createContract(
      {
        clientId: str(formData, "clientId") ?? "",
        templateId: str(formData, "templateId") ?? "",
        quoteId: str(formData, "quoteId") || null,
        title: str(formData, "title") || null,
        values: jsonRecord(formData.get("values")),
        notes: str(formData, "notes") || null,
      },
      userActor(session.userId, "tela:novo_contrato"),
    );
    id = contract.id;
  } catch (e) {
    if (e instanceof OperationError) return { error: e.message };
    throw e;
  }
  revalidateContracts();
  redirect(`/juridico/contratos/${id}`);
}

export async function updateContractAction(contractId: string, _prev: JuridicoFormState, formData: FormData): Promise<JuridicoFormState> {
  const session = await requireSession();
  const mode = str(formData, "mode");
  try {
    await updateContract(
      contractId,
      {
        title: str(formData, "title"),
        notes: str(formData, "notes") ?? null,
        reason: str(formData, "reason"),
        ...(mode === "texto" ? { renderedContent: str(formData, "renderedContent") ?? "" } : { values: jsonRecord(formData.get("values")) }),
      },
      userActor(session.userId, "tela:editar_contrato"),
    );
  } catch (e) {
    if (e instanceof OperationError) return { error: e.message };
    throw e;
  }
  revalidateContracts(contractId);
  redirect(`/juridico/contratos/${contractId}`);
}

export async function changeContractStatusAction(
  contractId: string,
  to: ContractStatus,
  opts: { note?: string; signedAt?: string; signatureMethod?: string },
): Promise<{ error?: string; agenda?: string[] }> {
  const session = await requireSession();
  try {
    const { agenda } = await changeContractStatus(contractId, to, opts, userActor(session.userId, "tela:status_contrato"));
    revalidateContracts(contractId);
    revalidatePath("/agenda");
    return { agenda };
  } catch (e) {
    if (e instanceof OperationError) return { error: e.message };
    throw e;
  }
}

// ---------- modelos ----------

function templateInput(formData: FormData) {
  return {
    name: str(formData, "name") ?? "",
    slug: str(formData, "slug") || null,
    kind: (str(formData, "kind") === "DOCUMENTO" ? "DOCUMENTO" : "CONTRATO") as ContractKind,
    category: str(formData, "category") || null,
    description: str(formData, "description") || null,
    content: str(formData, "content") ?? "",
    fields: parseContractFields(str(formData, "fieldsSchema") ?? "[]"),
  };
}

export async function createTemplateAction(_prev: JuridicoFormState, formData: FormData): Promise<JuridicoFormState> {
  const session = await requireRole(Role.ADMIN);
  try {
    await createContractTemplate(templateInput(formData), userActor(session.userId, "tela:novo_modelo"));
  } catch (e) {
    if (e instanceof OperationError) return { error: e.message };
    throw e;
  }
  revalidatePath("/juridico/modelos");
  redirect("/juridico/modelos");
}

export async function updateTemplateAction(templateId: string, _prev: JuridicoFormState, formData: FormData): Promise<JuridicoFormState> {
  const session = await requireRole(Role.ADMIN);
  try {
    await updateContractTemplate(templateId, templateInput(formData), userActor(session.userId, "tela:editar_modelo"));
  } catch (e) {
    if (e instanceof OperationError) return { error: e.message };
    throw e;
  }
  revalidatePath("/juridico/modelos");
  redirect("/juridico/modelos");
}

export async function toggleTemplateAction(templateId: string) {
  const session = await requireRole(Role.ADMIN);
  await toggleContractTemplate(templateId, userActor(session.userId, "tela:ativar_modelo"));
  revalidatePath("/juridico/modelos");
}

export async function duplicateTemplateAction(templateId: string) {
  const session = await requireRole(Role.ADMIN);
  await duplicateContractTemplate(templateId, userActor(session.userId, "tela:duplicar_modelo"));
  revalidatePath("/juridico/modelos");
}

// ---------- orientações ----------

export async function createConsultationAction(_prev: JuridicoFormState, formData: FormData): Promise<JuridicoFormState> {
  const session = await requireSession();
  try {
    await recordLegalConsultation(
      {
        topic: str(formData, "topic") ?? "",
        question: str(formData, "question") ?? "",
        guidance: str(formData, "guidance") ?? "",
        needsLawyer: formData.get("needsLawyer") === "on",
        clientId: str(formData, "clientId") || null,
      },
      userActor(session.userId, "tela:orientacao_juridica"),
    );
  } catch (e) {
    if (e instanceof OperationError) return { error: e.message };
    throw e;
  }
  revalidatePath("/juridico/consultas");
  redirect("/juridico/consultas");
}
