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

type Ctx = { userId: string };

function textResult(data: unknown): CallToolResult {
  const text = typeof data === "string" ? data : JSON.stringify(data, null, 2);
  return { content: [{ type: "text", text }] };
}

function errorResult(message: string): CallToolResult {
  return { content: [{ type: "text", text: message }], isError: true };
}

async function resolveAccountId(nameOrId: string | undefined): Promise<
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

async function resolveClientId(nameOrId: string | undefined): Promise<
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

export function registerCrmTools(server: McpServer, ctx: Ctx) {
  // ---------- resumo_do_dia ----------
  server.registerTool(
    "resumo_do_dia",
    {
      title: "Resumo do dia",
      description:
        "Visão geral do CRM agora: saldo por conta, contas a receber/pagar pendentes e vencidas, tarefas atrasadas/hoje/próximas e leads com follow-up vencido.",
      inputSchema: {},
    },
    async () => {
      const today = new Date();
      const startOfToday = new Date(today);
      startOfToday.setHours(0, 0, 0, 0);
      const endOfToday = new Date(today);
      endOfToday.setHours(23, 59, 59, 999);
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

      return textResult({
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
      const today = new Date();
      today.setHours(0, 0, 0, 0);
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
      const today = new Date();
      today.setHours(0, 0, 0, 0);
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
      const today = new Date();
      const startOfToday = new Date(today);
      startOfToday.setHours(0, 0, 0, 0);
      const endOfToday = new Date(today);
      endOfToday.setHours(23, 59, 59, 999);

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

  server.registerTool(
    "atualizar_lead",
    {
      title: "Atualizar lead",
      description: "Atualiza a etapa do funil e/ou a data do próximo contato de um lead.",
      inputSchema: {
        id: z.string(),
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
        proximo_contato: z.string().optional().describe("Data (YYYY-MM-DD)"),
      },
    },
    async ({ id, etapa, proximo_contato }) => {
      const lead = await prisma.lead.findUnique({ where: { id } });
      if (!lead) return errorResult(`Lead "${id}" não encontrado.`);

      await prisma.lead.update({
        where: { id },
        data: {
          stage: etapa ?? undefined,
          nextContactDate: proximo_contato ? new Date(proximo_contato) : undefined,
          lastContactDate: new Date(),
        },
      });

      await logMcpAction({
        tool: "atualizar_lead",
        summary: `Lead "${lead.name}" atualizado${etapa ? ` para ${etapa}` : ""}`,
        userId: ctx.userId,
      });
      if (lead.clientId) {
        await logClientTimelineViaClaude({
          clientId: lead.clientId,
          type: "LEAD_ATUALIZADO",
          description: `Lead "${lead.name}" atualizado`,
          userId: ctx.userId,
        });
      }

      return textResult({ ok: true, id });
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
}
