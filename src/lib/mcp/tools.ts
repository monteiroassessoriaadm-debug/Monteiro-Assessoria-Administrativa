import "server-only";
import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { prisma } from "@/lib/prisma";
import { getAccountBalances } from "@/lib/account-balance";
import { displayClientName } from "@/lib/client-display";
import { formatCurrencyBRL, formatDateBR } from "@/lib/utils";
import { addTimelineEvent } from "@/lib/timeline";
import { logMcpAction, logClientTimelineViaClaude } from "@/lib/mcp/audit";
import { brTodayRange } from "@/lib/br-time";

type Ctx = { userId: string };

export function textResult(data: unknown): CallToolResult {
  const text = typeof data === "string" ? data : JSON.stringify(data, null, 2);
  return { content: [{ type: "text", text }] };
}

export function errorResult(message: string): CallToolResult {
  return { content: [{ type: "text", text: message }], isError: true };
}

export async function resolveAccountId(nameOrId: string | undefined): Promise<
  { ok: true; accountId: string | null } | { ok: false; error: string }
> {
  if (!nameOrId) return { ok: true, accountId: null };
  const byId = await prisma.financialAccount.findUnique({ where: { id: nameOrId } });
  if (byId) return { ok: true, accountId: byId.id };

  const matches = await prisma.financialAccount.findMany({
    where: { name: { contains: nameOrId, mode: "insensitive" } },
  });
  if (matches.length === 1) return { ok: true, accountId: matches[0].id };
  if (matches.length === 0) {
    return { ok: false, error: `Nenhuma conta encontrada com o nome "${nameOrId}".` };
  }
  return {
    ok: false,
    error: `Mais de uma conta encontrada para "${nameOrId}": ${matches.map((m) => m.name).join(", ")}. Seja mais específico.`,
  };
}

export async function resolveClientId(nameOrId: string | undefined): Promise<
  { ok: true; clientId: string | null } | { ok: false; error: string }
> {
  if (!nameOrId) return { ok: true, clientId: null };
  const byId = await prisma.client.findUnique({ where: { id: nameOrId } });
  if (byId) return { ok: true, clientId: byId.id };

  const matches = await prisma.client.findMany({
    where: {
      OR: [
        { fullName: { contains: nameOrId, mode: "insensitive" } },
        { tradeName: { contains: nameOrId, mode: "insensitive" } },
        { legalName: { contains: nameOrId, mode: "insensitive" } },
      ],
    },
    take: 5,
  });
  if (matches.length === 1) return { ok: true, clientId: matches[0].id };
  if (matches.length === 0) {
    return { ok: false, error: `Nenhum cliente encontrado para "${nameOrId}".` };
  }
  return {
    ok: false,
    error: `Mais de um cliente encontrado para "${nameOrId}": ${matches.map((m) => displayClientName(m)).join(", ")}. Seja mais específico.`,
  };
}

/** Resolve um cliente OU um lead (já convertido) a partir de nome/ID — usado onde o chamador pode informar qualquer um dos dois. */
export async function resolveClientOrLeadToClientId(identifier: string): Promise<
  { ok: true; clientId: string } | { ok: false; error: string }
> {
  const clientById = await prisma.client.findUnique({ where: { id: identifier } });
  if (clientById) return { ok: true, clientId: clientById.id };

  const leadById = await prisma.lead.findUnique({ where: { id: identifier } });
  if (leadById) {
    if (leadById.clientId) return { ok: true, clientId: leadById.clientId };
    return {
      ok: false,
      error: `O lead "${leadById.name}" ainda não foi convertido em cliente. Use converter_lead_em_cliente primeiro.`,
    };
  }

  const [clientMatches, leadMatches] = await Promise.all([
    prisma.client.findMany({
      where: {
        OR: [
          { fullName: { contains: identifier, mode: "insensitive" } },
          { tradeName: { contains: identifier, mode: "insensitive" } },
          { legalName: { contains: identifier, mode: "insensitive" } },
        ],
      },
      take: 5,
    }),
    prisma.lead.findMany({
      where: { name: { contains: identifier, mode: "insensitive" } },
      take: 5,
    }),
  ]);

  const total = clientMatches.length + leadMatches.length;
  if (total === 0) {
    return { ok: false, error: `Nenhum cliente ou lead encontrado para "${identifier}".` };
  }
  if (total > 1) {
    return {
      ok: false,
      error: `Mais de um resultado para "${identifier}" entre clientes e leads. Seja mais específico ou use o ID.`,
    };
  }
  if (clientMatches.length === 1) return { ok: true, clientId: clientMatches[0].id };

  const lead = leadMatches[0];
  if (lead.clientId) return { ok: true, clientId: lead.clientId };
  return {
    ok: false,
    error: `O lead "${lead.name}" ainda não foi convertido em cliente. Use converter_lead_em_cliente primeiro.`,
  };
}

/** Resolve um serviço do catálogo por nome/ID. Nunca erra por "não encontrado" — só por ambiguidade — já que o texto pode ser livre. */
export async function resolveServiceId(nameOrId: string | undefined): Promise<
  { ok: true; serviceId: string | null } | { ok: false; error: string }
> {
  if (!nameOrId) return { ok: true, serviceId: null };
  const byId = await prisma.service.findUnique({ where: { id: nameOrId } });
  if (byId) return { ok: true, serviceId: byId.id };

  const matches = await prisma.service.findMany({
    where: { name: { contains: nameOrId, mode: "insensitive" } },
    take: 5,
  });
  if (matches.length === 1) return { ok: true, serviceId: matches[0].id };
  if (matches.length === 0) return { ok: true, serviceId: null };
  return {
    ok: false,
    error: `Mais de um serviço do catálogo encontrado para "${nameOrId}": ${matches.map((m) => m.name).join(", ")}. Seja mais específico.`,
  };
}

export function registerCrmTools(server: McpServer, ctx: Ctx) {
  // ---------- resumo_do_dia ----------
  server.registerTool(
    "resumo_do_dia",
    {
      title: "Resumo do dia",
      description:
        "Visão geral do CRM agora: progresso das metas, saldo por conta, contas a receber/pagar pendentes e vencidas, tarefas atrasadas/hoje/próximas, leads com follow-up vencido, agenda de hoje (com a situação de cada compromisso e quantos já foram concluídos) e conteúdos de mídia dos próximos 7 dias.",
      inputSchema: {},
    },
    async () => {
      const { start: startOfToday, end: endOfToday } = brTodayRange();
      const next7Days = new Date(endOfToday.getTime() + 7 * 24 * 60 * 60 * 1000);

      const [
        balances,
        receivablesPendentes,
        receivablesVencidas,
        payablesPendentes,
        payablesVencidas,
        tarefasAtrasadas,
        tarefasHoje,
        tarefasProximas,
        leadsFollowUpVencido,
      ] = await Promise.all([
        getAccountBalances(),
        prisma.receivable.aggregate({ where: { status: "PENDENTE" }, _sum: { amount: true }, _count: true }),
        prisma.receivable.aggregate({
          where: { status: "PENDENTE", dueDate: { lt: startOfToday } },
          _sum: { amount: true },
          _count: true,
        }),
        prisma.payable.aggregate({ where: { status: "PENDENTE" }, _sum: { amount: true }, _count: true }),
        prisma.payable.aggregate({
          where: { status: "PENDENTE", dueDate: { lt: startOfToday } },
          _sum: { amount: true },
          _count: true,
        }),
        prisma.task.findMany({
          where: { status: "PENDENTE", dueDate: { lt: startOfToday } },
          orderBy: { dueDate: "asc" },
          take: 20,
        }),
        prisma.task.findMany({
          where: { status: "PENDENTE", dueDate: { gte: startOfToday, lte: endOfToday } },
          orderBy: { dueDate: "asc" },
          take: 20,
        }),
        prisma.task.findMany({
          where: { status: "PENDENTE", dueDate: { gt: endOfToday, lte: next7Days } },
          orderBy: { dueDate: "asc" },
          take: 20,
        }),
        prisma.lead.findMany({
          where: {
            stage: { notIn: ["CONTRATADO", "PERDIDO"] },
            nextContactDate: { lte: endOfToday, not: null },
          },
          orderBy: { nextContactDate: "asc" },
          take: 20,
        }),
      ]);

      const { agendaEConteudosResumo } = await import("@/lib/mcp/tools-extra");
      const extra = await agendaEConteudosResumo();
      const { getGoalsProgress } = await import("@/lib/goals");
      const { goalsForTool } = await import("@/lib/mcp/tools-fase1");

      return textResult({
        metas: goalsForTool(await getGoalsProgress()),
        ...extra,
        saldoPorConta: balances.map((b) => ({
          conta: b.name,
          saldoAtual: b.current,
          saldoAtualFormatado: formatCurrencyBRL(b.current),
        })),
        contasAReceber: {
          pendentes: { quantidade: receivablesPendentes._count, total: Number(receivablesPendentes._sum.amount ?? 0) },
          vencidas: { quantidade: receivablesVencidas._count, total: Number(receivablesVencidas._sum.amount ?? 0) },
        },
        contasAPagar: {
          pendentes: { quantidade: payablesPendentes._count, total: Number(payablesPendentes._sum.amount ?? 0) },
          vencidas: { quantidade: payablesVencidas._count, total: Number(payablesVencidas._sum.amount ?? 0) },
        },
        tarefas: {
          atrasadas: tarefasAtrasadas.map((t) => ({ id: t.id, titulo: t.title, prazo: formatDateBR(t.dueDate) })),
          hoje: tarefasHoje.map((t) => ({ id: t.id, titulo: t.title })),
          proximas7Dias: tarefasProximas.map((t) => ({ id: t.id, titulo: t.title, prazo: formatDateBR(t.dueDate) })),
        },
        leadsComFollowUpVencido: leadsFollowUpVencido.map((l) => ({
          id: l.id,
          nome: l.name,
          proximoContato: formatDateBR(l.nextContactDate),
        })),
      });
    },
  );

  // ---------- Contas a receber ----------
  server.registerTool(
    "listar_contas_receber",
    {
      title: "Listar contas a receber",
      description: "Lista lançamentos de contas a receber, com filtro opcional por status e por vencidas.",
      inputSchema: {
        status: z.enum(["PENDENTE", "RECEBIDO", "CANCELADO"]).optional(),
        vencidas: z.boolean().optional(),
      },
    },
    async ({ status, vencidas }) => {
      const { start: today } = brTodayRange();
      const receivables = await prisma.receivable.findMany({
        where: {
          status: status ?? undefined,
          ...(vencidas ? { status: "PENDENTE", dueDate: { lt: today } } : {}),
        },
        include: { client: true, account: true },
        orderBy: [{ status: "asc" }, { dueDate: "asc" }],
        take: 100,
      });

      return textResult(
        receivables.map((r) => ({
          id: r.id,
          numero: r.number,
          descricao: r.description,
          valor: Number(r.amount),
          valorFormatado: formatCurrencyBRL(Number(r.amount)),
          vencimento: formatDateBR(r.dueDate),
          status: r.status,
          conta: r.account?.name ?? null,
          cliente: r.client ? displayClientName(r.client) : null,
        })),
      );
    },
  );

  server.registerTool(
    "marcar_recebido",
    {
      title: "Marcar conta a receber como recebida",
      description: "Marca um lançamento de contas a receber como recebido, opcionalmente informando data e conta.",
      inputSchema: {
        id: z.string().describe("ID do lançamento de contas a receber"),
        data: z.string().optional().describe("Data do recebimento (YYYY-MM-DD). Padrão: agora."),
        conta: z.string().optional().describe("Nome ou ID da conta onde o valor entrou"),
      },
    },
    async ({ id, data, conta }) => {
      const receivable = await prisma.receivable.findUnique({ where: { id } });
      if (!receivable) return errorResult(`Conta a receber "${id}" não encontrada.`);

      const accountResolution = await resolveAccountId(conta);
      if (!accountResolution.ok) return errorResult(accountResolution.error);

      const receivedAt = data ? new Date(data) : new Date();
      await prisma.receivable.update({
        where: { id },
        data: {
          status: "RECEBIDO",
          receivedAt,
          accountId: accountResolution.accountId ?? receivable.accountId,
        },
      });

      await logMcpAction({
        tool: "marcar_recebido",
        summary: `Conta a receber #${receivable.number} (${receivable.description}) marcada como recebida`,
        userId: ctx.userId,
        entity: "Receivable",
        entityId: id,
        oldValue: { status: receivable.status, receivedAt: receivable.receivedAt, accountId: receivable.accountId },
        newValue: { status: "RECEBIDO", receivedAt, accountId: accountResolution.accountId ?? receivable.accountId },
      });
      if (receivable.clientId) {
        await logClientTimelineViaClaude({
          clientId: receivable.clientId,
          type: "CONTA_A_RECEBER_STATUS",
          description: `Conta a receber #${receivable.number} marcada como RECEBIDO`,
          userId: ctx.userId,
        });
      }

      return textResult({ ok: true, id, status: "RECEBIDO", recebidoEm: formatDateBR(receivedAt) });
    },
  );

  // ---------- Contas a pagar ----------
  server.registerTool(
    "listar_contas_pagar",
    {
      title: "Listar contas a pagar",
      description: "Lista lançamentos de contas a pagar, com filtro opcional por status e por vencidas.",
      inputSchema: {
        status: z.enum(["PENDENTE", "PAGO", "CANCELADO"]).optional(),
        vencidas: z.boolean().optional(),
      },
    },
    async ({ status, vencidas }) => {
      const { start: today } = brTodayRange();
      const payables = await prisma.payable.findMany({
        where: {
          status: status ?? undefined,
          ...(vencidas ? { status: "PENDENTE", dueDate: { lt: today } } : {}),
        },
        include: { account: true },
        orderBy: [{ status: "asc" }, { dueDate: "asc" }],
        take: 100,
      });

      return textResult(
        payables.map((p) => ({
          id: p.id,
          numero: p.number,
          descricao: p.description,
          categoria: p.category,
          fornecedor: p.supplier,
          valor: Number(p.amount),
          valorFormatado: formatCurrencyBRL(Number(p.amount)),
          vencimento: formatDateBR(p.dueDate),
          status: p.status,
          conta: p.account?.name ?? null,
        })),
      );
    },
  );

  server.registerTool(
    "marcar_pago",
    {
      title: "Marcar conta a pagar como paga",
      description: "Marca um lançamento de contas a pagar como pago, opcionalmente informando data e conta.",
      inputSchema: {
        id: z.string().describe("ID do lançamento de contas a pagar"),
        data: z.string().optional().describe("Data do pagamento (YYYY-MM-DD). Padrão: agora."),
        conta: z.string().optional().describe("Nome ou ID da conta de onde o valor saiu"),
      },
    },
    async ({ id, data, conta }) => {
      const payable = await prisma.payable.findUnique({ where: { id } });
      if (!payable) return errorResult(`Conta a pagar "${id}" não encontrada.`);

      const accountResolution = await resolveAccountId(conta);
      if (!accountResolution.ok) return errorResult(accountResolution.error);

      const paidAt = data ? new Date(data) : new Date();
      await prisma.payable.update({
        where: { id },
        data: {
          status: "PAGO",
          paidAt,
          accountId: accountResolution.accountId ?? payable.accountId,
        },
      });

      await logMcpAction({
        tool: "marcar_pago",
        summary: `Conta a pagar #${payable.number} (${payable.description}) marcada como paga`,
        userId: ctx.userId,
        entity: "Payable",
        entityId: id,
        oldValue: { status: payable.status, paidAt: payable.paidAt, accountId: payable.accountId },
        newValue: { status: "PAGO", paidAt, accountId: accountResolution.accountId ?? payable.accountId },
      });

      return textResult({ ok: true, id, status: "PAGO", pagoEm: formatDateBR(paidAt) });
    },
  );

  // ---------- Lançar movimentação ----------
  server.registerTool(
    "lancar_movimentacao",
    {
      title: "Lançar movimentação financeira",
      description:
        "Lança uma movimentação já realizada: entrada (vira contas a receber já recebido) ou saída (vira contas a pagar já pago).",
      inputSchema: {
        tipo: z.enum(["entrada", "saida"]),
        valor: z.number().positive(),
        data: z.string().optional().describe("Data da movimentação (YYYY-MM-DD). Padrão: agora."),
        descricao: z.string().min(1),
        conta: z.string().optional().describe("Nome ou ID da conta"),
        cliente: z.string().optional().describe("Nome ou ID do cliente (só se aplicável à entrada)"),
      },
    },
    async ({ tipo, valor, data, descricao, conta, cliente }) => {
      const accountResolution = await resolveAccountId(conta);
      if (!accountResolution.ok) return errorResult(accountResolution.error);

      const when = data ? new Date(data) : new Date();
      const amount = valor.toFixed(2);

      if (tipo === "entrada") {
        const clientResolution = await resolveClientId(cliente);
        if (!clientResolution.ok) return errorResult(clientResolution.error);

        const count = await prisma.receivable.count();
        const receivable = await prisma.receivable.create({
          data: {
            number: count + 1,
            clientId: clientResolution.clientId,
            description: descricao,
            amount,
            status: "RECEBIDO",
            receivedAt: when,
            accountId: accountResolution.accountId,
            createdById: ctx.userId,
          },
        });

        await logMcpAction({
          tool: "lancar_movimentacao",
          summary: `Entrada lançada: ${descricao} (${formatCurrencyBRL(valor)})`,
          userId: ctx.userId,
        });
        if (clientResolution.clientId) {
          await logClientTimelineViaClaude({
            clientId: clientResolution.clientId,
            type: "CONTA_A_RECEBER_CRIADA",
            description: `Entrada "${descricao}" (${formatCurrencyBRL(valor)}) lançada e marcada como recebida`,
            userId: ctx.userId,
          });
        }

        return textResult({ ok: true, tipo: "entrada", id: receivable.id, numero: receivable.number });
      }

      const count = await prisma.payable.count();
      const payable = await prisma.payable.create({
        data: {
          number: count + 1,
          description: descricao,
          amount,
          status: "PAGO",
          paidAt: when,
          accountId: accountResolution.accountId,
        },
      });

      await logMcpAction({
        tool: "lancar_movimentacao",
        summary: `Saída lançada: ${descricao} (${formatCurrencyBRL(valor)})`,
        userId: ctx.userId,
      });

      return textResult({ ok: true, tipo: "saida", id: payable.id, numero: payable.number });
    },
  );

  // ---------- Tarefas ----------
  server.registerTool(
    "listar_tarefas",
    {
      title: "Listar tarefas",
      description: "Lista tarefas, com filtro opcional por status e por prazo (atrasadas, hoje, próximas).",
      inputSchema: {
        status: z.enum(["PENDENTE", "CONCLUIDA"]).optional(),
        prazo: z.enum(["atrasadas", "hoje", "proximas"]).optional(),
      },
    },
    async ({ status, prazo }) => {
      const { start: startOfToday, end: endOfToday } = brTodayRange();

      const dueDateFilter =
        prazo === "atrasadas"
          ? { lt: startOfToday }
          : prazo === "hoje"
            ? { gte: startOfToday, lte: endOfToday }
            : prazo === "proximas"
              ? { gt: endOfToday }
              : undefined;

      const tasks = await prisma.task.findMany({
        where: { status: status ?? undefined, dueDate: dueDateFilter },
        include: { client: true, assignedTo: true },
        orderBy: { dueDate: "asc" },
        take: 100,
      });

      return textResult(
        tasks.map((t) => ({
          id: t.id,
          titulo: t.title,
          descricao: t.description,
          prazo: formatDateBR(t.dueDate),
          status: t.status,
          responsavel: t.assignedTo?.name ?? null,
          cliente: t.client ? displayClientName(t.client) : null,
        })),
      );
    },
  );

  server.registerTool(
    "criar_tarefa",
    {
      title: "Criar tarefa",
      description: "Cria uma nova tarefa, opcionalmente ligada a um cliente.",
      inputSchema: {
        titulo: z.string().min(1),
        descricao: z.string().optional(),
        prazo: z.string().optional().describe("Data limite (YYYY-MM-DD)"),
        cliente: z.string().optional().describe("Nome ou ID do cliente"),
      },
    },
    async ({ titulo, descricao, prazo, cliente }) => {
      const clientResolution = await resolveClientId(cliente);
      if (!clientResolution.ok) return errorResult(clientResolution.error);

      const task = await prisma.task.create({
        data: {
          title: titulo,
          description: descricao || null,
          dueDate: prazo ? new Date(prazo) : null,
          clientId: clientResolution.clientId,
          createdById: ctx.userId,
        },
      });

      await logMcpAction({
        tool: "criar_tarefa",
        summary: `Tarefa criada: ${titulo}`,
        userId: ctx.userId,
      });
      if (clientResolution.clientId) {
        await logClientTimelineViaClaude({
          clientId: clientResolution.clientId,
          type: "TAREFA_CRIADA",
          description: `Tarefa "${titulo}" criada`,
          userId: ctx.userId,
        });
      }

      return textResult({ ok: true, id: task.id });
    },
  );

  server.registerTool(
    "concluir_tarefa",
    {
      title: "Concluir tarefa",
      description: "Marca uma tarefa como concluída.",
      inputSchema: { id: z.string() },
    },
    async ({ id }) => {
      const task = await prisma.task.findUnique({ where: { id } });
      if (!task) return errorResult(`Tarefa "${id}" não encontrada.`);

      await prisma.task.update({
        where: { id },
        data: { status: "CONCLUIDA", completedAt: new Date() },
      });

      await logMcpAction({
        tool: "concluir_tarefa",
        summary: `Tarefa concluída: ${task.title}`,
        userId: ctx.userId,
        entity: "Task",
        entityId: id,
        oldValue: { status: task.status },
        newValue: { status: "CONCLUIDA" },
      });
      if (task.clientId) {
        await logClientTimelineViaClaude({
          clientId: task.clientId,
          type: "TAREFA_CONCLUIDA",
          description: `Tarefa "${task.title}" concluída`,
          userId: ctx.userId,
        });
      }

      return textResult({ ok: true, id });
    },
  );

  // ---------- Leads ----------
  server.registerTool(
    "listar_leads",
    {
      title: "Listar leads",
      description: "Lista leads, com filtro opcional por etapa do funil e por follow-up vencido.",
      inputSchema: {
        etapa: z
          .enum([
            "NOVO_LEAD",
            "PRIMEIRO_CONTATO",
            "EM_ATENDIMENTO",
            "INTERESSADO",
            "ORCAMENTO_ENVIADO",
            "NEGOCIACAO",
            "CONTRATADO",
            "PERDIDO",
          ])
          .optional(),
        vencidos: z.boolean().optional(),
      },
    },
    async ({ etapa, vencidos }) => {
      const now = new Date();
      const leads = await prisma.lead.findMany({
        where: {
          stage: etapa ?? undefined,
          ...(vencidos ? { nextContactDate: { lte: now, not: null } } : {}),
        },
        orderBy: { nextContactDate: "asc" },
        take: 100,
      });

      return textResult(
        leads.map((l) => ({
          id: l.id,
          nome: l.name,
          etapa: l.stage,
          temperatura: l.temperature,
          proximoContato: formatDateBR(l.nextContactDate),
          whatsapp: l.whatsapp,
        })),
      );
    },
  );

  // ---------- Clientes ----------
  server.registerTool(
    "listar_clientes",
    {
      title: "Listar clientes",
      description: "Lista clientes, com busca opcional por nome e filtro por status.",
      inputSchema: {
        busca: z.string().optional(),
        status: z.enum(["ATIVO", "INATIVO"]).optional(),
      },
    },
    async ({ busca, status }) => {
      const clients = await prisma.client.findMany({
        where: {
          status: status ?? undefined,
          ...(busca
            ? {
                OR: [
                  { fullName: { contains: busca, mode: "insensitive" } },
                  { tradeName: { contains: busca, mode: "insensitive" } },
                  { legalName: { contains: busca, mode: "insensitive" } },
                ],
              }
            : {}),
        },
        orderBy: { createdAt: "desc" },
        take: 100,
      });

      return textResult(
        clients.map((c) => ({
          id: c.id,
          nome: displayClientName(c),
          tipo: c.type,
          status: c.status,
          whatsapp: c.whatsapp,
          email: c.email,
        })),
      );
    },
  );

  server.registerTool(
    "criar_cliente",
    {
      title: "Criar cliente",
      description: "Cria um novo cliente (pessoa física ou jurídica) com os dados básicos de contato.",
      inputSchema: {
        tipo: z.enum(["PF", "PJ"]),
        nome: z.string().min(1).describe("Nome completo (PF) ou nome fantasia/razão social (PJ)"),
        whatsapp: z.string().optional(),
        telefone: z.string().optional(),
        email: z.string().email().optional(),
        instagram: z.string().optional(),
        observacoes: z.string().optional(),
      },
    },
    async ({ tipo, nome, whatsapp, telefone, email, instagram, observacoes }) => {
      const client = await prisma.client.create({
        data: {
          type: tipo,
          fullName: tipo === "PF" ? nome : null,
          tradeName: tipo === "PJ" ? nome : null,
          whatsapp: whatsapp || null,
          phone: telefone || null,
          email: email || null,
          instagram: instagram || null,
          notes: observacoes || null,
          createdById: ctx.userId,
        },
      });

      await addTimelineEvent({
        clientId: client.id,
        type: "CLIENTE_CRIADO",
        description: `Cliente criado (via Claude)`,
        createdById: ctx.userId,
      });
      await logMcpAction({
        tool: "criar_cliente",
        summary: `Cliente criado: ${nome}`,
        userId: ctx.userId,
      });

      return textResult({ ok: true, id: client.id });
    },
  );

  // ---------- Leads: criação e conversão ----------
  const LEAD_STAGES = [
    "NOVO_LEAD",
    "PRIMEIRO_CONTATO",
    "EM_ATENDIMENTO",
    "INTERESSADO",
    "ORCAMENTO_ENVIADO",
    "NEGOCIACAO",
    "CONTRATADO",
    "PERDIDO",
  ] as const;

  server.registerTool(
    "criar_lead",
    {
      title: "Criar lead",
      description: "Cria um novo lead (potencial cliente) no funil comercial.",
      inputSchema: {
        nome: z.string().min(1),
        whatsapp: z.string().optional(),
        origem: z.string().optional().describe("De onde veio o lead (indicação, Instagram, site...)"),
        interesse: z.string().optional().describe("Nome ou ID do serviço de interesse, no catálogo"),
        etapa: z.enum(LEAD_STAGES).optional(),
        proximo_contato: z.string().optional().describe("Data (YYYY-MM-DD)"),
        observacoes: z.string().optional(),
      },
    },
    async ({ nome, whatsapp, origem, interesse, etapa, proximo_contato, observacoes }) => {
      const serviceResolution = await resolveServiceId(interesse);
      if (!serviceResolution.ok) return errorResult(serviceResolution.error);

      const lead = await prisma.lead.create({
        data: {
          name: nome,
          whatsapp: whatsapp || null,
          origin: origem || null,
          serviceInterestId: serviceResolution.serviceId,
          stage: etapa ?? "NOVO_LEAD",
          nextContactDate: proximo_contato ? new Date(proximo_contato) : null,
          notes: observacoes || null,
        },
      });

      await logMcpAction({
        tool: "criar_lead",
        summary: `Lead criado: ${nome}`,
        userId: ctx.userId,
      });

      return textResult({ ok: true, id: lead.id });
    },
  );

  server.registerTool(
    "converter_lead_em_cliente",
    {
      title: "Converter lead em cliente",
      description: "Cria um cliente a partir de um lead existente e liga os dois cadastros.",
      inputSchema: {
        lead_id: z.string(),
        tipo: z.enum(["PF", "PJ"]),
      },
    },
    async ({ lead_id, tipo }) => {
      const lead = await prisma.lead.findUnique({ where: { id: lead_id } });
      if (!lead) return errorResult(`Lead "${lead_id}" não encontrado.`);
      if (lead.clientId) {
        return errorResult(`Esse lead já foi convertido (cliente ${lead.clientId}).`);
      }

      const client = await prisma.client.create({
        data: {
          type: tipo,
          fullName: tipo === "PF" ? lead.name : null,
          tradeName: tipo === "PJ" ? lead.name : null,
          whatsapp: lead.whatsapp || null,
          phone: lead.phone || null,
          instagram: lead.instagram || null,
          createdById: ctx.userId,
        },
      });

      await prisma.lead.update({ where: { id: lead_id }, data: { clientId: client.id } });

      await addTimelineEvent({
        clientId: client.id,
        type: "LEAD_CONVERTIDO",
        description: `Cliente convertido a partir do lead "${lead.name}" (via Claude)`,
        createdById: ctx.userId,
      });
      await logMcpAction({
        tool: "converter_lead_em_cliente",
        summary: `Lead "${lead.name}" convertido em cliente`,
        userId: ctx.userId,
      });

      return textResult({ ok: true, clienteId: client.id });
    },
  );

  // ---------- Contas a receber/pagar pendentes ----------
  server.registerTool(
    "criar_conta_receber",
    {
      title: "Criar conta a receber",
      description: "Cria um lançamento pendente de contas a receber (não mexe no saldo até ser marcado como recebido).",
      inputSchema: {
        descricao: z.string().min(1),
        valor: z.number().positive(),
        vencimento: z.string().optional().describe("Data de vencimento (YYYY-MM-DD)"),
        cliente: z.string().min(1).describe("Nome ou ID do cliente"),
        conta: z.string().optional().describe("Nome ou ID da conta prevista"),
        contrato: z.string().optional().describe("Número do contrato (ex.: MON-2026-003) a que a parcela ou mensalidade pertence"),
      },
    },
    async ({ descricao, valor, vencimento, cliente, conta, contrato }) => {
      const clientResolution = await resolveClientId(cliente);
      if (!clientResolution.ok) return errorResult(clientResolution.error);
      if (!clientResolution.clientId) return errorResult(`Cliente "${cliente}" é obrigatório.`);

      const accountResolution = await resolveAccountId(conta);
      if (!accountResolution.ok) return errorResult(accountResolution.error);

      let contract: { id: string; quoteId: string | null; clientId: string } | null = null;
      if (contrato) {
        contract = await prisma.contract.findFirst({
          where: { OR: [{ id: contrato }, { code: contrato.trim().toUpperCase() }] },
          select: { id: true, quoteId: true, clientId: true },
        });
        if (!contract) return errorResult(`Contrato "${contrato}" não encontrado.`);
        if (contract.clientId !== clientResolution.clientId) return errorResult(`O contrato ${contrato} é de outro cliente.`);
      }

      const count = await prisma.receivable.count();
      const receivable = await prisma.receivable.create({
        data: {
          number: count + 1,
          clientId: clientResolution.clientId,
          contractId: contract?.id ?? null,
          quoteId: contract?.quoteId ?? null,
          description: descricao,
          amount: valor.toFixed(2),
          dueDate: vencimento ? new Date(vencimento) : null,
          accountId: accountResolution.accountId,
          createdById: ctx.userId,
        },
      });

      await logMcpAction({
        tool: "criar_conta_receber",
        summary: `Conta a receber #${receivable.number} criada: ${descricao} (${formatCurrencyBRL(valor)})`,
        userId: ctx.userId,
      });
      await logClientTimelineViaClaude({
        clientId: clientResolution.clientId,
        type: "CONTA_A_RECEBER_CRIADA",
        description: `Conta a receber #${receivable.number} criada`,
        userId: ctx.userId,
      });

      return textResult({ ok: true, id: receivable.id, numero: receivable.number });
    },
  );

  server.registerTool(
    "criar_conta_pagar",
    {
      title: "Criar conta a pagar",
      description: "Cria um lançamento pendente de contas a pagar (não mexe no saldo até ser marcado como pago).",
      inputSchema: {
        descricao: z.string().min(1),
        valor: z.number().positive(),
        vencimento: z.string().optional().describe("Data de vencimento (YYYY-MM-DD)"),
        fornecedor: z.string().optional(),
        conta: z.string().optional().describe("Nome ou ID da conta prevista"),
      },
    },
    async ({ descricao, valor, vencimento, fornecedor, conta }) => {
      const accountResolution = await resolveAccountId(conta);
      if (!accountResolution.ok) return errorResult(accountResolution.error);

      const count = await prisma.payable.count();
      const payable = await prisma.payable.create({
        data: {
          number: count + 1,
          description: descricao,
          supplier: fornecedor || null,
          amount: valor.toFixed(2),
          dueDate: vencimento ? new Date(vencimento) : null,
          accountId: accountResolution.accountId,
        },
      });

      await logMcpAction({
        tool: "criar_conta_pagar",
        summary: `Conta a pagar #${payable.number} criada: ${descricao} (${formatCurrencyBRL(valor)})`,
        userId: ctx.userId,
      });

      return textResult({ ok: true, id: payable.id, numero: payable.number });
    },
  );

  // ---------- Serviços ----------
  server.registerTool(
    "registrar_servico",
    {
      title: "Registrar serviço",
      description: "Registra um serviço para um cliente no módulo de Serviços em andamento.",
      inputSchema: {
        cliente: z.string().min(1).describe("Nome ou ID do cliente"),
        servico: z.string().min(1).describe("Nome do serviço (do catálogo ou livre)"),
        valor: z.number().positive(),
        status: z.enum(["EM_ANDAMENTO", "CONCLUIDO"]),
        prazo: z.string().optional().describe("Prazo de entrega (YYYY-MM-DD)"),
      },
    },
    async ({ cliente, servico, valor, status, prazo }) => {
      const clientResolution = await resolveClientId(cliente);
      if (!clientResolution.ok) return errorResult(clientResolution.error);
      if (!clientResolution.clientId) return errorResult(`Cliente "${cliente}" é obrigatório.`);

      const serviceResolution = await resolveServiceId(servico);
      if (!serviceResolution.ok) return errorResult(serviceResolution.error);

      const serviceRecord = serviceResolution.serviceId
        ? await prisma.service.findUnique({ where: { id: serviceResolution.serviceId } })
        : null;

      const count = await prisma.serviceInstance.count();
      const now = new Date();
      const instance = await prisma.serviceInstance.create({
        data: {
          number: count + 1,
          title: serviceRecord?.name ?? servico,
          clientId: clientResolution.clientId,
          serviceId: serviceResolution.serviceId,
          price: valor.toFixed(2),
          status,
          dueDate: prazo ? new Date(prazo) : null,
          deliveredAt: status === "CONCLUIDO" ? now : null,
          responsibleId: serviceRecord?.defaultResponsibleId ?? null,
          createdById: ctx.userId,
        },
      });

      await logMcpAction({
        tool: "registrar_servico",
        summary: `Serviço "${instance.title}" registrado (${status})`,
        userId: ctx.userId,
      });
      await logClientTimelineViaClaude({
        clientId: clientResolution.clientId,
        type: "SERVICO_ABERTO",
        description: `Serviço "${instance.title}" registrado`,
        userId: ctx.userId,
      });

      return textResult({ ok: true, id: instance.id, numero: instance.number });
    },
  );

  server.registerTool(
    "listar_servicos_catalogo",
    {
      title: "Listar catálogo de serviços",
      description: "Lista os serviços ativos do catálogo, com nome e preço (ou regra de preço).",
      inputSchema: {},
    },
    async () => {
      const services = await prisma.service.findMany({
        where: { active: true },
        orderBy: { name: "asc" },
      });

      return textResult(
        services.map((s) => {
          const price = s.defaultPrice ? formatCurrencyBRL(Number(s.defaultPrice)) : null;
          const precoExibido =
            s.pricingMode === "ORCAMENTO"
              ? "Sob orçamento"
              : s.pricingMode === "A_PARTIR_DE"
                ? price
                  ? `A partir de ${price}`
                  : "Sob orçamento"
                : (price ?? "Sob orçamento");
          return {
            id: s.id,
            nome: s.name,
            categoria: s.category,
            preco: precoExibido,
          };
        }),
      );
    },
  );

  // ---------- Orçamentos ----------
  server.registerTool(
    "criar_orcamento",
    {
      title: "Criar orçamento",
      description: "Cria um orçamento (rascunho) para um cliente ou lead já convertido, com os itens informados.",
      inputSchema: {
        cliente: z.string().min(1).describe("Nome ou ID do cliente ou de um lead já convertido"),
        itens: z
          .array(
            z.object({
              servico: z.string().min(1).describe("Nome do serviço (do catálogo ou livre)"),
              valor: z.number().positive(),
            }),
          )
          .min(1),
        validade: z.string().optional().describe("Data de validade (YYYY-MM-DD)"),
      },
    },
    async ({ cliente, itens, validade }) => {
      const clientResolution = await resolveClientOrLeadToClientId(cliente);
      if (!clientResolution.ok) return errorResult(clientResolution.error);

      const resolvedItems: { serviceId: string | null; description: string; unitPrice: string }[] = [];
      for (const item of itens) {
        const serviceResolution = await resolveServiceId(item.servico);
        if (!serviceResolution.ok) return errorResult(serviceResolution.error);
        const serviceRecord = serviceResolution.serviceId
          ? await prisma.service.findUnique({ where: { id: serviceResolution.serviceId } })
          : null;
        resolvedItems.push({
          serviceId: serviceResolution.serviceId,
          description: serviceRecord?.name ?? item.servico,
          unitPrice: item.valor.toFixed(2),
        });
      }

      const count = await prisma.quote.count();
      const total = itens.reduce((sum, i) => sum + i.valor, 0);
      const quote = await prisma.quote.create({
        data: {
          number: count + 1,
          clientId: clientResolution.clientId,
          validUntil: validade ? new Date(validade) : null,
          createdById: ctx.userId,
          items: { create: resolvedItems.map((i) => ({ ...i, quantity: 1 })) },
        },
      });

      await logMcpAction({
        tool: "criar_orcamento",
        summary: `Orçamento #${quote.number} criado (${formatCurrencyBRL(total)})`,
        userId: ctx.userId,
      });
      await logClientTimelineViaClaude({
        clientId: clientResolution.clientId,
        type: "ORCAMENTO_CRIADO",
        description: `Orçamento #${quote.number} criado (${formatCurrencyBRL(total)})`,
        userId: ctx.userId,
      });

      return textResult({ ok: true, id: quote.id, numero: quote.number });
    },
  );

  server.registerTool(
    "listar_orcamentos",
    {
      title: "Listar orçamentos",
      description: "Lista orçamentos, com filtro opcional por status.",
      inputSchema: {
        status: z
          .enum(["RASCUNHO", "ENVIADO", "VISUALIZADO", "EM_NEGOCIACAO", "APROVADO", "RECUSADO", "EXPIRADO"])
          .optional(),
      },
    },
    async ({ status }) => {
      const quotes = await prisma.quote.findMany({
        where: { status: status ?? undefined },
        include: { client: true, items: true },
        orderBy: { createdAt: "desc" },
        take: 100,
      });

      return textResult(
        quotes.map((q) => ({
          id: q.id,
          numero: q.number,
          cliente: displayClientName(q.client),
          status: q.status,
          validade: formatDateBR(q.validUntil),
          total: formatCurrencyBRL(q.items.reduce((sum, i) => sum + i.quantity * Number(i.unitPrice), 0)),
        })),
      );
    },
  );
}
