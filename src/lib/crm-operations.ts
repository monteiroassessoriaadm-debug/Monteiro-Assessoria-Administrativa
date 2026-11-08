import "server-only";
import { prisma } from "@/lib/prisma";
import { addTimelineEvent } from "@/lib/timeline";
import { displayClientName } from "@/lib/client-display";
import { formatCurrencyBRL, onlyDigits } from "@/lib/utils";
import { parseDayKey } from "@/lib/br-time";
import { diffFields, logMcpAction, type AuditSource } from "@/lib/mcp/audit";
import { getAccountBalances } from "@/lib/account-balance";

// Regras de alteração usadas pelo conector MCP e pelas telas, para os dois
// caminhos validarem e auditarem igual. No financeiro nada se apaga: cancela
// (PENDENTE) ou estorna (já efetivado).

/** Erro de regra de negócio, com mensagem pronta para mostrar a quem pediu. */
export class OperationError extends Error {}

export type Actor = { userId: string; source: AuditSource; tool: string };

/** undefined = não mexer; "" = limpar; YYYY-MM-DD = definir. */
export function parseDayArg(value: string | null | undefined, label = "Data"): Date | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  const date = parseDayKey(value.trim());
  if (!date) throw new OperationError(`Data inválida em "${label}": "${value}". Use o formato AAAA-MM-DD (ex.: 2026-12-15).`);
  return date;
}

function requiredDay(value: string | undefined, label: string) {
  if (!value) return new Date();
  return parseDayArg(value, label) ?? new Date();
}

/** Texto: undefined = não mexer; vazio = limpar. */
function text(value: string | null | undefined) {
  if (value === undefined) return undefined;
  const trimmed = (value ?? "").trim();
  return trimmed === "" ? null : trimmed;
}

function money(value: number | undefined) {
  if (value === undefined) return undefined;
  if (!Number.isFinite(value) || value <= 0) throw new OperationError("O valor precisa ser maior que zero.");
  return value.toFixed(2);
}

function requireText(value: string | undefined, label: string) {
  if (value !== undefined && value.trim() === "") throw new OperationError(`${label} não pode ficar vazio.`);
  return value === undefined ? undefined : value.trim();
}

async function audit(
  actor: Actor,
  entity: string,
  entityId: string,
  summary: string,
  oldValue?: unknown,
  newValue?: unknown,
) {
  await logMcpAction({
    tool: actor.tool,
    summary,
    userId: actor.userId,
    source: actor.source,
    entity,
    entityId,
    oldValue,
    newValue,
  });
}

async function timeline(actor: Actor, clientId: string | null | undefined, type: string, description: string) {
  if (!clientId) return;
  await addTimelineEvent({
    clientId,
    type,
    description: actor.source === "Claude" ? `${description} (via Claude)` : description,
    createdById: actor.userId,
  });
}

async function nextPayableNumber() {
  const max = await prisma.payable.aggregate({ _max: { number: true } });
  return (max._max.number ?? 0) + 1;
}

async function nextReceivableNumber() {
  const max = await prisma.receivable.aggregate({ _max: { number: true } });
  return (max._max.number ?? 0) + 1;
}

// ---------- Contas a pagar ----------

export type PayablePatch = {
  description?: string;
  amount?: number;
  dueDate?: string | null;
  supplier?: string | null;
  accountId?: string | null;
  category?: string | null;
  notes?: string | null;
};

export async function updatePayable(id: string, patch: PayablePatch, actor: Actor) {
  const payable = await prisma.payable.findUnique({ where: { id } });
  if (!payable) throw new OperationError(`Conta a pagar "${id}" não encontrada.`);
  if (payable.status === "CANCELADO") {
    throw new OperationError(`A conta a pagar nº ${payable.number} está cancelada e não pode ser alterada.`);
  }
  if (payable.status === "PAGO" && (patch.amount !== undefined || patch.dueDate !== undefined)) {
    throw new OperationError(
      `A conta a pagar nº ${payable.number} já foi paga. Para corrigir valor, use estornar_movimentacao e lance de novo; para data ou descrição, use atualizar_movimentacao.`,
    );
  }

  const data = {
    description: requireText(patch.description, "A descrição"),
    amount: money(patch.amount),
    dueDate: parseDayArg(patch.dueDate, "Vencimento"),
    supplier: text(patch.supplier),
    accountId: text(patch.accountId),
    category: text(patch.category),
    notes: text(patch.notes),
  };
  const diff = diffFields(
    { ...payable, amount: Number(payable.amount).toFixed(2) } as Record<string, unknown>,
    data as Record<string, unknown>,
  );
  if (!diff.changed) return { payable, antes: {}, depois: {} };

  const updated = await prisma.payable.update({ where: { id }, data });
  await audit(actor, "Payable", id, `Conta a pagar nº ${payable.number} alterada`, diff.oldValue, diff.newValue);
  return { payable: updated, antes: diff.oldValue, depois: diff.newValue };
}

export async function cancelPayable(id: string, reason: string | undefined, actor: Actor) {
  const payable = await prisma.payable.findUnique({ where: { id } });
  if (!payable) throw new OperationError(`Conta a pagar "${id}" não encontrada.`);
  if (payable.status === "PAGO") {
    throw new OperationError(`A conta a pagar nº ${payable.number} já foi paga. Use estornar_movimentacao, para o caixa ficar certo.`);
  }
  if (payable.status === "CANCELADO") throw new OperationError(`A conta a pagar nº ${payable.number} já está cancelada.`);

  const notes = reason ? [payable.notes, `Cancelada: ${reason}`].filter(Boolean).join("\n") : payable.notes;
  await prisma.payable.update({ where: { id }, data: { status: "CANCELADO", notes } });
  await audit(actor, "Payable", id, `Conta a pagar nº ${payable.number} cancelada`, { status: payable.status }, { status: "CANCELADO", motivo: reason ?? null });
  return { id, numero: payable.number, status: "CANCELADO" };
}

// ---------- Contas a receber ----------

export type ReceivablePatch = {
  description?: string;
  amount?: number;
  dueDate?: string | null;
  clientId?: string | null;
  accountId?: string | null;
  category?: string | null;
  businessLine?: string | null;
  paymentMethod?: string | null;
  notes?: string | null;
};

export async function updateReceivable(id: string, patch: ReceivablePatch, actor: Actor) {
  const receivable = await prisma.receivable.findUnique({ where: { id } });
  if (!receivable) throw new OperationError(`Conta a receber "${id}" não encontrada.`);
  if (receivable.status === "CANCELADO") {
    throw new OperationError(`A conta a receber nº ${receivable.number} está cancelada e não pode ser alterada.`);
  }
  if (receivable.status === "RECEBIDO" && (patch.amount !== undefined || patch.dueDate !== undefined)) {
    throw new OperationError(
      `A conta a receber nº ${receivable.number} já foi recebida. Para corrigir valor, use estornar_movimentacao e lance de novo; para data ou descrição, use atualizar_movimentacao.`,
    );
  }

  const data = {
    description: requireText(patch.description, "A descrição"),
    amount: money(patch.amount),
    dueDate: parseDayArg(patch.dueDate, "Vencimento"),
    clientId: text(patch.clientId),
    accountId: text(patch.accountId),
    category: text(patch.category),
    businessLine: text(patch.businessLine),
    paymentMethod: text(patch.paymentMethod),
    notes: text(patch.notes),
  };
  const diff = diffFields(
    { ...receivable, amount: Number(receivable.amount).toFixed(2) } as Record<string, unknown>,
    data as Record<string, unknown>,
  );
  if (!diff.changed) return { receivable, antes: {}, depois: {} };

  const updated = await prisma.receivable.update({ where: { id }, data });
  await audit(actor, "Receivable", id, `Conta a receber nº ${receivable.number} alterada`, diff.oldValue, diff.newValue);
  await timeline(actor, updated.clientId, "CONTA_A_RECEBER_STATUS", `Conta a receber nº ${receivable.number} alterada`);
  return { receivable: updated, antes: diff.oldValue, depois: diff.newValue };
}

export async function cancelReceivable(id: string, reason: string | undefined, actor: Actor) {
  const receivable = await prisma.receivable.findUnique({ where: { id } });
  if (!receivable) throw new OperationError(`Conta a receber "${id}" não encontrada.`);
  if (receivable.status === "RECEBIDO") {
    throw new OperationError(`A conta a receber nº ${receivable.number} já foi recebida. Use estornar_movimentacao, para o caixa e a meta ficarem certos.`);
  }
  if (receivable.status === "CANCELADO") throw new OperationError(`A conta a receber nº ${receivable.number} já está cancelada.`);

  const notes = reason ? [receivable.notes, `Cancelada: ${reason}`].filter(Boolean).join("\n") : receivable.notes;
  await prisma.receivable.update({ where: { id }, data: { status: "CANCELADO", notes } });
  await audit(actor, "Receivable", id, `Conta a receber nº ${receivable.number} cancelada`, { status: receivable.status }, { status: "CANCELADO", motivo: reason ?? null });
  await timeline(actor, receivable.clientId, "CONTA_A_RECEBER_STATUS", `Conta a receber nº ${receivable.number} cancelada`);
  return { id, numero: receivable.number, status: "CANCELADO" };
}

// ---------- Movimentações (entrada = recebido; saída = pago) ----------

export type MovementType = "entrada" | "saida";

/** Gera o lançamento inverso e marca o original. Nunca apaga nem altera o valor original. */
export async function reverseMovement(
  tipo: MovementType,
  id: string,
  params: { date?: string; reason?: string },
  actor: Actor,
) {
  const when = requiredDay(params.date, "Data do estorno");

  if (tipo === "entrada") {
    const original = await prisma.receivable.findUnique({ where: { id } });
    if (!original) throw new OperationError(`Entrada "${id}" não encontrada.`);
    if (original.status !== "RECEBIDO") throw new OperationError(`A conta a receber nº ${original.number} ainda não foi recebida. Use cancelar_conta_receber.`);
    if (original.reversedAt) throw new OperationError(`A entrada nº ${original.number} já foi estornada.`);
    if (original.reversesPayableId) throw new OperationError(`A entrada nº ${original.number} já é um estorno e não pode ser estornada de novo.`);

    const number = await nextPayableNumber();
    const reversal = await prisma.$transaction(async (tx) => {
      await tx.receivable.update({ where: { id }, data: { reversedAt: when } });
      return tx.payable.create({
        data: {
          number,
          description: `Estorno da entrada nº ${original.number}: ${original.description}`,
          category: "Estorno",
          amount: original.amount,
          status: "PAGO",
          dueDate: when,
          paidAt: when,
          accountId: original.accountId,
          notes: params.reason ?? null,
          reversesReceivableId: original.id,
          createdById: actor.userId,
        },
      });
    });
    await audit(actor, "Receivable", id, `Entrada nº ${original.number} estornada (${formatCurrencyBRL(Number(original.amount))})`, { reversedAt: null }, { reversedAt: when, estorno: `Saída nº ${reversal.number}`, motivo: params.reason ?? null });
    await timeline(actor, original.clientId, "CONTA_A_RECEBER_STATUS", `Entrada nº ${original.number} estornada`);
    return { estornado: `Entrada nº ${original.number}`, lancamentoInverso: { tipo: "saida", id: reversal.id, numero: reversal.number } };
  }

  const original = await prisma.payable.findUnique({ where: { id } });
  if (!original) throw new OperationError(`Saída "${id}" não encontrada.`);
  if (original.status !== "PAGO") throw new OperationError(`A conta a pagar nº ${original.number} ainda não foi paga. Use cancelar_conta_pagar.`);
  if (original.reversedAt) throw new OperationError(`A saída nº ${original.number} já foi estornada.`);
  if (original.reversesReceivableId) throw new OperationError(`A saída nº ${original.number} já é um estorno e não pode ser estornada de novo.`);

  const commission = await prisma.commission.findUnique({ where: { payableId: id } });
  const number = await nextReceivableNumber();
  const reversal = await prisma.$transaction(async (tx) => {
    await tx.payable.update({ where: { id }, data: { reversedAt: when } });
    // Pagamento de comissão estornado: a comissão volta a ficar pendente.
    if (commission) {
      await tx.commission.update({ where: { id: commission.id }, data: { status: "PENDENTE", paidAt: null, payableId: null } });
    }
    return tx.receivable.create({
      data: {
        number,
        description: `Estorno da saída nº ${original.number}: ${original.description}`,
        category: "Estorno",
        amount: original.amount,
        status: "RECEBIDO",
        dueDate: when,
        receivedAt: when,
        accountId: original.accountId,
        notes: params.reason ?? null,
        reversesPayableId: original.id,
        createdById: actor.userId,
      },
    });
  });
  await audit(actor, "Payable", id, `Saída nº ${original.number} estornada (${formatCurrencyBRL(Number(original.amount))})`, { reversedAt: null }, { reversedAt: when, estorno: `Entrada nº ${reversal.number}`, motivo: params.reason ?? null });
  return { estornado: `Saída nº ${original.number}`, lancamentoInverso: { tipo: "entrada", id: reversal.id, numero: reversal.number } };
}

/** Só descrição, categoria e data: valor e conta de lançamento efetivado se corrigem por estorno. */
export async function updateMovement(
  tipo: MovementType,
  id: string,
  patch: { description?: string; category?: string | null; date?: string },
  actor: Actor,
) {
  const description = requireText(patch.description, "A descrição");
  const category = text(patch.category);
  if (patch.date === "") throw new OperationError("A data de uma movimentação não pode ficar vazia.");
  const date = patch.date ? parseDayArg(patch.date, "Data") ?? undefined : undefined;

  if (tipo === "entrada") {
    const row = await prisma.receivable.findUnique({ where: { id } });
    if (!row) throw new OperationError(`Entrada "${id}" não encontrada.`);
    if (row.status !== "RECEBIDO") throw new OperationError(`A conta a receber nº ${row.number} não é uma movimentação efetivada. Use atualizar_conta_receber.`);
    const data = { description, category, receivedAt: date };
    const diff = diffFields(row as Record<string, unknown>, data as Record<string, unknown>);
    if (!diff.changed) return { id, antes: {}, depois: {} };
    await prisma.receivable.update({ where: { id }, data });
    await audit(actor, "Receivable", id, `Entrada nº ${row.number} alterada`, diff.oldValue, diff.newValue);
    return { id, antes: diff.oldValue, depois: diff.newValue };
  }

  const row = await prisma.payable.findUnique({ where: { id } });
  if (!row) throw new OperationError(`Saída "${id}" não encontrada.`);
  if (row.status !== "PAGO") throw new OperationError(`A conta a pagar nº ${row.number} não é uma movimentação efetivada. Use atualizar_conta_pagar.`);
  const data = { description, category, paidAt: date };
  const diff = diffFields(row as Record<string, unknown>, data as Record<string, unknown>);
  if (!diff.changed) return { id, antes: {}, depois: {} };
  await prisma.payable.update({ where: { id }, data });
  await audit(actor, "Payable", id, `Saída nº ${row.number} alterada`, diff.oldValue, diff.newValue);
  return { id, antes: diff.oldValue, depois: diff.newValue };
}

// ---------- Ajuste de saldo ----------

/**
 * Informa quanto a conta tem de verdade hoje. Grava só a diferença, sem apagar
 * nem alterar nenhum lançamento; o ajuste não conta como faturamento nem despesa.
 */
export async function adjustBalance(
  params: { accountId: string; realBalance: number; reason?: string },
  actor: Actor,
) {
  if (!Number.isFinite(params.realBalance)) throw new OperationError("Informe quanto a conta tem hoje, como 950,00.");
  const balances = await getAccountBalances();
  const account = balances.find((b) => b.accountId === params.accountId);
  if (!account) throw new OperationError(`Conta "${params.accountId}" não encontrada.`);

  const difference = Math.round((params.realBalance - account.current) * 100) / 100;
  if (difference === 0) {
    throw new OperationError(`O saldo de ${account.name} já é ${formatCurrencyBRL(account.current)}. Nada para ajustar.`);
  }

  const reason = text(params.reason) ?? null;
  const adjustment = await prisma.balanceAdjustment.create({
    data: {
      accountId: account.accountId,
      amount: difference.toFixed(2),
      newBalance: params.realBalance.toFixed(2),
      reason,
      createdById: actor.userId,
    },
  });
  await audit(
    actor,
    "BalanceAdjustment",
    adjustment.id,
    `Saldo de ${account.name} ajustado para ${formatCurrencyBRL(params.realBalance)}`,
    { saldo: account.current },
    { saldo: params.realBalance, diferenca: difference, motivo: reason },
  );
  return {
    conta: account.name,
    saldoAnterior: account.current,
    saldoNovo: params.realBalance,
    diferenca: difference,
  };
}

// ---------- Comissões ----------

const COMMISSION_LABEL: Record<string, string> = {
  SALARIO_FIXO: "Salário / fixo",
  COMISSAO: "Comissão",
  OUTRO_PAGAMENTO: "Outro pagamento",
};

export async function payCommission(id: string, params: { date?: string; accountId?: string | null }, actor: Actor) {
  const commission = await prisma.commission.findUnique({ where: { id }, include: { user: true } });
  if (!commission) throw new OperationError(`Comissão "${id}" não encontrada.`);
  if (commission.status === "PAGO") throw new OperationError("Essa comissão já está paga.");
  if (commission.status === "CANCELADO") throw new OperationError("Essa comissão está cancelada e não pode ser paga.");

  const when = requiredDay(params.date, "Data do pagamento");
  const number = await nextPayableNumber();
  const label = COMMISSION_LABEL[commission.category] ?? "Pagamento";

  // Sem conta informada, usa a do lançamento ou a única conta ativa; sem conta a saída não abateria saldo nenhum.
  let accountId = params.accountId ?? commission.accountId;
  if (!accountId) {
    const active = await prisma.financialAccount.findMany({ where: { active: true }, take: 2 });
    if (active.length !== 1) {
      throw new OperationError("Informe de qual conta o valor saiu: há mais de uma conta ativa, ou nenhuma.");
    }
    accountId = active[0].id;
  }

  const payable = await prisma.$transaction(async (tx) => {
    const created = await tx.payable.create({
      data: {
        number,
        description: `${label} — ${commission.user.name}`,
        category: label,
        supplier: commission.user.name,
        amount: commission.amount,
        status: "PAGO",
        dueDate: when,
        paidAt: when,
        accountId,
        createdById: actor.userId,
      },
    });
    await tx.commission.update({ where: { id }, data: { status: "PAGO", paidAt: when, payableId: created.id, accountId } });
    return created;
  });

  await audit(actor, "Commission", id, `${label} de ${commission.user.name} paga (${formatCurrencyBRL(Number(commission.amount))})`, { status: commission.status }, { status: "PAGO", paidAt: when, saida: `Saída nº ${payable.number}` });
  await timeline(actor, commission.clientId, "COMISSAO_LANCADA", `${label} de ${commission.user.name} paga`);
  return { id, status: "PAGO", saidaNoCaixa: { id: payable.id, numero: payable.number } };
}

export async function cancelCommission(id: string, reason: string | undefined, actor: Actor) {
  const commission = await prisma.commission.findUnique({ where: { id } });
  if (!commission) throw new OperationError(`Comissão "${id}" não encontrada.`);
  if (commission.status === "CANCELADO") throw new OperationError("Essa comissão já está cancelada.");
  if (commission.status === "PAGO") {
    throw new OperationError(
      commission.payableId
        ? `Essa comissão já foi paga. Estorne a saída no caixa com estornar_movimentacao (tipo "saida", id ${commission.payableId}); ela volta a pendente e aí pode ser cancelada.`
        : "Essa comissão foi paga antes do controle de saídas no caixa e não pode ser cancelada por aqui.",
    );
  }

  const notes = reason ? [commission.notes, `Cancelada: ${reason}`].filter(Boolean).join("\n") : commission.notes;
  await prisma.commission.update({ where: { id }, data: { status: "CANCELADO", notes } });
  await audit(actor, "Commission", id, "Comissão cancelada", { status: commission.status }, { status: "CANCELADO", motivo: reason ?? null });
  return { id, status: "CANCELADO" };
}

// ---------- Clientes ----------

export type ClientPatch = {
  name?: string;
  whatsapp?: string | null;
  phone?: string | null;
  email?: string | null;
  instagram?: string | null;
  document?: string | null;
  addressStreet?: string | null;
  addressNumber?: string | null;
  addressComplement?: string | null;
  addressNeighborhood?: string | null;
  addressCity?: string | null;
  addressState?: string | null;
  addressZip?: string | null;
  notes?: string | null;
};

export async function updateClient(id: string, patch: ClientPatch, actor: Actor) {
  const client = await prisma.client.findUnique({ where: { id } });
  if (!client) throw new OperationError(`Cliente "${id}" não encontrado.`);

  const name = requireText(patch.name, "O nome");
  const email = text(patch.email);
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new OperationError(`E-mail inválido: "${email}".`);

  const documentFields: { cpf?: string | null; cnpj?: string | null } = {};
  if (patch.document !== undefined) {
    const digits = onlyDigits(patch.document);
    const expected = client.type === "PF" ? 11 : 14;
    if (digits && digits.length !== expected) {
      throw new OperationError(`Documento inválido: ${client.type === "PF" ? "CPF" : "CNPJ"} precisa de ${expected} dígitos, e foram informados ${digits.length}.`);
    }
    if (client.type === "PF") documentFields.cpf = digits || null;
    else documentFields.cnpj = digits || null;
  }

  const data = {
    ...(client.type === "PF" ? { fullName: name } : { tradeName: name }),
    ...documentFields,
    whatsapp: text(patch.whatsapp),
    phone: text(patch.phone),
    email,
    instagram: text(patch.instagram),
    addressStreet: text(patch.addressStreet),
    addressNumber: text(patch.addressNumber),
    addressComplement: text(patch.addressComplement),
    addressNeighborhood: text(patch.addressNeighborhood),
    addressCity: text(patch.addressCity),
    addressState: text(patch.addressState),
    addressZip: text(patch.addressZip),
    notes: text(patch.notes),
  };
  const diff = diffFields(client as Record<string, unknown>, data as Record<string, unknown>);
  if (!diff.changed) return { id, antes: {}, depois: {} };

  try {
    await prisma.client.update({ where: { id }, data });
  } catch (e) {
    if ((e as { code?: string }).code === "P2002") throw new OperationError("Já existe outro cliente com esse CPF/CNPJ.");
    throw e;
  }
  await audit(actor, "Client", id, `Cliente "${displayClientName(client)}" alterado`, diff.oldValue, diff.newValue);
  await timeline(actor, id, "CLIENTE_ATUALIZADO", "Cadastro do cliente alterado");
  return { id, antes: diff.oldValue, depois: diff.newValue };
}

// ---------- Leads ----------

export type LeadPatch = {
  name?: string;
  whatsapp?: string | null;
  serviceInterestId?: string | null;
  origin?: string | null;
  notes?: string | null;
  stage?: string;
  nextContactDate?: string | null;
};

export async function updateLead(id: string, patch: LeadPatch, actor: Actor) {
  const lead = await prisma.lead.findUnique({ where: { id } });
  if (!lead) throw new OperationError(`Lead "${id}" não encontrado.`);

  const nextContactDate = parseDayArg(patch.nextContactDate, "Próximo contato");
  const data = {
    name: requireText(patch.name, "O nome"),
    whatsapp: text(patch.whatsapp),
    serviceInterestId: text(patch.serviceInterestId),
    origin: text(patch.origin),
    notes: text(patch.notes),
    stage: patch.stage as typeof lead.stage | undefined,
    nextContactDate,
  };
  const diff = diffFields(lead as Record<string, unknown>, data as Record<string, unknown>);
  if (!diff.changed) return { id, antes: {}, depois: {} };

  // Etapa ou próximo contato indicam que houve contato; corrigir um cadastro, não.
  const touched = patch.stage !== undefined || patch.nextContactDate !== undefined;
  await prisma.lead.update({
    where: { id },
    data: { ...data, lastContactDate: touched ? new Date() : undefined },
  });
  await audit(actor, "Lead", id, `Lead "${lead.name}" alterado`, diff.oldValue, diff.newValue);
  await timeline(actor, lead.clientId, "LEAD_ATUALIZADO", `Lead "${lead.name}" alterado`);
  return { id, antes: diff.oldValue, depois: diff.newValue };
}

// ---------- Orçamentos ----------

export type QuoteItemInput = {
  description: string;
  quantity: number;
  unitPrice: number;
  serviceId?: string | null;
  termDays?: number | null;
};

export async function updateQuote(
  id: string,
  patch: { paymentTerms?: string | null; validUntil?: string | null; notes?: string | null; items?: QuoteItemInput[] },
  actor: Actor,
) {
  const quote = await prisma.quote.findUnique({ where: { id }, include: { items: true } });
  if (!quote) throw new OperationError(`Orçamento "${id}" não encontrado.`);
  if (quote.status === "CANCELADO") throw new OperationError(`O orçamento nº ${quote.number} está cancelado e não pode ser alterado.`);
  if (quote.status === "APROVADO" && patch.items) {
    throw new OperationError(`O orçamento nº ${quote.number} já foi aprovado; os itens e valores não podem mais mudar.`);
  }
  if (patch.items && patch.items.length === 0) throw new OperationError("O orçamento precisa de ao menos um item.");

  const data = {
    paymentTerms: text(patch.paymentTerms),
    validUntil: parseDayArg(patch.validUntil, "Validade"),
    notes: text(patch.notes),
  };
  const diff = diffFields(quote as unknown as Record<string, unknown>, data as Record<string, unknown>);
  const oldValue: Record<string, unknown> = { ...diff.oldValue };
  const newValue: Record<string, unknown> = { ...diff.newValue };
  const summarize = (items: { description: string; quantity: number; unitPrice: unknown }[]) =>
    items.map((i) => ({ descricao: i.description, quantidade: i.quantity, valorUnitario: Number(i.unitPrice) }));
  if (patch.items) {
    oldValue.itens = summarize(quote.items);
    newValue.itens = summarize(patch.items);
  }
  if (Object.keys(newValue).length === 0) return { id, antes: {}, depois: {} };

  await prisma.$transaction(async (tx) => {
    await tx.quote.update({ where: { id }, data });
    if (patch.items) {
      await tx.quoteItem.deleteMany({ where: { quoteId: id } });
      await tx.quoteItem.createMany({
        data: patch.items.map((i) => ({
          quoteId: id,
          description: i.description,
          quantity: i.quantity,
          unitPrice: i.unitPrice.toFixed(2),
          serviceId: i.serviceId ?? null,
          termDays: i.termDays ?? null,
        })),
      });
    }
  });
  await audit(actor, "Quote", id, `Orçamento nº ${quote.number} alterado`, oldValue, newValue);
  await timeline(actor, quote.clientId, "ORCAMENTO_ATUALIZADO", `Orçamento nº ${quote.number} alterado`);
  return { id, antes: oldValue, depois: newValue };
}

export async function cancelQuote(id: string, reason: string | undefined, actor: Actor) {
  const quote = await prisma.quote.findUnique({
    where: { id },
    include: { _count: { select: { serviceInstances: true, receivables: true } } },
  });
  if (!quote) throw new OperationError(`Orçamento "${id}" não encontrado.`);
  if (quote.status === "CANCELADO") throw new OperationError(`O orçamento nº ${quote.number} já está cancelado.`);
  if (quote._count.serviceInstances > 0 || quote._count.receivables > 0) {
    throw new OperationError(`O orçamento nº ${quote.number} já gerou serviço ou conta a receber. Cancele esses lançamentos antes.`);
  }

  const notes = reason ? [quote.notes, `Cancelado: ${reason}`].filter(Boolean).join("\n") : quote.notes;
  await prisma.quote.update({ where: { id }, data: { status: "CANCELADO", notes } });
  await audit(actor, "Quote", id, `Orçamento nº ${quote.number} cancelado`, { status: quote.status }, { status: "CANCELADO", motivo: reason ?? null });
  await timeline(actor, quote.clientId, "ORCAMENTO_CANCELADO", `Orçamento nº ${quote.number} cancelado`);
  return { id, numero: quote.number, status: "CANCELADO" };
}

/** Só registra o aceite. Os desdobramentos da venda (cobrança, entrega, comissão) ficam para a Fase 2. */
export async function acceptQuote(id: string, actor: Actor) {
  const quote = await prisma.quote.findUnique({ where: { id } });
  if (!quote) throw new OperationError(`Orçamento "${id}" não encontrado.`);
  if (quote.status === "APROVADO") throw new OperationError(`O orçamento nº ${quote.number} já foi aceito.`);
  if (quote.status === "CANCELADO" || quote.status === "RECUSADO" || quote.status === "EXPIRADO") {
    throw new OperationError(`O orçamento nº ${quote.number} está ${quote.status.toLowerCase()} e não pode ser aceito. Crie um novo.`);
  }

  const respondedAt = new Date();
  await prisma.quote.update({ where: { id }, data: { status: "APROVADO", respondedAt } });
  await audit(actor, "Quote", id, `Orçamento nº ${quote.number} aceito`, { status: quote.status }, { status: "APROVADO", respondedAt });
  await timeline(actor, quote.clientId, "ORCAMENTO_APROVADO", `Orçamento nº ${quote.number} aceito`);
  return { id, numero: quote.number, status: "APROVADO" };
}

// ---------- Propostas ----------

export type ProposalPatch = {
  demand?: string;
  solution?: string;
  scope?: string | null;
  termText?: string | null;
  investment?: number | null;
  paymentTerms?: string | null;
  validUntil?: string | null;
  notes?: string | null;
};

export async function updateProposal(id: string, patch: ProposalPatch, actor: Actor) {
  const proposal = await prisma.proposal.findUnique({ where: { id } });
  if (!proposal) throw new OperationError(`Proposta "${id}" não encontrada.`);
  if (proposal.status === "CANCELADA") throw new OperationError(`A proposta nº ${proposal.number} está cancelada e não pode ser alterada.`);
  if (proposal.status === "APROVADA" && patch.investment !== undefined) {
    throw new OperationError(`A proposta nº ${proposal.number} já foi aprovada; o investimento não pode mais mudar.`);
  }

  const data = {
    demand: requireText(patch.demand, "A demanda"),
    solution: requireText(patch.solution, "A solução"),
    scope: text(patch.scope),
    termText: text(patch.termText),
    investment: patch.investment === null ? null : money(patch.investment ?? undefined),
    paymentTerms: text(patch.paymentTerms),
    validUntil: parseDayArg(patch.validUntil, "Validade"),
    notes: text(patch.notes),
  };
  const diff = diffFields(
    { ...proposal, investment: proposal.investment === null ? null : Number(proposal.investment).toFixed(2) } as Record<string, unknown>,
    data as Record<string, unknown>,
  );
  if (!diff.changed) return { id, antes: {}, depois: {} };

  await prisma.proposal.update({ where: { id }, data });
  await audit(actor, "Proposal", id, `Proposta nº ${proposal.number} alterada`, diff.oldValue, diff.newValue);
  await timeline(actor, proposal.clientId, "PROPOSTA_ATUALIZADA", `Proposta nº ${proposal.number} alterada`);
  return { id, antes: diff.oldValue, depois: diff.newValue };
}

export async function cancelProposal(id: string, reason: string | undefined, actor: Actor) {
  const proposal = await prisma.proposal.findUnique({
    where: { id },
    include: { _count: { select: { serviceInstances: true } } },
  });
  if (!proposal) throw new OperationError(`Proposta "${id}" não encontrada.`);
  if (proposal.status === "CANCELADA") throw new OperationError(`A proposta nº ${proposal.number} já está cancelada.`);
  if (proposal._count.serviceInstances > 0) {
    throw new OperationError(`A proposta nº ${proposal.number} já gerou serviço. Cancele o serviço antes.`);
  }

  const notes = reason ? [proposal.notes, `Cancelada: ${reason}`].filter(Boolean).join("\n") : proposal.notes;
  await prisma.proposal.update({ where: { id }, data: { status: "CANCELADA", notes } });
  await audit(actor, "Proposal", id, `Proposta nº ${proposal.number} cancelada`, { status: proposal.status }, { status: "CANCELADA", motivo: reason ?? null });
  await timeline(actor, proposal.clientId, "PROPOSTA_CANCELADA", `Proposta nº ${proposal.number} cancelada`);
  return { id, numero: proposal.number, status: "CANCELADA" };
}

// ---------- Tarefas ----------

export async function updateTask(
  id: string,
  patch: { title?: string; description?: string | null; dueDate?: string | null; assignedToId?: string | null },
  actor: Actor,
) {
  const task = await prisma.task.findUnique({ where: { id } });
  if (!task) throw new OperationError(`Tarefa "${id}" não encontrada.`);

  const data = {
    title: requireText(patch.title, "O título"),
    description: text(patch.description),
    dueDate: parseDayArg(patch.dueDate, "Prazo"),
    assignedToId: text(patch.assignedToId),
  };
  const diff = diffFields(task as Record<string, unknown>, data as Record<string, unknown>);
  if (!diff.changed) return { id, antes: {}, depois: {} };

  await prisma.task.update({ where: { id }, data });
  await audit(actor, "Task", id, `Tarefa "${task.title}" alterada`, diff.oldValue, diff.newValue);
  return { id, antes: diff.oldValue, depois: diff.newValue };
}

export async function deleteTask(id: string, actor: Actor) {
  const task = await prisma.task.findUnique({ where: { id } });
  if (!task) throw new OperationError(`Tarefa "${id}" não encontrada.`);
  await prisma.task.delete({ where: { id } });
  await audit(actor, "Task", id, `Tarefa "${task.title}" excluída`, task, null);
  return { id, excluida: task.title };
}

// ---------- Prospecção ----------

export async function deleteProspect(id: string, actor: Actor) {
  const prospect = await prisma.prospectingEntry.findUnique({ where: { id } });
  if (!prospect) throw new OperationError(`Prospecção "${id}" não encontrada.`);
  await prisma.prospectingEntry.delete({ where: { id } });
  await audit(actor, "ProspectingEntry", id, `Prospecção "${prospect.name}" excluída`, prospect, null);
  return { id, excluida: prospect.name };
}

/** O mais recente de dois dias. */
function latest(a: Date | null, b: Date | null) {
  if (!a) return b;
  if (!b) return a;
  return a > b ? a : b;
}

/**
 * Junta duas fichas na primeira. Campos vazios são preenchidos pela segunda e as
 * observações das duas ficam juntas; a ficha completa da segunda vai para o histórico.
 */
export async function mergeProspects(
  keepId: string,
  absorbId: string,
  params: { nextContactDate?: string | null },
  actor: Actor,
) {
  if (keepId === absorbId) throw new OperationError("Informe duas fichas diferentes para mesclar.");
  const [keep, absorb] = await Promise.all([
    prisma.prospectingEntry.findUnique({ where: { id: keepId } }),
    prisma.prospectingEntry.findUnique({ where: { id: absorbId } }),
  ]);
  if (!keep) throw new OperationError(`Prospecção "${keepId}" não encontrada.`);
  if (!absorb) throw new OperationError(`Prospecção "${absorbId}" não encontrada.`);
  if (keep.convertedLeadId && absorb.convertedLeadId && keep.convertedLeadId !== absorb.convertedLeadId) {
    throw new OperationError("As duas fichas já viraram leads diferentes. Resolva os leads antes de mesclar.");
  }

  const chosenNext = parseDayArg(params.nextContactDate, "Próximo contato");
  const notes = [
    keep.notes,
    absorb.notes && `[Da ficha mesclada] ${absorb.notes}`,
    absorb.result && `[Resultado da ficha mesclada] ${absorb.result}`,
  ]
    .filter(Boolean)
    .join("\n");

  const data = {
    segment: keep.segment ?? absorb.segment,
    city: keep.city ?? absorb.city,
    contactName: keep.contactName ?? absorb.contactName,
    whatsapp: keep.whatsapp ?? absorb.whatsapp,
    instagram: keep.instagram ?? absorb.instagram,
    potentialServiceId: keep.potentialServiceId ?? absorb.potentialServiceId,
    responsibleId: keep.responsibleId ?? absorb.responsibleId,
    contactDate: latest(keep.contactDate, absorb.contactDate),
    result: keep.result ?? absorb.result,
    nextContactDate: chosenNext === undefined ? latest(keep.nextContactDate, absorb.nextContactDate) : chosenNext,
    notes: notes || null,
    convertedLeadId: keep.convertedLeadId ?? absorb.convertedLeadId,
  };

  await prisma.$transaction(async (tx) => {
    await tx.prospectingEntry.update({ where: { id: keepId }, data });
    await tx.prospectingEntry.delete({ where: { id: absorbId } });
  });
  await audit(actor, "ProspectingEntry", keepId, `Fichas de "${keep.name}" mescladas`, { mantida: keep, absorvida: absorb }, data);
  return { id: keepId, nome: keep.name, fichaAbsorvida: absorbId, depois: data };
}
