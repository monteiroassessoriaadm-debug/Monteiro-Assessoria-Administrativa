import "server-only";
import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { prisma } from "@/lib/prisma";
import { formatCurrencyBRL } from "@/lib/utils";
import { errorResult, textResult } from "@/lib/mcp/tools";
import { OperationError } from "@/lib/crm-operations";
import { isPfOwner } from "@/lib/pf/access";
import { brDayKey } from "@/lib/br-time";
import { PF_DEBT_STATUS, PF_DEBT_TYPES, PF_LIQUIDITY } from "@/lib/pf/labels";
import type { PayoffResult } from "@/lib/pf/calc";
import * as pf from "@/lib/pf/service";

// Ferramentas das Finanças Pessoais do dono. Só são registradas quando o token
// é do dono (ver api/mcp/route.ts) e cada uma confere de novo antes de agir.
// Não escrevem no histórico da empresa: o histórico é visto por outros usuários.

type Ctx = { userId: string };

const AVISO = "FINANÇAS PESSOAIS DO DONO, NÃO É DA EMPRESA.";
const d = (texto: string) => `${AVISO} ${texto}`;
const brl = (v: number) => formatCurrencyBRL(v);
const pct = (v: number | null) => (v === null ? "sem dados" : `${v.toString().replace(".", ",")}%`);

const DIA = z.string().optional().describe("Data no formato AAAA-MM-DD (ex.: 2026-11-14). Padrão: hoje.");
const MES = z.string().optional().describe("Mês no formato AAAA-MM (ex.: 2026-11). Padrão: mês atual.");
const VALOR = z.number({ message: "O valor precisa ser um número, como 150.90." }).positive("O valor precisa ser maior que zero.");
const ID = (o: string) => z.string({ message: `Informe o ID ${o}.` }).min(1, `Informe o ID ${o}.`);
const tipoMov = z.enum(["entrada", "saida"], { message: 'O tipo precisa ser "entrada" ou "saida".' });
const tipoDivida = z.enum(["cartao", "emprestimo_pessoal", "consignado", "financiamento", "cheque_especial", "familia", "outro"]);
const statusDivida = z.enum(["em_dia", "atrasada", "negociando", "quitada"]);

const strategyText = (r: PayoffResult) =>
  r.paidOff
    ? {
        livreEm: r.freedomMonth,
        meses: r.months,
        totalJuros: brl(r.totalInterest),
        totalPago: brl(r.totalPaid),
        ordemDeQuitacao: r.order.map((o) => `${o.name}: ${o.month}`),
      }
    : { livreEm: null, aviso: "Não quita: as parcelas não cobrem os juros. Aumente o valor extra ou renegocie." };

type Tx = Awaited<ReturnType<typeof pf.listTransactions>>[number];
const txOut = (t: Tx) => ({
  id: t.id,
  tipo: t.type === "ENTRADA" ? "entrada" : "saida",
  data: brDayKey(t.date),
  valor: Number(t.amount),
  valorFormatado: brl(Number(t.amount)),
  descricao: t.description,
  categoria: t.category.name,
  conta: t.account?.name ?? null,
  cartao: t.card?.name ?? null,
  fatura: t.invoiceMonth,
  parcela: t.installmentTotal ? `${t.installmentNumber}/${t.installmentTotal}` : null,
  temComprovante: !!t.attachment,
});

export function registerPessoalTools(server: McpServer, ctx: Ctx) {
  /** Confere o dono de novo e transforma erro de regra em mensagem clara. */
  const run = async (action: () => Promise<unknown>): Promise<CallToolResult> => {
    if (!(await isPfOwner(ctx.userId))) return errorResult("Ferramenta disponível só para o dono do CRM.");
    try {
      return textResult({ ok: true, aviso: AVISO, ...((await action()) as object) });
    } catch (e) {
      if (e instanceof OperationError) return errorResult(e.message);
      console.error("Erro em ferramenta MCP pessoal:", e);
      return errorResult("Não consegui concluir por um erro interno. Nada foi confirmado; tente de novo.");
    }
  };

  // ---------- Contas e cartões ----------
  server.registerTool(
    "pessoal_listar_contas_e_cartoes",
    {
      title: "Pessoal: listar contas e cartões",
      description: d("Lista as contas/carteiras pessoais com saldo, os cartões de crédito com fatura atual e limite disponível, e as categorias e fontes de renda. Use para saber os nomes antes de lançar."),
      inputSchema: {},
    },
    () =>
      run(async () => {
        const [contas, cartoes, categorias] = await Promise.all([pf.getAccountsWithBalance(), pf.getCardsOverview(), pf.listCategories()]);
        return {
          contas: contas.filter((c) => c.active).map((c) => ({ id: c.id, nome: c.name, tipo: c.type, saldo: brl(c.balance) })),
          cartoes: cartoes
            .filter((c) => c.active)
            .map((c) => ({ id: c.id, nome: c.name, limite: brl(c.limit), faturaAtual: brl(c.currentInvoice), mesDaFaturaAtual: c.currentInvoiceMonth, disponivel: brl(c.available), fechaDia: c.closingDay, venceDia: c.dueDay })),
          fontesDeRenda: categorias.filter((c) => c.type === "ENTRADA").map((c) => c.name),
          categoriasDeSaida: categorias.filter((c) => c.type === "SAIDA").map((c) => c.name),
        };
      }),
  );

  server.registerTool(
    "pessoal_cadastrar_conta_ou_cartao",
    {
      title: "Pessoal: cadastrar conta ou cartão",
      description: d('Cadastra uma conta/carteira pessoal (tipo "banco", "conta_digital", "dinheiro" ou "investimento", com saldo atual) ou um cartão de crédito (tipo "cartao", com limite, dia de fechamento e de vencimento).'),
      inputSchema: {
        tipo: z.enum(["banco", "conta_digital", "dinheiro", "investimento", "cartao"]),
        nome: z.string().min(1),
        saldo_atual: z.number().optional().describe("Saldo de hoje da conta (não use para cartão)"),
        limite: z.number().optional().describe("Só cartão"),
        dia_fechamento: z.number().int().optional().describe("Só cartão"),
        dia_vencimento: z.number().int().optional().describe("Só cartão"),
      },
    },
    (a) =>
      run(async () => {
        if (a.tipo === "cartao") {
          const c = await pf.saveCard({ name: a.nome, limit: a.limite ?? 0, closingDay: a.dia_fechamento ?? 0, dueDay: a.dia_vencimento ?? 0 });
          return { cartao: { id: c.id, nome: c.name } };
        }
        const c = await pf.saveAccount({ name: a.nome, type: a.tipo.toUpperCase() as "BANCO", openingBalance: a.saldo_atual ?? 0 });
        return { conta: { id: c.id, nome: c.name } };
      }),
  );

  // ---------- Lançamentos ----------
  server.registerTool(
    "pessoal_lancar_movimentacao",
    {
      title: "Pessoal: lançar entrada ou saída",
      description: d(
        'Lança uma entrada (ex.: Salário Prefeitura, Retirada Monteiro, Extra) ou saída pessoal. Informe conta OU cartão pelo nome. No cartão dá para parcelar: o valor total é dividido e cada parcela cai na sua fatura. Para retirada que já está lançada na empresa, use categoria "Retirada Monteiro".',
      ),
      inputSchema: {
        tipo: tipoMov,
        valor: VALOR.describe("Valor total (no parcelado, o total da compra)"),
        descricao: z.string().min(1),
        categoria: z.string().describe("Nome da categoria (saída) ou fonte de renda (entrada)"),
        conta_ou_cartao: z.string().describe("Nome ou ID da conta ou do cartão"),
        data: DIA,
        parcelas: z.number().int().min(1).max(48).optional().describe("Só no cartão. Padrão 1."),
        observacao: z.string().optional(),
      },
    },
    (a) =>
      run(async () => {
        const type = a.tipo === "entrada" ? "ENTRADA" : "SAIDA";
        const [category, where] = await Promise.all([pf.resolveCategory(a.categoria, type), pf.resolveAccountOrCard(a.conta_ou_cartao)]);
        const created = await pf.createTransaction({
          type,
          date: a.data ?? pf.todayKey(),
          amount: a.valor,
          description: a.descricao,
          categoryId: category.id,
          accountId: where.accountId,
          cardId: where.cardId,
          installments: a.parcelas,
          notes: a.observacao,
        });
        return {
          criados: created.map((t) => ({ id: t.id, data: brDayKey(t.date), valor: brl(Number(t.amount)), descricao: t.description, fatura: t.invoiceMonth })),
        };
      }),
  );

  server.registerTool(
    "pessoal_listar_movimentacoes",
    {
      title: "Pessoal: listar lançamentos",
      description: d("Lista entradas e saídas pessoais de um mês, com filtros opcionais por tipo, categoria, conta/cartão e texto da descrição."),
      inputSchema: {
        mes: MES,
        tipo: tipoMov.optional(),
        categoria: z.string().optional(),
        conta_ou_cartao: z.string().optional(),
        busca: z.string().optional().describe("Texto na descrição"),
        limite: z.number().int().min(1).max(500).optional(),
      },
    },
    (a) =>
      run(async () => {
        const type = a.tipo ? (a.tipo === "entrada" ? "ENTRADA" : "SAIDA") : undefined;
        const categoryId = a.categoria ? (await pf.resolveCategory(a.categoria, type ?? "SAIDA").catch(() => pf.resolveCategory(a.categoria!, "ENTRADA"))).id : undefined;
        const where = a.conta_ou_cartao ? await pf.resolveAccountOrCard(a.conta_ou_cartao) : {};
        const txs = await pf.listTransactions({ month: a.mes ?? pf.currentMonth(), type, categoryId, ...where, search: a.busca, take: a.limite ?? 200 });
        const entradas = txs.filter((t) => t.type === "ENTRADA").reduce((s, t) => s + Number(t.amount), 0);
        const saidas = txs.filter((t) => t.type === "SAIDA").reduce((s, t) => s + Number(t.amount), 0);
        return { mes: a.mes ?? pf.currentMonth(), total: txs.length, entradas: brl(entradas), saidas: brl(saidas), lancamentos: txs.map(txOut) };
      }),
  );

  server.registerTool(
    "pessoal_atualizar_movimentacao",
    {
      title: "Pessoal: atualizar lançamento",
      description: d("Altera data, valor, descrição, categoria, conta ou observação de um lançamento pessoal. Só informe o que muda. Em compra parcelada, altera só aquela parcela."),
      inputSchema: {
        id: ID("do lançamento"),
        data: z.string().optional().describe("AAAA-MM-DD"),
        valor: VALOR.optional(),
        descricao: z.string().optional(),
        categoria: z.string().optional(),
        conta: z.string().optional().describe("Nome ou ID da conta (não vale para compra no cartão)"),
        observacao: z.string().optional(),
      },
    },
    (a) =>
      run(async () => {
        const tx = await prisma.pfTransaction.findUnique({ where: { id: a.id } });
        if (!tx) throw new OperationError("Lançamento não encontrado.");
        const categoryId = a.categoria ? (await pf.resolveCategory(a.categoria, tx.type)).id : undefined;
        const accountId = a.conta ? (await pf.resolveAccount(a.conta)).id : undefined;
        const r = await pf.updateTransaction(a.id, { date: a.data, amount: a.valor, description: a.descricao, categoryId, accountId, notes: a.observacao });
        return { id: a.id, antes: r.before, depois: r.after };
      }),
  );

  server.registerTool(
    "pessoal_excluir_movimentacao",
    {
      title: "Pessoal: excluir lançamento",
      description: d("Exclui um lançamento pessoal (some de vez, junto com o comprovante). Em compra parcelada, use todas_as_parcelas=true para apagar a compra inteira. Se era o pagamento de uma conta fixa, ela volta a pendente."),
      inputSchema: { id: ID("do lançamento"), todas_as_parcelas: z.boolean().optional() },
    },
    (a) => run(async () => ({ excluidos: (await pf.deleteTransaction(a.id, a.todas_as_parcelas)).removed })),
  );

  // ---------- Contas fixas ----------
  server.registerTool(
    "pessoal_criar_conta_fixa",
    {
      title: "Pessoal: criar conta fixa",
      description: d("Cadastra uma conta fixa mensal pessoal (aluguel, internet, escola...). A conta de cada mês é gerada sozinha, com alerta 3 dias antes de vencer."),
      inputSchema: {
        nome: z.string().min(1),
        valor: VALOR,
        dia_vencimento: z.number().int().min(1).max(31),
        categoria: z.string().describe("Categoria de saída"),
        conta: z.string().optional().describe("Conta de onde costuma sair o pagamento"),
      },
    },
    (a) =>
      run(async () => {
        const category = await pf.resolveCategory(a.categoria, "SAIDA");
        const accountId = a.conta ? (await pf.resolveAccount(a.conta)).id : null;
        const b = await pf.saveBill({ name: a.nome, amount: a.valor, dueDay: a.dia_vencimento, categoryId: category.id, accountId });
        return { contaFixa: { id: b.id, nome: b.name, valor: brl(Number(b.amount)), dia: b.dueDay } };
      }),
  );

  server.registerTool(
    "pessoal_listar_contas_fixas",
    {
      title: "Pessoal: listar contas fixas do mês",
      description: d('Lista as contas fixas pessoais de um mês com valor, vencimento, pago/pendente e alerta ("vence em 3 dias", "vencida"). Use status para filtrar.'),
      inputSchema: { mes: MES, status: z.enum(["pendente", "pago"]).optional() },
    },
    (a) =>
      run(async () => {
        const rows = await pf.listBillOccurrences({ month: a.mes ?? pf.currentMonth(), status: a.status ? (a.status === "pago" ? "PAGO" : "PENDENTE") : undefined });
        return {
          mes: a.mes ?? pf.currentMonth(),
          contas: rows.map((r) => ({ id: r.id, nome: r.name, valor: brl(r.amount), vencimento: r.dueDate, status: r.status === "PAGO" ? "pago" : "pendente", pagoEm: r.paidAt, alerta: r.alert, conta: r.account })),
        };
      }),
  );

  server.registerTool(
    "pessoal_marcar_conta_paga",
    {
      title: "Pessoal: marcar conta fixa como paga",
      description: d("Marca a conta fixa do mês como paga e lança a saída na conta. Use o ID de pessoal_listar_contas_fixas. Se a conta fixa não tem conta padrão, informe de qual conta saiu."),
      inputSchema: { id: ID("da conta fixa do mês"), conta: z.string().optional(), data: DIA, valor: VALOR.optional().describe("Se pagou valor diferente") },
    },
    (a) =>
      run(async () => {
        const accountId = a.conta ? (await pf.resolveAccount(a.conta)).id : undefined;
        const r = await pf.markBillPaid(a.id, { accountId, date: a.data, amount: a.valor });
        return { pago: { ...r, amount: brl(r.amount) } };
      }),
  );

  // ---------- Dívidas ----------
  const debtOut = (x: Awaited<ReturnType<typeof pf.listDebts>>[number]) => ({
    id: x.id,
    credor: x.creditor,
    tipo: PF_DEBT_TYPES[x.type],
    saldo: brl(Number(x.balance)),
    jurosAoMes: `${String(Number(x.monthlyRate)).replace(".", ",")}%`,
    parcela: brl(Number(x.installment)),
    parcelasRestantes: x.remainingInstallments,
    diaVencimento: x.dueDay,
    status: PF_DEBT_STATUS[x.status],
    diasEmAtraso: x.daysLate,
    observacao: x.notes,
    negociacoes: x.negotiations.map((n) => ({ data: brDayKey(n.date), proposta: n.proposal, resultado: n.result })),
  });
  const debtPatch = (a: {
    credor?: string;
    tipo?: z.infer<typeof tipoDivida>;
    saldo?: number;
    juros_ao_mes?: number;
    parcela?: number;
    parcelas_restantes?: number;
    dia_vencimento?: number;
    status?: z.infer<typeof statusDivida>;
    dias_em_atraso?: number;
    observacao?: string;
  }) => ({
    creditor: a.credor,
    type: a.tipo ? (a.tipo.toUpperCase() as "OUTRO") : undefined,
    balance: a.saldo,
    monthlyRate: a.juros_ao_mes,
    installment: a.parcela,
    remainingInstallments: a.parcelas_restantes,
    dueDay: a.dia_vencimento,
    status: a.status ? (a.status.toUpperCase() as "EM_DIA") : undefined,
    daysLate: a.dias_em_atraso,
    notes: a.observacao,
  });
  const debtFields = {
    juros_ao_mes: z.number().min(0).max(100).optional().describe("Juros ao mês em %, ex.: 3.5"),
    parcela: z.number().min(0).optional(),
    parcelas_restantes: z.number().int().min(0).optional(),
    dia_vencimento: z.number().int().min(1).max(31).optional(),
    status: statusDivida.optional(),
    dias_em_atraso: z.number().int().min(0).optional(),
    observacao: z.string().optional(),
  };

  server.registerTool(
    "pessoal_criar_divida",
    {
      title: "Pessoal: cadastrar dívida",
      description: d("Cadastra uma dívida pessoal: credor, tipo, saldo atual, juros ao mês, parcela, parcelas restantes e situação."),
      inputSchema: { credor: z.string().min(1), tipo: tipoDivida, saldo: z.number().min(0), ...debtFields },
    },
    (a) =>
      run(async () => {
        const p = debtPatch(a);
        const x = await pf.createDebt({ ...p, creditor: a.credor, type: p.type!, balance: a.saldo });
        return { divida: { id: x.id, credor: x.creditor, saldo: brl(Number(x.balance)) } };
      }),
  );

  server.registerTool(
    "pessoal_atualizar_divida",
    {
      title: "Pessoal: atualizar dívida",
      description: d("Atualiza dados de uma dívida pessoal (saldo, juros, parcela, situação, dias em atraso...). Só informe o que muda. Saldo 0 marca como quitada."),
      inputSchema: { id: ID("da dívida"), credor: z.string().optional(), tipo: tipoDivida.optional(), saldo: z.number().min(0).optional(), ...debtFields },
    },
    (a) =>
      run(async () => {
        const r = await pf.updateDebt(a.id, debtPatch(a));
        return { id: a.id, saldoAntes: brl(Number(r.before.balance)), saldoDepois: brl(Number(r.after.balance)), status: PF_DEBT_STATUS[r.after.status] };
      }),
  );

  server.registerTool(
    "pessoal_listar_dividas",
    {
      title: "Pessoal: listar dívidas",
      description: d("Lista as dívidas pessoais com saldo, juros, parcela, situação, dias em atraso e histórico de negociações, com o total devido e o total de parcelas."),
      inputSchema: { incluir_quitadas: z.boolean().optional() },
    },
    (a) =>
      run(async () => {
        const debts = await pf.listDebts(!!a.incluir_quitadas);
        const open = debts.filter((x) => x.status !== "QUITADA");
        return {
          totalDevido: brl(open.reduce((s, x) => s + Number(x.balance), 0)),
          parcelasPorMes: brl(open.reduce((s, x) => s + Number(x.installment), 0)),
          dividas: debts.map(debtOut),
        };
      }),
  );

  server.registerTool(
    "pessoal_registrar_negociacao",
    {
      title: "Pessoal: registrar negociação de dívida",
      description: d("Guarda no histórico da dívida pessoal uma negociação: data, proposta e resultado. Para mudar a situação, use também pessoal_atualizar_divida."),
      inputSchema: { id_divida: ID("da dívida"), proposta: z.string().min(1), resultado: z.string().optional(), data: DIA },
    },
    (a) => run(async () => ({ negociacao: { id: (await pf.addNegotiation(a.id_divida, { date: a.data, proposal: a.proposta, result: a.resultado })).id } })),
  );

  server.registerTool(
    "pessoal_simular_quitacao",
    {
      title: "Pessoal: simular quitação das dívidas",
      description: d("Compara Avalanche (maior juro primeiro) e Bola de Neve (menor saldo primeiro) com um valor extra por mês, mostrando a data de liberdade e o total de juros de cada uma, e o cenário sem extra."),
      inputSchema: { valor_extra_por_mes: z.number().min(0) },
    },
    (a) =>
      run(async () => {
        const r = await pf.simulateDebtPayoff(a.valor_extra_por_mes);
        return {
          valorExtraPorMes: brl(a.valor_extra_por_mes),
          dividasConsideradas: r.debts.map((x) => ({ credor: x.name, saldo: brl(x.balance), jurosAoMes: `${x.monthlyRate}%`, parcela: brl(x.installment) })),
          avalanche: strategyText(r.avalanche),
          bolaDeNeve: strategyText(r.bolaDeNeve),
          semValorExtra: strategyText(r.semExtra),
          economiaDeJurosComAvalanche: brl(r.economiaJurosAvalanche),
          observacao: "Estimativa: juros todo mês, parcelas mínimas pagas e o extra (mais as parcelas das já quitadas) vai para a dívida da vez.",
        };
      }),
  );

  // ---------- Metas ----------
  server.registerTool(
    "pessoal_criar_meta",
    {
      title: "Pessoal: criar meta",
      description: d("Cria uma meta pessoal (viagem, carro, curso...) com valor-alvo, prazo e quanto já tem. A Reserva de Emergência já existe; use pessoal_atualizar_meta para ela."),
      inputSchema: { nome: z.string().min(1), valor_alvo: VALOR, prazo: z.string().optional().describe("AAAA-MM-DD"), ja_tenho: z.number().min(0).optional() },
    },
    (a) =>
      run(async () => {
        const g = await pf.saveGoal({ name: a.nome, target: a.valor_alvo, deadline: a.prazo ?? null, current: a.ja_tenho ?? 0 });
        return { meta: { id: g.id, nome: g.name } };
      }),
  );

  server.registerTool(
    "pessoal_atualizar_meta",
    {
      title: "Pessoal: atualizar meta",
      description: d('Atualiza uma meta pessoal pelo nome ou ID (ex.: "Reserva de Emergência"): valor-alvo, prazo, quanto já tem, somar um depósito (negativo retira) ou marcar concluída.'),
      inputSchema: {
        meta: z.string().describe("Nome ou ID da meta"),
        valor_alvo: z.number().min(0).optional(),
        prazo: z.string().optional().describe("AAAA-MM-DD; vazio tira o prazo"),
        ja_tenho: z.number().min(0).optional().describe("Novo total guardado"),
        somar: z.number().optional().describe("Valor a somar ao guardado (negativo retira)"),
        concluida: z.boolean().optional(),
        novo_nome: z.string().optional(),
      },
    },
    (a) =>
      run(async () => {
        const goal = await pf.resolveGoal(a.meta);
        const current = a.somar !== undefined ? Math.max(0, Number(goal.current) + a.somar) : a.ja_tenho;
        const g = await pf.saveGoal({ id: goal.id, name: a.novo_nome, target: a.valor_alvo, deadline: a.prazo === undefined ? undefined : a.prazo || null, current, done: a.concluida });
        return { meta: { id: g.id, nome: g.name, jaTenho: brl(Number(g.current)), alvo: brl(Number(g.target)) } };
      }),
  );

  server.registerTool(
    "pessoal_progresso_metas",
    {
      title: "Pessoal: progresso das metas",
      description: d("Mostra cada meta pessoal com quanto já tem, alvo, percentual, prazo e quanto guardar por mês para chegar no prazo."),
      inputSchema: {},
    },
    () =>
      run(async () => ({
        metas: (await pf.getGoalsProgress()).map((g) => ({
          id: g.id,
          nome: g.name,
          reservaDeEmergencia: g.emergency,
          concluida: g.done,
          jaTenho: brl(g.current),
          alvo: brl(g.target),
          falta: brl(g.missing),
          percentual: pct(g.percent),
          prazo: g.deadline,
          guardarPorMes: g.suggestedMonthly === null ? "sem prazo definido" : brl(g.suggestedMonthly),
        })),
      })),
  );

  // ---------- Investimentos ----------
  server.registerTool(
    "pessoal_registrar_investimento",
    {
      title: "Pessoal: registrar investimento",
      description: d("Registra uma aplicação pessoal (Tesouro Selic, CDB...). Se informar conta_de_origem, lança a saída como \"Reserva e Investimentos\" (conta como poupança, não como gasto)."),
      inputSchema: {
        nome: z.string().min(1),
        instituicao: z.string().optional(),
        valor_aplicado: VALOR,
        valor_atual: z.number().min(0).optional().describe("Padrão: igual ao aplicado"),
        liquidez: z.enum(["diaria", "no_vencimento"]).optional(),
        data: DIA,
        vencimento: z.string().optional().describe("AAAA-MM-DD"),
        conta_de_origem: z.string().optional(),
      },
    },
    (a) =>
      run(async () => {
        const fromAccountId = a.conta_de_origem ? (await pf.resolveAccount(a.conta_de_origem)).id : null;
        const inv = await pf.saveInvestment({
          name: a.nome,
          institution: a.instituicao ?? null,
          applied: a.valor_aplicado,
          current: a.valor_atual,
          liquidity: a.liquidez === "no_vencimento" ? "NO_VENCIMENTO" : "DIARIA",
          appliedAt: a.data ?? pf.todayKey(),
          maturityDate: a.vencimento ?? null,
          fromAccountId,
        });
        return { investimento: { id: inv.id, nome: inv.name }, saidaLancada: !!fromAccountId };
      }),
  );

  server.registerTool(
    "pessoal_atualizar_investimento",
    {
      title: "Pessoal: atualizar investimento",
      description: d("Atualiza um investimento pessoal pelo nome ou ID: valor atual (para ver o rendimento), valor aplicado, vencimento, liquidez ou marcar como resgatado."),
      inputSchema: {
        investimento: z.string().describe("Nome ou ID"),
        valor_atual: z.number().min(0).optional(),
        valor_aplicado: VALOR.optional(),
        liquidez: z.enum(["diaria", "no_vencimento"]).optional(),
        vencimento: z.string().optional(),
        resgatado: z.boolean().optional(),
      },
    },
    (a) =>
      run(async () => {
        const inv = await pf.resolveInvestment(a.investimento);
        const r = await pf.saveInvestment({
          id: inv.id,
          current: a.valor_atual,
          applied: a.valor_aplicado,
          liquidity: a.liquidez ? (a.liquidez === "diaria" ? "DIARIA" : "NO_VENCIMENTO") : undefined,
          maturityDate: a.vencimento === undefined ? undefined : a.vencimento || null,
          redeemed: a.resgatado,
        });
        return { investimento: { id: r.id, nome: r.name, aplicado: brl(Number(r.applied)), atual: brl(Number(r.current)), rendimento: brl(Number(r.current) - Number(r.applied)) } };
      }),
  );

  server.registerTool(
    "pessoal_listar_investimentos",
    {
      title: "Pessoal: listar investimentos",
      description: d("Lista os investimentos pessoais com instituição, aplicado, valor atual, rendimento (R$ e %), liquidez e datas, com os totais."),
      inputSchema: { incluir_resgatados: z.boolean().optional() },
    },
    (a) =>
      run(async () => {
        const rows = await pf.listInvestments(!!a.incluir_resgatados);
        const ativos = rows.filter((r) => !r.redeemed);
        const aplicado = ativos.reduce((s, r) => s + r.applied, 0);
        const atual = ativos.reduce((s, r) => s + r.current, 0);
        return {
          totalAplicado: brl(aplicado),
          totalAtual: brl(atual),
          rendimentoTotal: brl(atual - aplicado),
          investimentos: rows.map((r) => ({
            id: r.id,
            nome: r.name,
            instituicao: r.institution,
            aplicado: brl(r.applied),
            atual: brl(r.current),
            rendimento: `${brl(r.yield)} (${r.yieldPercent.toString().replace(".", ",")}%)`,
            liquidez: PF_LIQUIDITY[r.liquidity],
            aplicadoEm: r.appliedAt,
            vencimento: r.maturityDate,
            resgatado: r.redeemed,
          })),
        };
      }),
  );

  // ---------- Orçamento, resumo e painel ----------
  server.registerTool(
    "pessoal_definir_orcamento",
    {
      title: "Pessoal: definir orçamento",
      description: d("Define o limite mensal de gasto de uma categoria pessoal. Vale a partir do mês informado até mudar. Limite 0 tira o controle."),
      inputSchema: { categoria: z.string(), limite: z.number().min(0), mes: MES },
    },
    (a) =>
      run(async () => {
        const category = await pf.resolveCategory(a.categoria, "SAIDA");
        const b = await pf.setBudget({ month: a.mes, categoryId: category.id, limit: a.limite });
        const status = (await pf.getBudgetStatus(b.month)).find((s) => s.categoryId === category.id);
        return { orcamento: { categoria: category.name, aPartirDe: b.month, limite: brl(Number(b.limit)), gastoNoMes: brl(status?.spent ?? 0), percentual: pct(status?.percent ?? null) } };
      }),
  );

  server.registerTool(
    "pessoal_resumo_mes",
    {
      title: "Pessoal: resumo / fechamento do mês",
      description: d("Fechamento do mês pessoal: entradas, saídas, sobra, guardado, gastos por categoria, orçamento x gasto, indicadores e comparação com o mês anterior."),
      inputSchema: { mes: MES },
    },
    (a) =>
      run(async () => {
        const [r, budget] = await Promise.all([pf.getMonthSummary(a.mes), pf.getBudgetStatus(a.mes)]);
        const i = r.indicadores;
        return {
          mes: r.month,
          entradas: brl(r.entradas),
          saidas: brl(r.saidas),
          gastos: brl(r.gastos),
          guardado: brl(r.guardado),
          sobra: brl(r.sobra),
          gastosPorCategoria: r.porCategoria.map((c) => ({ categoria: c.category, valor: brl(c.value) })),
          orcamento: budget.filter((b) => b.limit > 0).map((b) => ({ categoria: b.category, limite: brl(b.limit), gasto: brl(b.spent), percentual: pct(b.percent), semaforo: b.tone })),
          indicadores: {
            rendaComprometidaComDividas: `${pct(i.rendaComprometida.percent)} (${i.rendaComprometida.tone})`,
            taxaDePoupanca: `${pct(i.taxaPoupanca.percent)} (${i.taxaPoupanca.tone})`,
            mesesDeReserva: `${i.mesesReserva.meses === null ? "sem dados" : String(i.mesesReserva.meses).replace(".", ",")} (${i.mesesReserva.tone})`,
          },
          mesAnterior: {
            mes: r.anterior.month,
            entradas: brl(r.anterior.entradas),
            saidas: brl(r.anterior.saidas),
            sobra: brl(r.anterior.sobra),
            variacaoEntradas: pct(r.anterior.variacaoEntradas),
            variacaoSaidas: pct(r.anterior.variacaoSaidas),
          },
        };
      }),
  );

  server.registerTool(
    "pessoal_dashboard",
    {
      title: "Pessoal: painel completo",
      description: d(
        "Todos os indicadores pessoais de uma vez: saldo total, entradas/saídas/sobra do mês, % da renda comprometida com dívidas, taxa de poupança, meses de reserva, patrimônio líquido, data prevista de liberdade das dívidas, orçamento, metas, investido e contas a vencer em 7 dias. Semáforo: green = bom, yellow = atenção, red = alerta.",
      ),
      inputSchema: {},
    },
    () =>
      run(async () => {
        const x = await pf.getDashboard();
        const i = x.indicadores;
        return {
          mes: x.month,
          saldoTotal: brl(x.cards.saldoTotal),
          entradasDoMes: brl(x.cards.entradasMes),
          saidasDoMes: brl(x.cards.saidasMes),
          sobraDoMes: brl(x.cards.sobraMes),
          indicadores: {
            rendaComprometidaComDividas: { percentual: pct(i.rendaComprometida.percent), semaforo: i.rendaComprometida.tone, parcelas: brl(i.parcelasDividas), rendaConsiderada: brl(i.rendaConsiderada) },
            taxaDePoupanca: { percentual: pct(i.taxaPoupanca.percent), semaforo: i.taxaPoupanca.tone },
            mesesDeReserva: { meses: i.mesesReserva.meses, semaforo: i.mesesReserva.tone, reserva: brl(i.mesesReserva.reserva), gastosEssenciaisPorMes: brl(i.mesesReserva.gastosEssenciaisMes) },
            patrimonioLiquido: {
              valor: brl(i.patrimonioLiquido.valor),
              semaforo: i.patrimonioLiquido.tone,
              contas: brl(i.patrimonioLiquido.contas),
              investimentos: brl(i.patrimonioLiquido.investimentos),
              dividas: brl(i.patrimonioLiquido.dividas),
            },
          },
          liberdadeDasDividas: x.liberdadeDividas.quita ? x.liberdadeDividas.mes : "com as parcelas atuais não quita",
          gastosPorCategoria: x.gastosPorCategoria.map((c) => ({ categoria: c.category, valor: brl(c.value) })),
          orcamento: x.orcamento.map((b) => ({ categoria: b.category, limite: brl(b.limit), gasto: brl(b.spent), semaforo: b.tone })),
          metas: x.metas.map((g) => ({ nome: g.name, jaTenho: brl(g.current), alvo: brl(g.target), percentual: pct(g.percent) })),
          proximasContas7Dias: x.proximasContas.map((c) => ({ nome: c.name, valor: brl(c.amount), vencimento: c.dueDate, alerta: c.alert })),
          contas: x.contas.map((c) => ({ nome: c.name, saldo: brl(c.balance) })),
        };
      }),
  );
}
