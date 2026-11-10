import "server-only";
import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";
import { addTimelineEvent } from "@/lib/timeline";
import { displayClientAddress, displayClientName } from "@/lib/client-display";
import { formatCurrencyBRL, maskCnpj, maskCpf, onlyDigits } from "@/lib/utils";
import { brDayKey, addDaysKey, keyToUtc, parseDayKey } from "@/lib/br-time";
import { logMcpAction, type AuditSource } from "@/lib/mcp/audit";
import { OperationError, type Actor } from "@/lib/crm-operations";
import {
  contractCode,
  dayKeyInWords,
  formatDayKey,
  formatFieldValues,
  numberInWords,
  parseContractFields,
  parseMoneyText,
  renderContract,
  unresolvedTokens,
  type ContractFieldDef,
} from "@/lib/contract-render";
import { FIELD_TYPES } from "@/lib/contract-render";
import { AUTO_TOKEN_KEYS, QUOTE_PREFILL_KEYS } from "@/lib/contract-auto-tokens";
import type { ContractKind, ContractStatus } from "@/generated/prisma/enums";
import type { Prisma } from "@/generated/prisma/client";

// Regras do Jurídico usadas pelas telas (/juridico) e pelo conector MCP, para
// os dois caminhos validarem, versionarem e registrarem igual.

export { OperationError };
export type { Actor };

export const CONTRACT_STATUS_LABELS: Record<ContractStatus, string> = {
  RASCUNHO: "Rascunho",
  ENVIADO: "Enviado",
  ASSINADO: "Assinado",
  VIGENTE: "Vigente",
  ENCERRADO: "Encerrado",
  RESCINDIDO: "Rescindido",
};

/** Para onde cada status pode ir. ENCERRADO e RESCINDIDO são finais. */
export const CONTRACT_TRANSITIONS: Record<ContractStatus, ContractStatus[]> = {
  RASCUNHO: ["ENVIADO", "ENCERRADO"],
  ENVIADO: ["ASSINADO", "RASCUNHO", "ENCERRADO"],
  ASSINADO: ["VIGENTE", "ENCERRADO", "RESCINDIDO"],
  VIGENTE: ["ENCERRADO", "RESCINDIDO"],
  ENCERRADO: [],
  RESCINDIDO: [],
};

const EDITABLE_STATUSES: ContractStatus[] = ["RASCUNHO", "ENVIADO"];

function fromActor(actor: Actor) {
  return actor.source === "Claude" ? " (via Claude)" : "";
}

async function audit(actor: Actor, entity: string, entityId: string, summary: string, oldValue?: unknown, newValue?: unknown) {
  await logMcpAction({ tool: actor.tool, summary, userId: actor.userId, source: actor.source, entity, entityId, oldValue, newValue });
}

async function timeline(actor: Actor, clientId: string, type: string, description: string) {
  await addTimelineEvent({ clientId, type, description: `${description}${fromActor(actor)}`, createdById: actor.userId });
}

// ---------- campos automáticos ----------

type CompanyRow = Awaited<ReturnType<typeof getCompany>>;

export async function getCompany() {
  const c = await prisma.companySettings.findFirst();
  return {
    name: c?.name ?? "Monteiro Assessoria Administrativa",
    legalName: c?.legalName ?? null,
    slogan: c?.slogan ?? null,
    logoData: c?.logoData ?? null,
    cnpj: c?.cnpj ?? null,
    address: c?.address ?? null,
    representativeName: c?.representativeName ?? null,
    forum: c?.forum ?? null,
    signatureCity: c?.signatureCity ?? null,
    whatsapp: c?.whatsapp ?? null,
  };
}

type ClientRow = Prisma.ClientGetPayload<object>;

function companyTokens(company: CompanyRow): Record<string, string> {
  const nome = company.legalName && company.legalName !== company.name ? `${company.name.toUpperCase()} (${company.legalName})` : company.name.toUpperCase();
  return {
    contratada_nome: nome,
    contratada_cnpj: company.cnpj ?? "",
    contratada_endereco: company.address ?? "",
    contratada_representante: company.representativeName ?? "",
    contratada_whatsapp: company.whatsapp ?? "",
    foro: company.forum ?? "",
    cidade_assinatura: company.signatureCity ?? "",
  };
}

/** Dados do cliente que o contrato exige. Nada é inventado: o que faltar é pedido antes de gerar. */
export function missingClientData(client: ClientRow): string[] {
  const missing: string[] = [];
  if (client.type === "PF") {
    if (!client.fullName?.trim()) missing.push("nome completo");
    if (!onlyDigits(client.cpf)) missing.push("CPF");
  } else {
    if (!client.legalName?.trim() && !client.tradeName?.trim()) missing.push("razão social");
    if (!onlyDigits(client.cnpj)) missing.push("CNPJ");
    if (!client.responsibleName?.trim()) missing.push("nome do responsável que assina");
  }
  if (!client.addressStreet?.trim() || !client.addressCity?.trim() || !client.addressState?.trim()) {
    missing.push("endereço (rua, número, cidade e estado)");
  }
  return missing;
}

export function clientQualification(client: ClientRow) {
  const address = displayClientAddress(client);
  const contato = [client.whatsapp ? `WhatsApp ${client.whatsapp}` : null, client.email ? `e-mail ${client.email}` : null]
    .filter(Boolean)
    .join(", ");
  if (client.type === "PF") {
    const parts = [
      (client.fullName ?? "").toUpperCase(),
      client.profession || null,
      client.maritalStatus || null,
      client.rg ? `portador(a) do RG nº ${client.rg}` : null,
      client.cpf ? `inscrito(a) no CPF nº ${maskCpf(client.cpf)}` : null,
      address ? `residente e domiciliado(a) em ${address}` : null,
      contato || null,
    ];
    return parts.filter(Boolean).join(", ");
  }
  const razao = (client.legalName || client.tradeName || "").toUpperCase();
  const fantasia = client.tradeName && client.legalName && client.tradeName !== client.legalName ? ` (nome fantasia ${client.tradeName})` : "";
  const resp = client.responsibleName
    ? `neste ato representada por ${client.responsibleName}${client.responsibleRole ? `, ${client.responsibleRole}` : ""}${client.responsibleCpf ? `, CPF nº ${maskCpf(client.responsibleCpf)}` : ""}`
    : null;
  const parts = [
    `${razao}${fantasia}`,
    "pessoa jurídica de direito privado",
    client.cnpj ? `inscrita no CNPJ nº ${maskCnpj(client.cnpj)}` : null,
    address ? `com sede em ${address}` : null,
    resp,
    contato || null,
  ];
  return parts.filter(Boolean).join(", ");
}

function clientTokens(client: ClientRow): Record<string, string> {
  const doc = client.type === "PF" ? (client.cpf ? maskCpf(client.cpf) : "") : client.cnpj ? maskCnpj(client.cnpj) : "";
  const address = displayClientAddress(client);
  const tokens: Record<string, string> = {
    cliente_nome: displayClientName(client),
    cliente_qualificacao: clientQualification(client),
    cpf_cnpj: doc,
    cliente_endereco: address,
    cliente_cidade: client.addressCity ?? "",
    cliente_estado: client.addressState ?? "",
    cliente_cep: client.addressZip ?? "",
    cliente_whatsapp: client.whatsapp ?? "",
    cliente_email: client.email ?? "",
  };
  // Modelos antigos (sistema Documentos) usam {{NOME_CLIENTE}} etc.
  return {
    ...tokens,
    NOME_CLIENTE: tokens.cliente_nome,
    DOCUMENTO_CLIENTE: doc || "-",
    ENDERECO_CLIENTE: address || "-",
    CIDADE_CLIENTE: tokens.cliente_cidade || "-",
    ESTADO_CLIENTE: tokens.cliente_estado || "-",
    CEP_CLIENTE: tokens.cliente_cep || "-",
    WHATSAPP_CLIENTE: tokens.cliente_whatsapp || "-",
    EMAIL_CLIENTE: tokens.cliente_email || "-",
  };
}

function dateTokens(now = new Date()) {
  const key = brDayKey(now);
  return { data_atual: formatDayKey(key), data_extenso: dayKeyInWords(key), DATA_ATUAL: formatDayKey(key) };
}

type QuoteWithItems = Prisma.QuoteGetPayload<{ include: { items: { include: { service: true } } } }>;

/** Valores que o orçamento aceito já traz para os campos do contrato (editáveis antes de gerar). */
export function quotePrefill(quote: QuoteWithItems | null): Record<string, string> {
  if (!quote) return {};
  const total = quote.items.reduce((s, i) => s + Number(i.unitPrice) * i.quantity, 0);
  const days = quote.items.reduce((m, i) => Math.max(m, i.termDays ?? 0), 0);
  const out: Record<string, string> = {};
  if (quote.items.length) {
    out.servico_descricao = quote.items
      .map((i) => `${i.description}${i.quantity > 1 ? ` (${i.quantity} unidades)` : ""}`)
      .join("; ")
      .concat(".");
  }
  if (total > 0) out.valor = total.toFixed(2);
  if (quote.paymentTerms?.trim()) out.forma_pagamento = quote.paymentTerms.trim();
  if (days > 0) out.prazo = `${days} (${numberInWords(days)}) ${days === 1 ? "dia" : "dias"}`;
  return out;
}

/** Valores iniciais de cada campo: padrão do modelo < orçamento < o que foi informado. */
export function initialFieldValues(fields: ContractFieldDef[], quote: QuoteWithItems | null, given: Record<string, string> = {}) {
  const prefill = quotePrefill(quote);
  const out: Record<string, string> = {};
  for (const f of fields) {
    const fromQuote = (QUOTE_PREFILL_KEYS as readonly string[]).includes(f.key) ? prefill[f.key] : undefined;
    out[f.key] = (given[f.key] ?? fromQuote ?? f.default ?? "").toString();
  }
  return out;
}

function cleanValues(fields: ContractFieldDef[], values: Record<string, string>) {
  const out: Record<string, string> = {};
  for (const f of fields) {
    const v = (values[f.key] ?? "").toString().trim();
    if (v) out[f.key] = f.type === "boolean" ? (v === "sim" || v === "true" || v === "on" ? "sim" : "") : v;
  }
  return out;
}

function validateValues(fields: ContractFieldDef[], values: Record<string, string>) {
  const problems: string[] = [];
  for (const f of fields) {
    const v = values[f.key];
    if (f.required && !v) problems.push(f.label);
    else if (v && f.type === "money" && parseMoneyText(v) === null) problems.push(`${f.label} (valor inválido: "${v}")`);
    else if (v && f.type === "date" && !parseDayKey(v)) problems.push(`${f.label} (use AAAA-MM-DD)`);
    else if (v && f.type === "number" && !/^\d+$/.test(v)) problems.push(`${f.label} (só números)`);
  }
  return problems;
}

type TemplateRow = Prisma.ContractTemplateGetPayload<object>;

function buildText(params: {
  template: TemplateRow;
  client: ClientRow;
  company: CompanyRow;
  code: string;
  quoteNumber: number | null;
  values: Record<string, string>;
}) {
  const fields = parseContractFields(params.template.fieldsSchema);
  const tokens = {
    ...companyTokens(params.company),
    ...clientTokens(params.client),
    ...dateTokens(),
    contrato_numero: params.code,
    orcamento_numero: params.quoteNumber ? `nº ${params.quoteNumber}` : "",
    ...formatFieldValues(fields, params.values),
  };
  const rendered = renderContract(params.template.content, tokens, params.client.type === "PJ" ? "PJ" : "PF");
  return { rendered, unresolved: unresolvedTokens(rendered) };
}

/** Datas e valores do contrato que alimentam lista, filtros e agenda. */
function structuredFromValues(fields: ContractFieldDef[], values: Record<string, string>) {
  const money = (k: string) => (fields.some((f) => f.key === k) && values[k] ? parseMoneyText(values[k]) : null);
  const day = (k: string) => (values[k] ? parseDayKey(values[k]) : null);
  const startDate = day("data_inicio");
  const endDate = day("data_fim");
  const monthlyValue = money("valor_mensal");
  const renewalDate = monthlyValue && startDate ? keyToUtc(addMonthsKey(brDayKey(startDate), 12)) : null;
  return {
    totalValue: money("valor")?.toFixed(2) ?? null,
    monthlyValue: monthlyValue?.toFixed(2) ?? null,
    paymentTerms: values.forma_pagamento || null,
    startDate,
    endDate,
    renewalDate,
  };
}

function addMonthsKey(key: string, months: number) {
  const [y, m, d] = key.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1 + months, 1));
  const lastDay = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)).getUTCDate();
  date.setUTCDate(Math.min(d, lastDay));
  return date.toISOString().slice(0, 10);
}

// ---------- resolução por nome/número ----------

export async function resolveTemplate(ref: string) {
  const r = ref.trim();
  const byId = await prisma.contractTemplate.findUnique({ where: { id: r } });
  if (byId) return latestActiveVersion(byId);
  const bySlug = await prisma.contractTemplate.findFirst({ where: { slug: r, active: true }, orderBy: { version: "desc" } });
  if (bySlug) return bySlug;
  const matches = await prisma.contractTemplate.findMany({
    where: { active: true, name: { contains: r, mode: "insensitive" } },
    take: 6,
  });
  if (matches.length === 1) return matches[0];
  if (matches.length === 0) throw new OperationError(`Nenhum modelo ativo encontrado para "${ref}". Use listar_modelos_contrato.`);
  throw new OperationError(`Mais de um modelo para "${ref}": ${matches.map((m) => `${m.name} (${m.slug ?? m.id})`).join("; ")}. Use a chave (slug).`);
}

async function latestActiveVersion(t: TemplateRow) {
  if (t.active) return t;
  const latest = await prisma.contractTemplate.findFirst({ where: { baseTemplateId: t.baseTemplateId, active: true }, orderBy: { version: "desc" } });
  return latest ?? t;
}

export async function resolveContract(ref: string) {
  const r = ref.trim();
  const c =
    (await prisma.contract.findUnique({ where: { id: r } })) ??
    (await prisma.contract.findUnique({ where: { code: r.toUpperCase() } }));
  if (!c) throw new OperationError(`Contrato "${ref}" não encontrado. Informe o número (ex.: MON-2026-003) ou o ID.`);
  return c;
}

export async function resolveQuote(ref: string | number) {
  const r = String(ref).trim().replace(/^n?º?\s*#?/i, "");
  const quote = /^\d+$/.test(r)
    ? await prisma.quote.findFirst({ where: { number: Number(r) }, include: { items: { include: { service: true } } } })
    : await prisma.quote.findUnique({ where: { id: r }, include: { items: { include: { service: true } } } });
  if (!quote) throw new OperationError(`Orçamento "${ref}" não encontrado.`);
  return quote;
}

// ---------- contratos ----------

async function nextSequence(kind: ContractKind, year: number) {
  const max = await prisma.contract.aggregate({ where: { kind, year }, _max: { sequence: true } });
  return (max._max.sequence ?? 0) + 1;
}

export type CreateContractInput = {
  clientId: string;
  templateId: string;
  quoteId?: string | null;
  serviceInstanceId?: string | null;
  title?: string | null;
  values?: Record<string, string>;
  notes?: string | null;
};

/** Carrega e confere tudo o que o contrato precisa, sem gravar. */
async function prepareContract(input: CreateContractInput) {
  const [client, template, company] = await Promise.all([
    prisma.client.findUnique({ where: { id: input.clientId } }),
    prisma.contractTemplate.findUnique({ where: { id: input.templateId } }),
    getCompany(),
  ]);
  if (!client) throw new OperationError("Cliente não encontrado.");
  if (!template) throw new OperationError("Modelo não encontrado.");
  if (!template.active) throw new OperationError(`O modelo "${template.name}" está inativo. Escolha um modelo ativo.`);

  const quote = input.quoteId
    ? await prisma.quote.findUnique({ where: { id: input.quoteId }, include: { items: { include: { service: true } } } })
    : null;
  if (input.quoteId && !quote) throw new OperationError("Orçamento não encontrado.");
  if (quote && quote.clientId !== client.id) throw new OperationError(`O orçamento nº ${quote.number} é de outro cliente.`);

  const clientMissing = template.kind === "CONTRATO" ? missingClientData(client) : [];
  const companyMissing =
    template.kind === "CONTRATO"
      ? ([!company.cnpj && "CNPJ", !company.address && "endereço", !company.representativeName && "responsável", !company.forum && "foro"].filter(
          Boolean,
        ) as string[])
      : [];

  const fields = parseContractFields(template.fieldsSchema);
  const values = cleanValues(fields, initialFieldValues(fields, quote, input.values ?? {}));
  const fieldProblems = validateValues(fields, values);
  return { client, template, company, quote, fields, values, clientMissing, companyMissing, fieldProblems };
}

/**
 * Diz o que falta para gerar o contrato (dados do cliente, da Monteiro e campos),
 * com os valores que já estão prontos. Não grava nada.
 */
export async function checkContract(input: CreateContractInput) {
  const p = await prepareContract(input);
  return {
    pronto: p.clientMissing.length + p.companyMissing.length + p.fieldProblems.length === 0,
    faltaNoCliente: p.clientMissing,
    faltaNaMonteiro: p.companyMissing,
    faltaNosCampos: p.fieldProblems,
    valores: p.values,
    modelo: `${p.template.name} (v${p.template.version})`,
    orcamento: p.quote ? `nº ${p.quote.number}` : null,
  };
}

/** Monta, numera e grava o contrato. Recusa (sem gravar nada) se faltar dado do cliente ou campo obrigatório. */
export async function createContract(input: CreateContractInput, actor: Actor) {
  const { client, template, company, quote, fields, values, clientMissing, companyMissing, fieldProblems } = await prepareContract(input);
  if (clientMissing.length) {
    throw new OperationError(
      `Faltam dados de ${displayClientName(client)} no cadastro: ${clientMissing.join(", ")}. Atualize o cliente (atualizar_cliente ou a tela do cliente) e gere de novo. Nada foi gravado.`,
    );
  }
  if (companyMissing.length) {
    throw new OperationError(`Faltam dados da Monteiro em Configurações: ${companyMissing.join(", ")}. Nada foi gravado.`);
  }
  if (fieldProblems.length) throw new OperationError(`Preencha os campos: ${fieldProblems.join(", ")}. Nada foi gravado.`);

  const year = Number(brDayKey(new Date()).slice(0, 4));
  const serviceId = quote?.items.find((i) => i.serviceId)?.serviceId ?? null;
  const structured = structuredFromValues(fields, values);

  for (let attempt = 0; attempt < 3; attempt++) {
    const sequence = await nextSequence(template.kind, year);
    const code = contractCode(template.kind, year, sequence);
    const { rendered, unresolved } = buildText({ template, client, company, code, quoteNumber: quote?.number ?? null, values });
    if (unresolved.length) {
      throw new OperationError(`O texto ficaria com campos vazios: ${unresolved.map((t) => `{{${t}}}`).join(", ")}. Nada foi gravado.`);
    }
    try {
      const contract = await prisma.contract.create({
        data: {
          code,
          kind: template.kind,
          year,
          sequence,
          templateId: template.id,
          clientId: client.id,
          quoteId: quote?.id ?? null,
          serviceId,
          serviceInstanceId: input.serviceInstanceId ?? null,
          title: input.title?.trim() || template.name,
          status: "RASCUNHO",
          ...structured,
          fieldValues: JSON.stringify(values),
          renderedContent: rendered,
          notes: input.notes?.trim() || null,
          createdById: actor.userId,
          versions: {
            create: {
              version: 1,
              templateVersion: template.version,
              fieldValues: JSON.stringify(values),
              renderedContent: rendered,
              reason: "Versão inicial",
              createdById: actor.userId,
            },
          },
          statusChanges: { create: { fromStatus: null, toStatus: "RASCUNHO", note: "Contrato gerado", createdById: actor.userId } },
        },
      });
      if (quote) await linkReceivables(contract.id, quote.id);
      await audit(actor, "Contract", contract.id, `Contrato ${code} gerado (${template.name}) para ${displayClientName(client)}`, undefined, { code, values });
      await timeline(actor, client.id, "CONTRATO_GERADO", `Contrato ${code} gerado a partir do modelo ${template.name} v${template.version}`);
      return contract;
    } catch (e) {
      if ((e as { code?: string }).code === "P2002" && attempt < 2) continue; // número tomado ao mesmo tempo: tenta o próximo
      throw e;
    }
  }
  throw new OperationError("Não consegui numerar o contrato. Tente de novo.");
}

/** Liga ao contrato as contas a receber do orçamento que ainda não têm contrato. */
async function linkReceivables(contractId: string, quoteId: string | null) {
  if (!quoteId) return 0;
  const r = await prisma.receivable.updateMany({ where: { quoteId, contractId: null }, data: { contractId } });
  return r.count;
}

export type UpdateContractPatch = {
  values?: Record<string, string>; // campos que mudam (os outros ficam)
  renderedContent?: string; // texto editado à mão (ignora values)
  title?: string;
  notes?: string | null;
  quoteId?: string | null;
  serviceInstanceId?: string | null;
  reason?: string;
};

/** Toda mudança de texto cria uma versão nova. Contrato assinado não muda: faça um aditivo (novo contrato). */
export async function updateContract(id: string, patch: UpdateContractPatch, actor: Actor) {
  const contract = await prisma.contract.findUnique({ where: { id }, include: { template: true, client: true } });
  if (!contract) throw new OperationError("Contrato não encontrado.");

  const changesText = patch.values !== undefined || patch.renderedContent !== undefined;
  if (changesText && !EDITABLE_STATUSES.includes(contract.status)) {
    throw new OperationError(
      `O contrato ${contract.code} está ${CONTRACT_STATUS_LABELS[contract.status].toLowerCase()} e o texto não pode mais mudar. Para alterar condições, gere um aditivo (novo contrato).`,
    );
  }

  const data: Prisma.ContractUpdateInput = {};
  if (patch.title !== undefined) {
    if (!patch.title.trim()) throw new OperationError("O título não pode ficar vazio.");
    data.title = patch.title.trim();
  }
  if (patch.notes !== undefined) data.notes = patch.notes?.trim() || null;
  if (patch.quoteId !== undefined) {
    if (patch.quoteId) {
      const q = await prisma.quote.findUnique({ where: { id: patch.quoteId } });
      if (!q || q.clientId !== contract.clientId) throw new OperationError("O orçamento informado não é deste cliente.");
      data.quote = { connect: { id: q.id } };
    } else data.quote = { disconnect: true };
  }
  if (patch.serviceInstanceId !== undefined) {
    data.serviceInstance = patch.serviceInstanceId ? { connect: { id: patch.serviceInstanceId } } : { disconnect: true };
  }

  let newVersion: { renderedContent: string; fieldValues: string } | null = null;
  if (patch.renderedContent !== undefined) {
    const text = patch.renderedContent.replace(/\r\n/g, "\n").trim();
    if (!text) throw new OperationError("O texto do contrato não pode ficar vazio.");
    const unresolved = unresolvedTokens(text);
    if (unresolved.length) throw new OperationError(`O texto ainda tem campos vazios: ${unresolved.map((t) => `{{${t}}}`).join(", ")}.`);
    newVersion = { renderedContent: text, fieldValues: contract.fieldValues };
  } else if (patch.values !== undefined) {
    const fields = parseContractFields(contract.template.fieldsSchema);
    const current = JSON.parse(contract.fieldValues || "{}") as Record<string, string>;
    const values = cleanValues(fields, { ...current, ...patch.values });
    const problems = validateValues(fields, values);
    if (problems.length) throw new OperationError(`Preencha os campos: ${problems.join(", ")}.`);
    const company = await getCompany();
    const quote = contract.quoteId ? await prisma.quote.findUnique({ where: { id: contract.quoteId } }) : null;
    const { rendered, unresolved } = buildText({
      template: contract.template,
      client: contract.client,
      company,
      code: contract.code,
      quoteNumber: quote?.number ?? null,
      values,
    });
    if (unresolved.length) throw new OperationError(`O texto ficaria com campos vazios: ${unresolved.map((t) => `{{${t}}}`).join(", ")}.`);
    newVersion = { renderedContent: rendered, fieldValues: JSON.stringify(values) };
    Object.assign(data, structuredFromValues(fields, values));
  }

  if (newVersion && newVersion.renderedContent === contract.renderedContent && newVersion.fieldValues === contract.fieldValues) {
    newVersion = null; // nada mudou no texto
  }

  if (newVersion) {
    const version = contract.currentVersion + 1;
    data.currentVersion = version;
    data.renderedContent = newVersion.renderedContent;
    data.fieldValues = newVersion.fieldValues;
    data.versions = {
      create: {
        version,
        templateVersion: contract.template.version,
        fieldValues: newVersion.fieldValues,
        renderedContent: newVersion.renderedContent,
        reason: patch.reason?.trim() || "Alteração",
        createdBy: { connect: { id: actor.userId } },
      },
    };
    // Texto mudou depois de enviado: volta para rascunho até reenviar.
    if (contract.status === "ENVIADO") {
      data.status = "RASCUNHO";
      data.statusChanges = {
        create: { fromStatus: "ENVIADO", toStatus: "RASCUNHO", note: `Texto alterado (versão ${version}); reenviar ao cliente.`, createdBy: { connect: { id: actor.userId } } },
      };
    }
  }

  if (Object.keys(data).length === 0) return contract;
  const updated = await prisma.contract.update({ where: { id }, data });
  await audit(actor, "Contract", id, `Contrato ${contract.code} alterado${newVersion ? ` (versão ${updated.currentVersion})` : ""}`, { title: contract.title, notes: contract.notes }, patch);
  if (newVersion) await timeline(actor, contract.clientId, "CONTRATO_ALTERADO", `Contrato ${contract.code}: nova versão ${updated.currentVersion}${patch.reason ? ` — ${patch.reason}` : ""}`);
  return updated;
}

export type StatusOptions = {
  note?: string;
  signedAt?: string; // AAAA-MM-DD
  signatureMethod?: string;
};

export async function changeContractStatus(id: string, to: ContractStatus, opts: StatusOptions, actor: Actor) {
  const contract = await prisma.contract.findUnique({ where: { id }, include: { client: true } });
  if (!contract) throw new OperationError("Contrato não encontrado.");
  if (contract.status === to) return { contract, agenda: [] as string[] };
  if (!CONTRACT_TRANSITIONS[contract.status].includes(to)) {
    const allowed = CONTRACT_TRANSITIONS[contract.status].map((s) => CONTRACT_STATUS_LABELS[s]).join(", ") || "nenhum (status final)";
    throw new OperationError(`O contrato ${contract.code} está ${CONTRACT_STATUS_LABELS[contract.status]} e não pode ir para ${CONTRACT_STATUS_LABELS[to]}. Pode ir para: ${allowed}.`);
  }
  if ((to === "ENCERRADO" || to === "RESCINDIDO") && contract.status !== "RASCUNHO" && !opts.note?.trim()) {
    throw new OperationError("Informe o motivo do encerramento ou da rescisão.");
  }

  const now = new Date();
  const data: Prisma.ContractUpdateInput = { status: to };
  if (to === "ENVIADO") data.sentAt = now;
  if (to === "ASSINADO") {
    const signed = opts.signedAt ? parseDayKey(opts.signedAt) : null;
    if (opts.signedAt && !signed) throw new OperationError("Data da assinatura inválida. Use AAAA-MM-DD.");
    data.signedAt = signed ?? now;
    data.signatureMethod = opts.signatureMethod?.trim() || "gov.br";
  }
  if (to === "ENCERRADO" || to === "RESCINDIDO") {
    data.endedAt = now;
    data.endReason = opts.note?.trim() || null;
  }
  data.statusChanges = {
    create: { fromStatus: contract.status, toStatus: to, note: opts.note?.trim() || null, createdBy: { connect: { id: actor.userId } } },
  };

  const updated = await prisma.contract.update({ where: { id }, data });
  let agenda: string[] = [];
  if (to === "ASSINADO") {
    await linkReceivables(id, contract.quoteId);
    agenda = await scheduleContractEvents(id, actor);
  }
  await audit(actor, "Contract", id, `Contrato ${contract.code}: ${CONTRACT_STATUS_LABELS[contract.status]} → ${CONTRACT_STATUS_LABELS[to]}`, { status: contract.status }, { status: to, note: opts.note });
  await timeline(actor, contract.clientId, "CONTRATO_STATUS", `Contrato ${contract.code} marcado como ${CONTRACT_STATUS_LABELS[to]}${opts.note ? ` — ${opts.note}` : ""}`);
  return { contract: updated, agenda };
}

/** Assinado vira Vigente no início; Vigente vira Encerrado depois da data de fim. Roda ao abrir listas. */
export async function refreshContractStatuses() {
  const todayKey = brDayKey(new Date());
  const today = keyToUtc(todayKey);
  const toVigente = await prisma.contract.findMany({
    where: { status: "ASSINADO", kind: "CONTRATO", OR: [{ startDate: null }, { startDate: { lte: today } }] },
    select: { id: true },
  });
  const toEnd = await prisma.contract.findMany({
    where: { status: { in: ["ASSINADO", "VIGENTE"] }, endDate: { lt: today } },
    select: { id: true, status: true },
  });
  for (const c of toVigente) {
    if (toEnd.some((e) => e.id === c.id)) continue;
    await prisma.contract.update({
      where: { id: c.id },
      data: { status: "VIGENTE", statusChanges: { create: { fromStatus: "ASSINADO", toStatus: "VIGENTE", note: "Automático: início do contrato." } } },
    });
  }
  for (const c of toEnd) {
    await prisma.contract.update({
      where: { id: c.id },
      data: {
        status: "ENCERRADO",
        endedAt: new Date(),
        endReason: "Fim do prazo do contrato.",
        statusChanges: { create: { fromStatus: c.status, toStatus: "ENCERRADO", note: "Automático: fim do prazo." } },
      },
    });
  }
  return { vigentes: toVigente.length, encerrados: toEnd.length };
}

// ---------- agenda ----------

/** 9h "de parede" do dia (a agenda guarda o horário de Brasília como UTC). */
function wallMorning(dayKey: string) {
  return new Date(keyToUtc(dayKey).getTime() + 9 * 60 * 60 * 1000);
}

/**
 * Vencimentos, reajuste e fim do contrato entram na agenda do CRM, com a
 * mensagem pronta nas observações. A marca [contrato:...] evita repetir.
 */
export async function scheduleContractEvents(contractId: string, actor: Actor) {
  const contract = await prisma.contract.findUnique({
    where: { id: contractId },
    include: { client: true, receivables: { where: { status: "PENDENTE", dueDate: { not: null } } } },
  });
  if (!contract) return [];
  const nome = displayClientName(contract.client);
  const primeiroNome = nome.split(" ")[0];
  const todayKey = brDayKey(new Date());

  const wanted: { key: string; title: string; day: string; type: "PRAZO" | "RETORNO_CLIENTE"; notes: string }[] = [];

  for (const r of contract.receivables) {
    const day = brDayKey(r.dueDate!);
    if (day < todayKey) continue;
    wanted.push({
      key: `venc:${r.id}`,
      title: `Vencimento ${formatCurrencyBRL(Number(r.amount))} — ${nome}`,
      day,
      type: "PRAZO",
      notes: `Conta a receber #${r.number} (${r.description}).\n\nMensagem pronta:\nOi, ${primeiroNome}! Passando para lembrar que hoje vence o pagamento de ${formatCurrencyBRL(Number(r.amount))} referente a ${r.description}, conforme o contrato ${contract.code}. Pode pagar por Pix, débito ou crédito. Qualquer dúvida, estou à disposição! — Monteiro Assessoria`,
    });
  }

  if (contract.renewalDate) {
    const renewalKey = brDayKey(contract.renewalDate);
    const avisoKey = addDaysKey(renewalKey, -35);
    if (avisoKey >= todayKey) {
      const valor = contract.monthlyValue ? formatCurrencyBRL(Number(contract.monthlyValue)) : "a mensalidade";
      wanted.push({
        key: "reajuste",
        title: `Avisar reajuste anual — ${contract.code} (${nome})`,
        day: avisoKey,
        type: "RETORNO_CLIENTE",
        notes: `O contrato ${contract.code} faz 12 meses em ${formatDayKey(renewalKey)}. O aviso precisa sair com 30 dias de antecedência. Calcule o IPCA acumulado antes de enviar.\n\nMensagem pronta:\nOi, ${primeiroNome}! Tudo bem? Nosso contrato ${contract.code} completa 12 meses em ${formatDayKey(renewalKey)}. Conforme a cláusula de reajuste, ${valor} será atualizada pelo IPCA do período, passando para R$ [NOVO VALOR] a partir dessa data. Obrigado pela parceria! — Monteiro Assessoria`,
      });
    }
  }

  if (contract.endDate) {
    const endKey = brDayKey(contract.endDate);
    const avisoKey = addDaysKey(endKey, -15);
    if (avisoKey >= todayKey) {
      wanted.push({
        key: "fim",
        title: `Contrato ${contract.code} termina em 15 dias — ${nome}`,
        day: avisoKey,
        type: "RETORNO_CLIENTE",
        notes: `O contrato ${contract.code} termina em ${formatDayKey(endKey)}.\n\nMensagem pronta:\nOi, ${primeiroNome}! Nosso contrato ${contract.code} termina em ${formatDayKey(endKey)}. Quer renovar para continuarmos juntos? Posso te mandar a proposta de renovação. — Monteiro Assessoria`,
      });
    }
  }

  const created: string[] = [];
  for (const w of wanted) {
    const marker = `[contrato:${contract.code}:${w.key}]`;
    const exists = await prisma.calendarEvent.findFirst({ where: { notes: { contains: marker } } });
    if (exists) continue;
    await prisma.calendarEvent.create({
      data: {
        title: w.title,
        type: w.type,
        startAt: wallMorning(w.day),
        clientId: contract.clientId,
        responsibleId: actor.userId,
        notes: `${w.notes}\n\n${marker}`,
        createdById: actor.userId,
      },
    });
    created.push(`${formatDayKey(w.day)}: ${w.title}`);
  }
  return created;
}

// ---------- modelos ----------

export type TemplateInput = {
  name: string;
  slug?: string | null;
  kind?: ContractKind;
  category?: string | null;
  description?: string | null;
  content: string;
  fields: ContractFieldDef[];
};

function validateTemplate(input: Partial<TemplateInput>) {
  if (input.name !== undefined && !input.name.trim()) throw new OperationError("Informe o nome do modelo.");
  if (input.content !== undefined && !input.content.trim()) throw new OperationError("O texto do modelo não pode ficar vazio.");
  if (input.slug && !/^[a-z0-9-]+$/.test(input.slug)) throw new OperationError("A chave do modelo só pode ter letras minúsculas, números e hífen.");
  if (input.fields) {
    const keys = input.fields.map((f) => f.key);
    if (keys.some((k) => !/^[A-Za-z0-9_]+$/.test(k))) throw new OperationError("A chave de cada campo só pode ter letras, números e _.");
    if (new Set(keys).size !== keys.length) throw new OperationError("Cada campo precisa de uma chave única.");
    const reserved = keys.find((k) => AUTO_TOKEN_KEYS.includes(k));
    if (reserved) throw new OperationError(`O campo {{${reserved}}} já é preenchido automaticamente — escolha outra chave.`);
    const badType = input.fields.find((f) => !FIELD_TYPES.includes(f.type));
    if (badType) throw new OperationError(`Tipo inválido no campo ${badType.key}.`);
    if (input.fields.some((f) => !f.label.trim())) throw new OperationError("Cada campo precisa de um nome.");
  }
}

export async function createContractTemplate(input: TemplateInput, actor: Actor) {
  validateTemplate(input);
  const id = randomUUID();
  const t = await prisma.contractTemplate.create({
    data: {
      id,
      baseTemplateId: id,
      slug: input.slug?.trim() || null,
      name: input.name.trim(),
      kind: input.kind ?? "CONTRATO",
      category: input.category?.trim() || null,
      description: input.description?.trim() || null,
      content: input.content,
      fieldsSchema: JSON.stringify(input.fields),
      createdById: actor.userId,
    },
  });
  await audit(actor, "ContractTemplate", t.id, `Modelo "${t.name}" criado`);
  return t;
}

/** Editar sempre cria uma nova versão; contratos já gerados ficam com a versão usada na época. */
export async function updateContractTemplate(id: string, patch: Partial<TemplateInput>, actor: Actor) {
  validateTemplate(patch);
  const current = await prisma.contractTemplate.findUnique({ where: { id } });
  if (!current) throw new OperationError("Modelo não encontrado.");
  const highest = await prisma.contractTemplate.aggregate({ where: { baseTemplateId: current.baseTemplateId }, _max: { version: true } });
  const version = (highest._max.version ?? current.version) + 1;
  const [, created] = await prisma.$transaction([
    prisma.contractTemplate.updateMany({ where: { baseTemplateId: current.baseTemplateId, active: true }, data: { active: false } }),
    prisma.contractTemplate.create({
      data: {
        baseTemplateId: current.baseTemplateId,
        version,
        slug: patch.slug !== undefined ? patch.slug?.trim() || null : current.slug,
        name: patch.name?.trim() ?? current.name,
        kind: patch.kind ?? current.kind,
        category: patch.category !== undefined ? patch.category?.trim() || null : current.category,
        description: patch.description !== undefined ? patch.description?.trim() || null : current.description,
        content: patch.content ?? current.content,
        fieldsSchema: patch.fields ? JSON.stringify(patch.fields) : current.fieldsSchema,
        active: true,
        createdById: actor.userId,
      },
    }),
  ]);
  await audit(actor, "ContractTemplate", created.id, `Modelo "${created.name}" atualizado para a versão ${version}`, { version: current.version }, { version });
  return created;
}

export async function toggleContractTemplate(id: string, actor: Actor) {
  const t = await prisma.contractTemplate.findUnique({ where: { id } });
  if (!t) throw new OperationError("Modelo não encontrado.");
  if (!t.active) {
    // Só uma versão ativa por modelo.
    await prisma.contractTemplate.updateMany({ where: { baseTemplateId: t.baseTemplateId, active: true }, data: { active: false } });
  }
  const updated = await prisma.contractTemplate.update({ where: { id }, data: { active: !t.active } });
  await audit(actor, "ContractTemplate", id, `Modelo "${t.name}" ${updated.active ? "ativado" : "desativado"}`);
  return updated;
}

export async function duplicateContractTemplate(id: string, actor: Actor) {
  const t = await prisma.contractTemplate.findUnique({ where: { id } });
  if (!t) throw new OperationError("Modelo não encontrado.");
  return createContractTemplate(
    {
      name: `${t.name} (cópia)`,
      kind: t.kind,
      category: t.category,
      description: t.description,
      content: t.content,
      fields: parseContractFields(t.fieldsSchema),
    },
    actor,
  );
}

/** Texto do modelo com dados da Monteiro e campos de exemplo, para conferir e para documentos sem cliente (termos dos e-books). */
export async function previewTemplateText(templateId: string, clientType: "PF" | "PJ" = "PF") {
  const template = await prisma.contractTemplate.findUnique({ where: { id: templateId } });
  if (!template) throw new OperationError("Modelo não encontrado.");
  const company = await getCompany();
  const fields = parseContractFields(template.fieldsSchema);
  const values = Object.fromEntries(fields.filter((f) => f.default).map((f) => [f.key, f.default!]));
  const tokens = {
    ...companyTokens(company),
    ...dateTokens(),
    contrato_numero: template.kind === "CONTRATO" ? "MON-AAAA-NNN" : "",
    ...formatFieldValues(fields, values),
  };
  return { template, text: renderContract(template.content, tokens, clientType) };
}

// ---------- orientações ----------

export async function recordLegalConsultation(
  input: { topic: string; question: string; guidance: string; needsLawyer?: boolean; clientId?: string | null; contractId?: string | null },
  actor: Actor,
) {
  if (!input.topic.trim() || !input.question.trim() || !input.guidance.trim()) {
    throw new OperationError("Informe assunto, dúvida e orientação.");
  }
  const row = await prisma.legalConsultation.create({
    data: {
      topic: input.topic.trim(),
      question: input.question.trim(),
      guidance: input.guidance.trim(),
      needsLawyer: Boolean(input.needsLawyer),
      clientId: input.clientId || null,
      contractId: input.contractId || null,
      createdById: actor.userId,
    },
  });
  await audit(actor, "LegalConsultation", row.id, `Orientação jurídica registrada: ${row.topic}`);
  if (row.clientId) await timeline(actor, row.clientId, "ORIENTACAO_JURIDICA", `Orientação jurídica registrada: ${row.topic}`);
  return row;
}

export function userActor(userId: string, tool: string, source: AuditSource = "usuário"): Actor {
  return { userId, source, tool };
}
