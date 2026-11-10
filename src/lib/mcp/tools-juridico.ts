import "server-only";
import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { prisma } from "@/lib/prisma";
import { formatCurrencyBRL, formatDateBR } from "@/lib/utils";
import { displayClientName } from "@/lib/client-display";
import { errorResult, textResult, resolveClientId } from "@/lib/mcp/tools";
import {
  CONTRACT_STATUS_LABELS,
  CONTRACT_TRANSITIONS,
  OperationError,
  changeContractStatus,
  checkContract,
  createContract,
  missingClientData,
  recordLegalConsultation,
  refreshContractStatuses,
  resolveContract,
  resolveQuote,
  resolveTemplate,
  updateContract,
  updateContractTemplate,
  type Actor,
} from "@/lib/contracts";
import { parseContractFields, FIELD_TYPES } from "@/lib/contract-render";
import { AUTO_TOKEN_LABELS, QUOTE_PREFILL_KEYS } from "@/lib/contract-auto-tokens";
import { contractNextDate, contractValue, contractWhatsAppMessage } from "@/lib/contract-display";
import { renderContractPdf, renderTemplatePdf } from "@/lib/pdf/render-contract";
import type { Prisma } from "@/generated/prisma/client";

// Ferramentas do funcionário Jurídico: contratos, modelos e orientações.

type Ctx = { userId: string; origin: string };

const STATUS = ["RASCUNHO", "ENVIADO", "ASSINADO", "VIGENTE", "ENCERRADO", "RESCINDIDO"] as const;
const CONTRATO = z.string({ message: "Informe o contrato." }).min(1).describe("Número do contrato (ex.: MON-2026-003) ou ID");
const CAMPOS = z
  .record(z.string(), z.string())
  .optional()
  .describe('Valores dos campos do modelo, pela chave (ver listar_modelos_contrato). Ex.: {"valor": "300", "dia_vencimento": "10", "data_inicio": "2026-11-15"}');

async function run(action: () => Promise<unknown>): Promise<CallToolResult> {
  try {
    return textResult({ ok: true, ...((await action()) as object) });
  } catch (e) {
    if (e instanceof OperationError) return errorResult(e.message);
    console.error("Erro em ferramenta MCP (jurídico):", e);
    return errorResult("Não consegui concluir por um erro interno. Nada foi confirmado; tente de novo.");
  }
}

async function clientIdOrThrow(ref: string) {
  const r = await resolveClientId(ref);
  if (!r.ok) throw new OperationError(r.error);
  if (!r.clientId) throw new OperationError("Informe o cliente.");
  return r.clientId;
}

type ContractWithClient = Prisma.ContractGetPayload<{ include: { client: true } }>;

function contractSummary(c: ContractWithClient, origin: string) {
  return {
    id: c.id,
    numero: c.code,
    tipo: c.kind,
    titulo: c.title,
    cliente: displayClientName(c.client),
    status: CONTRACT_STATUS_LABELS[c.status],
    valor: contractValue(c),
    pagamento: c.paymentTerms,
    inicio: c.startDate ? formatDateBR(c.startDate) : null,
    vencimentoOuReajuste: contractNextDate(c),
    enviadoEm: c.sentAt ? formatDateBR(c.sentAt) : null,
    assinadoEm: c.signedAt ? `${formatDateBR(c.signedAt)} (${c.signatureMethod})` : null,
    versao: c.currentVersion,
    proximosStatus: CONTRACT_TRANSITIONS[c.status].map((s) => s),
    tela: `${origin}/juridico/contratos/${c.id}`,
    pdf: `${origin}/juridico/contratos/${c.id}/pdf`,
  };
}

export function registerJuridicoTools(server: McpServer, ctx: Ctx) {
  const actor = (tool: string): Actor => ({ userId: ctx.userId, source: "Claude", tool });

  server.registerTool(
    "listar_modelos_contrato",
    {
      title: "Listar modelos de contrato",
      description:
        "Lista os modelos ativos do Jurídico (chave, quando usar e campos). Os campos marcados vemDoOrcamento são preenchidos pelo orçamento ligado; os automáticos vêm do cadastro do cliente e da Monteiro.",
      inputSchema: { incluir_inativos: z.boolean().optional() },
    },
    ({ incluir_inativos }) =>
      run(async () => {
        const rows = await prisma.contractTemplate.findMany({
          where: incluir_inativos ? {} : { active: true },
          orderBy: [{ kind: "asc" }, { name: "asc" }],
        });
        return {
          camposAutomaticos: AUTO_TOKEN_LABELS,
          modelos: rows.map((t) => ({
            id: t.id,
            chave: t.slug,
            nome: t.name,
            tipo: t.kind,
            ativo: t.active,
            versao: t.version,
            quandoUsar: t.description,
            campos: parseContractFields(t.fieldsSchema).map((f) => ({
              chave: f.key,
              nome: f.label,
              tipo: f.type,
              obrigatorio: f.required,
              padrao: f.default ?? null,
              dica: f.hint ?? null,
              vemDoOrcamento: (QUOTE_PREFILL_KEYS as readonly string[]).includes(f.key),
            })),
          })),
        };
      }),
  );

  server.registerTool(
    "listar_contratos",
    {
      title: "Listar contratos",
      description: "Lista contratos e documentos do Jurídico, com filtros. Atualiza sozinho Assinado → Vigente e Vigente → Encerrado pelas datas.",
      inputSchema: {
        cliente: z.string().optional().describe("Nome ou ID do cliente"),
        status: z.enum(STATUS).optional(),
        busca: z.string().optional().describe("Parte do número ou do título"),
        vence_em_dias: z.number().int().positive().optional().describe("Só contratos com fim ou reajuste nos próximos N dias"),
      },
    },
    (a) =>
      run(async () => {
        await refreshContractStatuses();
        const where: Prisma.ContractWhereInput = {};
        if (a.cliente) where.clientId = await clientIdOrThrow(a.cliente);
        if (a.status) where.status = a.status;
        if (a.busca) where.OR = [{ code: { contains: a.busca, mode: "insensitive" } }, { title: { contains: a.busca, mode: "insensitive" } }];
        if (a.vence_em_dias) {
          const now = new Date();
          const limit = new Date(now.getTime() + a.vence_em_dias * 86400000);
          where.status = { in: ["ASSINADO", "VIGENTE"] };
          where.AND = [{ OR: [{ endDate: { gte: now, lte: limit } }, { renewalDate: { gte: now, lte: limit } }] }];
        }
        const rows = await prisma.contract.findMany({ where, include: { client: true }, orderBy: [{ year: "desc" }, { sequence: "desc" }], take: 50 });
        return { total: rows.length, contratos: rows.map((c) => contractSummary(c, ctx.origin)) };
      }),
  );

  server.registerTool(
    "criar_contrato",
    {
      title: "Criar contrato",
      description:
        "Gera um contrato (status Rascunho) a partir de um modelo, com os dados do cliente, da Monteiro e do orçamento. Use apenas_conferir: true antes, para saber o que falta sem gravar. Se faltar CPF/CNPJ, endereço ou campo obrigatório, recusa e diz o quê — nunca invente dado: pergunte ao João e use atualizar_cliente.",
      inputSchema: {
        cliente: z.string().min(1).describe("Nome ou ID do cliente"),
        modelo: z.string().min(1).describe("Chave (ex.: criacao-site), nome ou ID do modelo"),
        orcamento: z.string().optional().describe('Número ou ID do orçamento aceito. Vazio: usa o único orçamento aprovado do cliente sem contrato, se houver; "nenhum" para não ligar.'),
        campos: CAMPOS,
        titulo: z.string().optional(),
        observacoes: z.string().optional().describe("Anotação interna, não entra no contrato"),
        apenas_conferir: z.boolean().optional().describe("true = só diz o que falta e os valores que entrariam, sem gravar"),
      },
    },
    (a) =>
      run(async () => {
        const clientId = await clientIdOrThrow(a.cliente);
        const template = await resolveTemplate(a.modelo);
        let quoteId: string | null = null;
        let quoteNote: string | null = null;
        if (a.orcamento && a.orcamento.toLowerCase() !== "nenhum") {
          quoteId = (await resolveQuote(a.orcamento)).id;
        } else if (!a.orcamento) {
          const approved = await prisma.quote.findMany({
            where: { clientId, status: "APROVADO", contracts: { none: { status: { notIn: ["ENCERRADO", "RESCINDIDO"] } } } },
            orderBy: { respondedAt: "desc" },
          });
          if (approved.length === 1) {
            quoteId = approved[0].id;
            quoteNote = `Usei o orçamento aprovado nº ${approved[0].number}.`;
          } else if (approved.length > 1) {
            throw new OperationError(
              `O cliente tem ${approved.length} orçamentos aprovados sem contrato (nº ${approved.map((q) => q.number).join(", ")}). Diga qual usar em "orcamento", ou "nenhum".`,
            );
          }
        }
        const input = { clientId, templateId: template.id, quoteId, title: a.titulo, values: a.campos ?? {}, notes: a.observacoes };
        if (a.apenas_conferir) return { conferencia: await checkContract(input), aviso: quoteNote };

        const contract = await createContract(input, actor("criar_contrato"));
        const full = await prisma.contract.findUniqueOrThrow({ where: { id: contract.id }, include: { client: true } });
        return {
          ...contractSummary(full, ctx.origin),
          aviso: [quoteNote, "Gerado como Rascunho. Confira o PDF; depois de enviar ao cliente, use mudar_status_contrato com ENVIADO."]
            .filter(Boolean)
            .join(" "),
          mensagemWhatsApp: contractWhatsAppMessage({ clientName: displayClientName(full.client), code: full.code, title: full.title }),
        };
      }),
  );

  server.registerTool(
    "atualizar_contrato",
    {
      title: "Atualizar contrato",
      description:
        "Altera um contrato em Rascunho ou Enviado: campos (o texto é montado de novo), o texto inteiro, título, observações ou o orçamento ligado. Cada mudança no texto cria uma versão; se já estava Enviado, volta para Rascunho. Contrato assinado não muda — faça um aditivo (novo contrato).",
      inputSchema: {
        contrato: CONTRATO,
        campos: CAMPOS,
        texto: z.string().optional().describe("Texto completo novo (substitui o atual). Use só para ajustes que os campos não cobrem."),
        titulo: z.string().optional(),
        observacoes: z.string().optional(),
        orcamento: z.string().optional().describe('Número ou ID do orçamento; "nenhum" desliga'),
        motivo: z.string().optional().describe("O que mudou (fica no histórico de versões)"),
      },
    },
    (a) =>
      run(async () => {
        const c = await resolveContract(a.contrato);
        const quoteId = a.orcamento === undefined ? undefined : a.orcamento.toLowerCase() === "nenhum" ? null : (await resolveQuote(a.orcamento)).id;
        await updateContract(
          c.id,
          { values: a.texto === undefined ? a.campos : undefined, renderedContent: a.texto, title: a.titulo, notes: a.observacoes, quoteId, reason: a.motivo },
          actor("atualizar_contrato"),
        );
        const full = await prisma.contract.findUniqueOrThrow({ where: { id: c.id }, include: { client: true } });
        return contractSummary(full, ctx.origin);
      }),
  );

  server.registerTool(
    "mudar_status_contrato",
    {
      title: "Mudar status do contrato",
      description:
        "Rascunho → Enviado → Assinado → Vigente → Encerrado/Rescindido. Ao marcar ASSINADO, liga as contas a receber do orçamento e põe na agenda os vencimentos, o aviso de reajuste e o fim do contrato, com a mensagem pronta. Encerrar ou rescindir pede motivo.",
      inputSchema: {
        contrato: CONTRATO,
        status: z.enum(STATUS),
        motivo: z.string().optional().describe("Observação; obrigatório para ENCERRADO/RESCINDIDO"),
        data_assinatura: z.string().optional().describe("AAAA-MM-DD (padrão: hoje)"),
        forma_assinatura: z.string().optional().describe('"gov.br" (padrão), "presencial" ou "outra"'),
      },
    },
    (a) =>
      run(async () => {
        const c = await resolveContract(a.contrato);
        const { agenda } = await changeContractStatus(
          c.id,
          a.status,
          { note: a.motivo, signedAt: a.data_assinatura, signatureMethod: a.forma_assinatura },
          actor("mudar_status_contrato"),
        );
        const full = await prisma.contract.findUniqueOrThrow({ where: { id: c.id }, include: { client: true } });
        return { ...contractSummary(full, ctx.origin), agendaCriada: agenda };
      }),
  );

  server.registerTool(
    "gerar_pdf_contrato",
    {
      title: "Gerar PDF do contrato",
      description:
        "Gera o PDF (identidade da Monteiro) de um contrato, de uma versão antiga, ou a prévia de um modelo (útil para os termos dos e-books, que não têm cliente). Devolve o link (abre logado no CRM) e o arquivo.",
      inputSchema: {
        contrato: z.string().optional().describe("Número ou ID do contrato"),
        versao: z.number().int().positive().optional(),
        modelo: z.string().optional().describe("Em vez de contrato: chave, nome ou ID do modelo para prévia"),
        tipo_cliente: z.enum(["PF", "PJ"]).optional().describe("Na prévia de modelo: qual versão das cláusulas mostrar"),
      },
    },
    async (a): Promise<CallToolResult> => {
      try {
        let pdf: { buffer: Buffer; filename: string } | null;
        let link: string;
        if (a.contrato) {
          const c = await resolveContract(a.contrato);
          pdf = await renderContractPdf(c.id, a.versao);
          if (!pdf) return errorResult(`Versão ${a.versao} não existe no contrato ${c.code}.`);
          link = `${ctx.origin}/juridico/contratos/${c.id}/pdf${a.versao ? `?versao=${a.versao}` : ""}`;
        } else if (a.modelo) {
          const t = await resolveTemplate(a.modelo);
          pdf = await renderTemplatePdf(t.id, a.tipo_cliente ?? "PF");
          link = `${ctx.origin}/juridico/modelos/${t.id}/pdf${a.tipo_cliente === "PJ" ? "?tipo=PJ" : ""}`;
        } else {
          return errorResult("Informe o contrato ou o modelo.");
        }
        return {
          content: [
            { type: "text", text: JSON.stringify({ ok: true, arquivo: pdf.filename, link, tamanhoKB: Math.round(pdf.buffer.length / 1024) }, null, 2) },
            { type: "resource", resource: { uri: link, mimeType: "application/pdf", blob: Buffer.from(pdf.buffer).toString("base64") } },
          ],
        };
      } catch (e) {
        if (e instanceof OperationError) return errorResult(e.message);
        console.error("Erro ao gerar PDF de contrato:", e);
        return errorResult("Não consegui gerar o PDF. Tente de novo.");
      }
    },
  );

  server.registerTool(
    "atualizar_modelo_contrato",
    {
      title: "Atualizar modelo de contrato",
      description:
        "Muda um modelo do Jurídico (texto, campos, nome, descrição). Sempre cria uma versão nova; contratos já gerados ficam com a versão antiga. Mostre a mudança ao João antes de gravar.",
      inputSchema: {
        modelo: z.string().min(1).describe("Chave, nome ou ID do modelo"),
        nome: z.string().optional(),
        descricao: z.string().optional(),
        categoria: z.string().optional(),
        texto: z.string().optional().describe("Texto completo do modelo, com {{campos}} e blocos [[PF]]/[[PJ]]/[[se campo]]"),
        campos: z
          .array(
            z.object({
              chave: z.string(),
              nome: z.string(),
              tipo: z.enum(FIELD_TYPES as [string, ...string[]]),
              obrigatorio: z.boolean(),
              padrao: z.string().optional(),
              dica: z.string().optional(),
            }),
          )
          .optional()
          .describe("Lista completa de campos (substitui a atual)"),
      },
    },
    (a) =>
      run(async () => {
        const t = await resolveTemplate(a.modelo);
        const created = await updateContractTemplate(
          t.id,
          {
            name: a.nome,
            description: a.descricao,
            category: a.categoria,
            content: a.texto,
            fields: a.campos?.map((f) => ({
              key: f.chave,
              label: f.nome,
              type: f.tipo as (typeof FIELD_TYPES)[number],
              required: f.obrigatorio,
              ...(f.padrao ? { default: f.padrao } : {}),
              ...(f.dica ? { hint: f.dica } : {}),
            })),
          },
          actor("atualizar_modelo_contrato"),
        );
        return { id: created.id, chave: created.slug, nome: created.name, versao: created.version };
      }),
  );

  server.registerTool(
    "registrar_orientacao_juridica",
    {
      title: "Registrar orientação jurídica",
      description: "Guarda no histórico (Jurídico › Consultas) uma dúvida jurídica da empresa e a orientação dada, marcando se foi recomendado procurar advogado.",
      inputSchema: {
        assunto: z.string().min(1),
        duvida: z.string().min(1),
        orientacao: z.string().min(1),
        precisa_advogado: z.boolean().optional(),
        cliente: z.string().optional().describe("Nome ou ID do cliente envolvido"),
        contrato: z.string().optional().describe("Número do contrato envolvido"),
      },
    },
    (a) =>
      run(async () => {
        const clientId = a.cliente ? await clientIdOrThrow(a.cliente) : null;
        const contractId = a.contrato ? (await resolveContract(a.contrato)).id : null;
        const row = await recordLegalConsultation(
          { topic: a.assunto, question: a.duvida, guidance: a.orientacao, needsLawyer: a.precisa_advogado, clientId, contractId },
          actor("registrar_orientacao_juridica"),
        );
        return { id: row.id, tela: `${ctx.origin}/juridico/consultas` };
      }),
  );

  server.registerTool(
    "listar_orientacoes_juridicas",
    {
      title: "Listar orientações jurídicas",
      description: "Mostra as últimas orientações jurídicas registradas, para não orientar diferente sobre o mesmo caso.",
      inputSchema: { busca: z.string().optional(), cliente: z.string().optional() },
    },
    (a) =>
      run(async () => {
        const where: Prisma.LegalConsultationWhereInput = {};
        if (a.cliente) where.clientId = await clientIdOrThrow(a.cliente);
        if (a.busca) where.OR = [{ topic: { contains: a.busca, mode: "insensitive" } }, { question: { contains: a.busca, mode: "insensitive" } }];
        const rows = await prisma.legalConsultation.findMany({ where, include: { client: true }, orderBy: { createdAt: "desc" }, take: 20 });
        return {
          orientacoes: rows.map((r) => ({
            data: formatDateBR(r.createdAt),
            assunto: r.topic,
            cliente: r.client ? displayClientName(r.client) : null,
            duvida: r.question,
            orientacao: r.guidance,
            precisaAdvogado: r.needsLawyer,
          })),
        };
      }),
  );

  server.registerTool(
    "conferir_cliente_para_contrato",
    {
      title: "Conferir cliente para contrato",
      description: "Diz quais dados do cadastro do cliente ainda faltam para fazer contrato (CPF/CNPJ, endereço, responsável da empresa) e mostra os contratos dele.",
      inputSchema: { cliente: z.string().min(1).describe("Nome ou ID do cliente") },
    },
    (a) =>
      run(async () => {
        const id = await clientIdOrThrow(a.cliente);
        const client = await prisma.client.findUniqueOrThrow({
          where: { id },
          include: {
            contracts: { orderBy: { createdAt: "desc" }, take: 10 },
            quotes: { where: { status: "APROVADO" }, include: { items: true }, orderBy: { respondedAt: "desc" }, take: 5 },
          },
        });
        return {
          cliente: displayClientName(client),
          tipo: client.type,
          falta: missingClientData(client),
          orcamentosAprovados: client.quotes.map((q) => ({
            numero: q.number,
            valor: formatCurrencyBRL(q.items.reduce((s, i) => s + Number(i.unitPrice) * i.quantity, 0)),
            pagamento: q.paymentTerms,
          })),
          contratos: client.contracts.map((c) => ({ numero: c.code, titulo: c.title, status: CONTRACT_STATUS_LABELS[c.status] })),
        };
      }),
  );
}
