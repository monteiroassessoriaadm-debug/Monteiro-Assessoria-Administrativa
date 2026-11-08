import "server-only";
import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { prisma } from "@/lib/prisma";
import { formatCurrencyBRL } from "@/lib/utils";
import { errorResult, textResult, resolveAccountId, resolveClientId, resolveServiceId } from "@/lib/mcp/tools";
import * as ops from "@/lib/crm-operations";
import { OperationError, type Actor } from "@/lib/crm-operations";
import { getGoalsProgress, setGoal, type GoalsProgress } from "@/lib/goals";
import { getAccountBalances } from "@/lib/account-balance";
import { parseMoney } from "@/lib/money";

type Ctx = { userId: string };

const ID = (o: string) => z.string({ message: `Informe o ID ${o}.` }).min(1, `Informe o ID ${o}.`);
const DIA = "Data no formato AAAA-MM-DD (ex.: 2026-12-15). Vazio limpa o campo.";
const VALOR = z.number({ message: "O valor precisa ser um número, como 1100.50." }).positive("O valor precisa ser maior que zero.");
const MOTIVO = z.string().optional().describe("Motivo, que fica registrado no histórico");
const tipoMovimento = z.enum(["entrada", "saida"], { message: 'O tipo precisa ser "entrada" ou "saida".' });

const LEAD_STAGES = ["NOVO_LEAD", "PRIMEIRO_CONTATO", "EM_ATENDIMENTO", "INTERESSADO", "ORCAMENTO_ENVIADO", "NEGOCIACAO", "CONTRATADO", "PERDIDO"] as const;

/** Converte erro de regra em mensagem clara; erro inesperado não vaza detalhe técnico. */
async function run(action: () => Promise<unknown>): Promise<CallToolResult> {
  try {
    return textResult({ ok: true, ...((await action()) as object) });
  } catch (e) {
    if (e instanceof OperationError) return errorResult(e.message);
    console.error("Erro em ferramenta MCP:", e);
    return errorResult("Não consegui concluir a alteração por um erro interno. Nada foi confirmado; tente de novo.");
  }
}

/** Conta/cliente: undefined = não mexer; "" = limpar; texto = procurar por nome ou ID. */
async function accountArg(conta: string | undefined) {
  if (conta === undefined) return undefined;
  if (conta === "") return null;
  const r = await resolveAccountId(conta);
  if (!r.ok) throw new OperationError(r.error);
  return r.accountId;
}

async function clientArg(cliente: string | undefined) {
  if (cliente === undefined) return undefined;
  if (cliente === "") return null;
  const r = await resolveClientId(cliente);
  if (!r.ok) throw new OperationError(r.error);
  return r.clientId;
}

async function userArg(nameOrId: string | undefined) {
  if (nameOrId === undefined) return undefined;
  if (nameOrId === "") return null;
  const byId = await prisma.user.findUnique({ where: { id: nameOrId } });
  if (byId) return byId.id;
  const matches = await prisma.user.findMany({
    where: { name: { contains: nameOrId, mode: "insensitive" } },
    take: 5,
  });
  if (matches.length === 1) return matches[0].id;
  if (matches.length === 0) throw new OperationError(`Nenhum usuário encontrado para "${nameOrId}".`);
  throw new OperationError(`Mais de um usuário para "${nameOrId}": ${matches.map((u) => u.name).join(", ")}. Seja mais específico.`);
}

function brl(v: number) {
  return formatCurrencyBRL(v);
}

/** Números crus e formatados em R$, com "semana", "mes" e "ano". */
export function goalsForTool(p: GoalsProgress) {
  const row = (r: { meta: number; recebido: number; aReceber: number; falta: number; percentual: number }) => ({
    meta: brl(r.meta),
    recebido: brl(r.recebido),
    aReceber: brl(r.aReceber),
    falta: brl(r.falta),
    percentualAtingido: `${r.percentual.toString().replace(".", ",")}%`,
  });
  return {
    semana: {
      periodo: `${p.weekPeriod.start} a ${p.weekPeriod.end}`,
      ...row(p.week),
      metaOriginal: brl(p.week.metaOriginal),
      metaAjustada: brl(p.week.metaAjustada),
      automatica: p.week.automatica,
    },
    mes: { periodo: `${p.monthPeriod.start} a ${p.monthPeriod.end}`, ...row(p.month), automatica: p.month.automatica },
    ano: {
      recebido: brl(p.mei.recebidoNoAno),
      limiteMei: brl(p.mei.limite),
      restanteMei: brl(p.mei.restante),
      percentualMei: `${p.mei.percentual.toString().replace(".", ",")}%`,
      alertaMei: p.mei.alerta,
    },
    porLinha: p.byLine.map((l) => ({ linha: l.linha, semana: brl(l.semana), mes: brl(l.mes), ano: brl(l.ano) })),
    ...(p.config.fallbackFrom
      ? { aviso: `Salário mínimo de ${p.config.year} ainda não cadastrado; usando o de ${p.config.fallbackFrom}.` }
      : {}),
  };
}

export function registerFase1CrmTools(server: McpServer, ctx: Ctx) {
  const actor = (tool: string): Actor => ({ userId: ctx.userId, source: "Claude", tool });

  // ---------- Contas a pagar ----------
  server.registerTool(
    "atualizar_conta_pagar",
    {
      title: "Atualizar conta a pagar",
      description:
        "Altera descrição, valor, vencimento, fornecedor, conta ou categoria de uma conta a pagar. Só informe o que muda. Conta já paga não aceita mudar valor nem vencimento (use estornar_movimentacao).",
      inputSchema: {
        id: ID("da conta a pagar"),
        descricao: z.string().optional(),
        valor: VALOR.optional(),
        vencimento: z.string().optional().describe(DIA),
        fornecedor: z.string().optional(),
        conta: z.string().optional().describe("Nome ou ID da conta financeira"),
        categoria: z.string().optional(),
      },
    },
    (a) =>
      run(async () => {
        const accountId = await accountArg(a.conta);
        const r = await ops.updatePayable(
          a.id,
          { description: a.descricao, amount: a.valor, dueDate: a.vencimento, supplier: a.fornecedor, accountId, category: a.categoria },
          actor("atualizar_conta_pagar"),
        );
        return { id: a.id, numero: r.payable.number, antes: r.antes, depois: r.depois };
      }),
  );

  server.registerTool(
    "cancelar_conta_pagar",
    {
      title: "Cancelar conta a pagar",
      description: "Cancela uma conta a pagar pendente. O registro continua no histórico com status CANCELADO; conta já paga precisa de estorno.",
      inputSchema: { id: ID("da conta a pagar"), motivo: MOTIVO },
    },
    (a) => run(() => ops.cancelPayable(a.id, a.motivo, actor("cancelar_conta_pagar"))),
  );

  // ---------- Contas a receber ----------
  server.registerTool(
    "atualizar_conta_receber",
    {
      title: "Atualizar conta a receber",
      description:
        "Altera descrição, valor, vencimento, cliente, conta, categoria ou linha de negócio de uma conta a receber. Só informe o que muda. Conta já recebida não aceita mudar valor nem vencimento (use estornar_movimentacao).",
      inputSchema: {
        id: ID("da conta a receber"),
        descricao: z.string().optional(),
        valor: VALOR.optional(),
        vencimento: z.string().optional().describe(DIA),
        cliente: z.string().optional().describe("Nome ou ID do cliente"),
        conta: z.string().optional().describe("Nome ou ID da conta financeira"),
        categoria: z.string().optional(),
        linha: z.string().optional().describe("Linha de negócio (ex.: Assessoria, Sites, Monteiro Educação). Só para consulta; não muda a meta."),
      },
    },
    (a) =>
      run(async () => {
        const [accountId, clientId] = await Promise.all([accountArg(a.conta), clientArg(a.cliente)]);
        const r = await ops.updateReceivable(
          a.id,
          { description: a.descricao, amount: a.valor, dueDate: a.vencimento, clientId, accountId, category: a.categoria, businessLine: a.linha },
          actor("atualizar_conta_receber"),
        );
        return { id: a.id, numero: r.receivable.number, antes: r.antes, depois: r.depois };
      }),
  );

  server.registerTool(
    "cancelar_conta_receber",
    {
      title: "Cancelar conta a receber",
      description: "Cancela uma conta a receber pendente. O registro continua no histórico com status CANCELADO; conta já recebida precisa de estorno.",
      inputSchema: { id: ID("da conta a receber"), motivo: MOTIVO },
    },
    (a) => run(() => ops.cancelReceivable(a.id, a.motivo, actor("cancelar_conta_receber"))),
  );

  // ---------- Movimentações ----------
  server.registerTool(
    "estornar_movimentacao",
    {
      title: "Estornar movimentação",
      description:
        'Desfaz uma movimentação já efetivada gerando o lançamento inverso; nada é apagado. Tipo "entrada" = conta a receber recebida (abate da meta na data do estorno); tipo "saida" = conta a pagar paga.',
      inputSchema: {
        tipo: tipoMovimento,
        id: ID("da movimentação"),
        data: z.string().optional().describe("Data do estorno (AAAA-MM-DD). Padrão: agora."),
        motivo: MOTIVO,
      },
    },
    (a) => run(() => ops.reverseMovement(a.tipo, a.id, { date: a.data, reason: a.motivo }, actor("estornar_movimentacao"))),
  );

  server.registerTool(
    "atualizar_movimentacao",
    {
      title: "Atualizar movimentação",
      description: "Corrige só a descrição, a categoria ou a data de uma movimentação efetivada. Para corrigir valor, use estornar_movimentacao e lance de novo.",
      inputSchema: {
        tipo: tipoMovimento,
        id: ID("da movimentação"),
        descricao: z.string().optional(),
        categoria: z.string().optional(),
        data: z.string().optional().describe("Data (AAAA-MM-DD)"),
      },
    },
    (a) => run(() => ops.updateMovement(a.tipo, a.id, { description: a.descricao, category: a.categoria, date: a.data }, actor("atualizar_movimentacao"))),
  );

  // ---------- Saldo ----------
  server.registerTool(
    "consultar_saldo",
    {
      title: "Consultar saldo",
      description: "Mostra o saldo atual de cada conta ativa e o total, somando saldo inicial, recebimentos, pagamentos e ajustes.",
      inputSchema: {},
    },
    () =>
      run(async () => {
        const active = (await getAccountBalances()).filter((b) => b.active);
        return {
          total: brl(active.reduce((sum, b) => sum + b.current, 0)),
          contas: active.map((b) => ({ id: b.accountId, conta: b.name, saldo: brl(b.current), ajustes: brl(b.adjustments) })),
        };
      }),
  );

  server.registerTool(
    "ajustar_saldo",
    {
      title: "Ajustar saldo",
      description:
        "Informa quanto a conta tem de verdade hoje. O sistema calcula a diferença e grava um ajuste de saldo, sem apagar o histórico. O ajuste não conta como faturamento nem como despesa.",
      inputSchema: {
        conta: z.string({ message: "Informe o nome ou o ID da conta." }).min(1, "Informe o nome ou o ID da conta."),
        valor_real: z
          .union([z.number(), z.string()], { message: "Informe o valor real, como 950,00." })
          .describe("Quanto a conta tem hoje (ex.: 950,00 ou 950.00)"),
        motivo: MOTIVO,
      },
    },
    (a) =>
      run(async () => {
        const accountId = await accountArg(a.conta);
        if (!accountId) throw new OperationError("Informe a conta.");
        const realBalance = parseMoney(a.valor_real);
        if (realBalance === null) throw new OperationError(`Valor inválido: "${a.valor_real}". Use, por exemplo, 950,00.`);
        const r = await ops.adjustBalance({ accountId, realBalance, reason: a.motivo }, actor("ajustar_saldo"));
        return { conta: r.conta, saldoAnterior: brl(r.saldoAnterior), saldoNovo: brl(r.saldoNovo), diferenca: brl(r.diferenca) };
      }),
  );

  // ---------- Comissões ----------
  server.registerTool(
    "marcar_comissao_paga",
    {
      title: "Marcar comissão como paga",
      description: "Marca uma comissão, salário ou outro pagamento como pago e gera a saída no caixa.",
      inputSchema: {
        id: ID("da comissão"),
        data: z.string().optional().describe("Data do pagamento (AAAA-MM-DD). Padrão: agora."),
        conta: z.string().optional().describe("Nome ou ID da conta de onde o valor saiu"),
      },
    },
    (a) =>
      run(async () => {
        const accountId = await accountArg(a.conta);
        return ops.payCommission(a.id, { date: a.data, accountId }, actor("marcar_comissao_paga"));
      }),
  );

  server.registerTool(
    "cancelar_comissao",
    {
      title: "Cancelar comissão",
      description: "Cancela uma comissão pendente, mantendo o registro. Se já foi paga, estorne a saída primeiro.",
      inputSchema: { id: ID("da comissão"), motivo: MOTIVO },
    },
    (a) => run(() => ops.cancelCommission(a.id, a.motivo, actor("cancelar_comissao"))),
  );

  // ---------- Clientes ----------
  server.registerTool(
    "atualizar_cliente",
    {
      title: "Atualizar cliente",
      description: "Altera nome, WhatsApp, telefone, e-mail, Instagram, documento (CPF ou CNPJ), endereço ou observações de um cliente. Só informe o que muda.",
      inputSchema: {
        id: ID("do cliente"),
        nome: z.string().optional().describe("Nome completo (PF) ou nome fantasia (PJ)"),
        whatsapp: z.string().optional(),
        telefone: z.string().optional(),
        email: z.string().optional(),
        instagram: z.string().optional(),
        documento: z.string().optional().describe("CPF (PF) ou CNPJ (PJ), com ou sem pontuação"),
        rua: z.string().optional(),
        numero: z.string().optional(),
        complemento: z.string().optional(),
        bairro: z.string().optional(),
        cidade: z.string().optional(),
        estado: z.string().optional(),
        cep: z.string().optional(),
        observacoes: z.string().optional(),
      },
    },
    (a) =>
      run(() =>
        ops.updateClient(
          a.id,
          {
            name: a.nome,
            whatsapp: a.whatsapp,
            phone: a.telefone,
            email: a.email,
            instagram: a.instagram,
            document: a.documento,
            addressStreet: a.rua,
            addressNumber: a.numero,
            addressComplement: a.complemento,
            addressNeighborhood: a.bairro,
            addressCity: a.cidade,
            addressState: a.estado,
            addressZip: a.cep,
            notes: a.observacoes,
          },
          actor("atualizar_cliente"),
        ),
      ),
  );

  // ---------- Leads ----------
  server.registerTool(
    "atualizar_lead",
    {
      title: "Atualizar lead",
      description: "Altera nome, WhatsApp, serviço de interesse, origem, observações, etapa do funil ou próximo contato de um lead. Só informe o que muda.",
      inputSchema: {
        id: ID("do lead"),
        nome: z.string().optional(),
        whatsapp: z.string().optional(),
        interesse: z.string().optional().describe("Nome ou ID do serviço de interesse, no catálogo"),
        origem: z.string().optional().describe("De onde veio (indicação, Instagram, site...)"),
        observacoes: z.string().optional(),
        etapa: z.enum(LEAD_STAGES).optional(),
        proximo_contato: z.string().optional().describe(DIA),
      },
    },
    (a) =>
      run(async () => {
        let serviceInterestId: string | null | undefined;
        if (a.interesse !== undefined) {
          const r = await resolveServiceId(a.interesse || undefined);
          if (!r.ok) throw new OperationError(r.error);
          if (a.interesse && !r.serviceId) throw new OperationError(`Nenhum serviço do catálogo encontrado para "${a.interesse}".`);
          serviceInterestId = r.serviceId;
        }
        return ops.updateLead(
          a.id,
          { name: a.nome, whatsapp: a.whatsapp, serviceInterestId, origin: a.origem, notes: a.observacoes, stage: a.etapa, nextContactDate: a.proximo_contato },
          actor("atualizar_lead"),
        );
      }),
  );

  // ---------- Orçamentos ----------
  server.registerTool(
    "atualizar_orcamento",
    {
      title: "Atualizar orçamento",
      description: "Altera forma de pagamento, validade, observações ou itens de um orçamento. Se enviar itens, eles substituem todos os atuais. Orçamento aprovado não aceita mudar itens.",
      inputSchema: {
        id: ID("do orçamento"),
        forma_pagamento: z.string().optional(),
        validade: z.string().optional().describe(DIA),
        observacoes: z.string().optional(),
        itens: z
          .array(
            z.object({
              descricao: z.string().min(1, "Descreva o item."),
              quantidade: z.number().int().positive("A quantidade precisa ser maior que zero."),
              valor_unitario: VALOR,
            }),
          )
          .min(1, "Informe ao menos um item.")
          .optional(),
      },
    },
    (a) =>
      run(() =>
        ops.updateQuote(
          a.id,
          {
            paymentTerms: a.forma_pagamento,
            validUntil: a.validade,
            notes: a.observacoes,
            items: a.itens?.map((i) => ({ description: i.descricao, quantity: i.quantidade, unitPrice: i.valor_unitario })),
          },
          actor("atualizar_orcamento"),
        ),
      ),
  );

  server.registerTool(
    "cancelar_orcamento",
    {
      title: "Cancelar orçamento",
      description: "Cancela um orçamento, mantendo o registro. Não é permitido se ele já gerou serviço ou conta a receber.",
      inputSchema: { id: ID("do orçamento"), motivo: MOTIVO },
    },
    (a) => run(() => ops.cancelQuote(a.id, a.motivo, actor("cancelar_orcamento"))),
  );

  server.registerTool(
    "aceitar_orcamento",
    {
      title: "Aceitar orçamento",
      description: "Registra que o cliente aceitou o orçamento (status APROVADO). Por enquanto não cria cobrança, tarefa nem comissão automaticamente.",
      inputSchema: { id: ID("do orçamento") },
    },
    (a) => run(() => ops.acceptQuote(a.id, actor("aceitar_orcamento"))),
  );

  // ---------- Propostas ----------
  server.registerTool(
    "atualizar_proposta",
    {
      title: "Atualizar proposta",
      description: "Altera demanda, solução, escopo, prazo, investimento, forma de pagamento, validade ou observações de uma proposta. Proposta aprovada não aceita mudar o investimento.",
      inputSchema: {
        id: ID("da proposta"),
        demanda: z.string().optional(),
        solucao: z.string().optional(),
        escopo: z.string().optional(),
        prazo: z.string().optional().describe("Prazo em texto livre (ex.: 30 dias)"),
        investimento: VALOR.optional(),
        forma_pagamento: z.string().optional(),
        validade: z.string().optional().describe(DIA),
        observacoes: z.string().optional(),
      },
    },
    (a) =>
      run(() =>
        ops.updateProposal(
          a.id,
          {
            demand: a.demanda,
            solution: a.solucao,
            scope: a.escopo,
            termText: a.prazo,
            investment: a.investimento,
            paymentTerms: a.forma_pagamento,
            validUntil: a.validade,
            notes: a.observacoes,
          },
          actor("atualizar_proposta"),
        ),
      ),
  );

  server.registerTool(
    "cancelar_proposta",
    {
      title: "Cancelar proposta",
      description: "Cancela uma proposta, mantendo o registro. Não é permitido se ela já gerou serviço.",
      inputSchema: { id: ID("da proposta"), motivo: MOTIVO },
    },
    (a) => run(() => ops.cancelProposal(a.id, a.motivo, actor("cancelar_proposta"))),
  );

  // ---------- Tarefas ----------
  server.registerTool(
    "atualizar_tarefa",
    {
      title: "Atualizar tarefa",
      description: "Altera título, descrição, prazo ou responsável de uma tarefa. Só informe o que muda.",
      inputSchema: {
        id: ID("da tarefa"),
        titulo: z.string().optional(),
        descricao: z.string().optional(),
        prazo: z.string().optional().describe(DIA),
        responsavel: z.string().optional().describe("Nome ou ID do usuário. Vazio remove o responsável."),
      },
    },
    (a) =>
      run(async () => {
        const assignedToId = await userArg(a.responsavel);
        return ops.updateTask(a.id, { title: a.titulo, description: a.descricao, dueDate: a.prazo, assignedToId }, actor("atualizar_tarefa"));
      }),
  );

  server.registerTool(
    "excluir_tarefa",
    {
      title: "Excluir tarefa",
      description: "Exclui uma tarefa. A cópia completa dela fica guardada no histórico.",
      inputSchema: { id: ID("da tarefa") },
    },
    (a) => run(() => ops.deleteTask(a.id, actor("excluir_tarefa"))),
  );

  // ---------- Prospecção ----------
  server.registerTool(
    "excluir_prospeccao",
    {
      title: "Excluir prospecção",
      description: "Exclui uma ficha de prospecção. A cópia completa dela fica guardada no histórico. Para fichas duplicadas, prefira mesclar_prospeccoes.",
      inputSchema: { id: ID("da prospecção") },
    },
    (a) => run(() => ops.deleteProspect(a.id, actor("excluir_prospeccao"))),
  );

  server.registerTool(
    "mesclar_prospeccoes",
    {
      title: "Mesclar prospecções",
      description:
        "Junta duas fichas da mesma empresa na ficha de manter_id: campos vazios são preenchidos pela outra, as observações das duas ficam juntas e fica o último contato e o próximo contato mais recentes, salvo se proximo_contato for informado. A ficha completa absorvida fica no histórico.",
      inputSchema: {
        manter_id: ID("da ficha que continua"),
        absorver_id: ID("da ficha que será absorvida"),
        proximo_contato: z.string().optional().describe(DIA),
      },
    },
    (a) => run(() => ops.mergeProspects(a.manter_id, a.absorver_id, { nextContactDate: a.proximo_contato }, actor("mesclar_prospeccoes"))),
  );

  // ---------- Metas ----------
  server.registerTool(
    "progresso_metas",
    {
      title: "Progresso das metas",
      description:
        "Mostra semana, mês e ano: meta, recebido, a receber, falta e percentual, meta semanal original e ajustada, teto do MEI e quanto veio de cada linha de negócio. A meta conta dinheiro recebido, de qualquer linha.",
      inputSchema: {},
    },
    () => run(async () => goalsForTool(await getGoalsProgress())),
  );

  server.registerTool(
    "definir_meta",
    {
      title: "Definir meta",
      description:
        "Define a meta do mês ou da semana que contém a data. Com automatica=true, volta ao cálculo padrão (mês = salário mínimo do ano; semana = parte proporcional do mês).",
      inputSchema: {
        tipo: z.enum(["MENSAL", "SEMANAL"], { message: 'O tipo precisa ser "MENSAL" ou "SEMANAL".' }),
        data: z.string({ message: "Informe uma data dentro do período, no formato AAAA-MM-DD." }).describe("Qualquer dia do período (AAAA-MM-DD)"),
        valor: VALOR.optional(),
        automatica: z.boolean().optional(),
        observacoes: z.string().optional(),
      },
    },
    (a) => run(() => setGoal({ type: a.tipo, date: a.data, amount: a.valor, automatic: a.automatica, notes: a.observacoes }, actor("definir_meta"))),
  );
}
