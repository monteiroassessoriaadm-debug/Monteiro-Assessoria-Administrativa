import "server-only";
import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { prisma } from "@/lib/prisma";
import { displayClientName } from "@/lib/client-display";
import { formatCurrencyBRL } from "@/lib/utils";
import { calendarEventTypeLabels } from "@/lib/lead-labels";
import { logMcpAction, logClientTimelineViaClaude } from "@/lib/mcp/audit";
import { textResult, errorResult, resolveClientId, resolveServiceId } from "@/lib/mcp/tools";

type Ctx = { userId: string };

// ---------------------------------------------------------------------------
// Datas
// O CRM guarda data/hora "de parede" (o horário digitado no formulário) como se
// fosse UTC, e mostra em UTC. Para ficar igual ao que aparece nas telas, as
// ferramentas recebem e devolvem horário de Brasília nesse mesmo formato.
// ---------------------------------------------------------------------------
const BRASILIA_OFFSET_MS = 3 * 60 * 60 * 1000;

function parseWall(value: string | undefined | null): Date | null | "invalid" {
  if (!value) return null;
  const m = value.trim().match(/^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2}))?$/);
  if (!m) return "invalid";
  const [, y, mo, d, h, mi] = m;
  const date = new Date(Date.UTC(Number(y), Number(mo) - 1, Number(d), Number(h ?? 0), Number(mi ?? 0)));
  return Number.isNaN(date.getTime()) ? "invalid" : date;
}

/** "Agora" no mesmo formato de parede (horário de Brasília guardado como UTC). */
function nowWall() {
  return new Date(Date.now() - BRASILIA_OFFSET_MS);
}

function startOfWallDay(d: Date) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function fmtWall(d: Date | null | undefined) {
  if (!d) return null;
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: "UTC" }).format(d);
}

function fmtDay(d: Date | null | undefined) {
  if (!d) return null;
  return new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" }).format(d);
}

function weekday(d: Date) {
  return new Intl.DateTimeFormat("pt-BR", { weekday: "long", timeZone: "UTC" }).format(d);
}

const DATA_HORA = "Data e hora no horário de Brasília: YYYY-MM-DD ou YYYY-MM-DDTHH:mm";

// ---------------------------------------------------------------------------
// Resolvedores
// ---------------------------------------------------------------------------
const EMPRESA_NOME = "MONTEIRO ASSESSORIA ADMINISTRATIVA";

/** Cliente que representa a própria Monteiro (para os conteúdos do Instagram da empresa). */
async function getCompanyClientId(userId: string) {
  const existing = await prisma.client.findFirst({
    where: {
      OR: [
        { cnpj: { in: ["68.566.006/0001-64", "68566006000164"] } },
        { tradeName: { contains: "Monteiro Assessoria", mode: "insensitive" } },
        { legalName: { contains: "Monteiro Assessoria", mode: "insensitive" } },
      ],
    },
  });
  if (existing) return existing.id;
  const created = await prisma.client.create({
    data: {
      type: "PJ",
      tradeName: EMPRESA_NOME,
      legalName: EMPRESA_NOME,
      cnpj: "68.566.006/0001-64",
      instagram: "@monteiroassessoriaadm",
      whatsapp: "94992362433",
      email: "monteiroassessoriaadm@gmail.com",
      addressStreet: "Av. Maria de Sá",
      addressNumber: "s/n",
      addressNeighborhood: "Centro",
      addressCity: "Pau D'Arco",
      addressState: "PA",
      notes: "Cadastro da própria empresa, usado para os conteúdos do Instagram da Monteiro.",
      createdById: userId,
    },
  });
  return created.id;
}

async function resolveClientOrCompany(cliente: string | undefined, userId: string) {
  if (!cliente || /^(monteiro|empresa|nossa empresa|monteiro assessoria)$/i.test(cliente.trim())) {
    return { ok: true as const, clientId: await getCompanyClientId(userId) };
  }
  const r = await resolveClientId(cliente);
  if (!r.ok) return r;
  return { ok: true as const, clientId: r.clientId as string };
}

async function resolveUserId(nameOrId: string | undefined): Promise<
  { ok: true; userId: string | null } | { ok: false; error: string }
> {
  if (!nameOrId) return { ok: true, userId: null };
  const byId = await prisma.user.findUnique({ where: { id: nameOrId } });
  if (byId) return { ok: true, userId: byId.id };
  const matches = await prisma.user.findMany({
    where: {
      OR: [
        { name: { contains: nameOrId, mode: "insensitive" } },
        { email: { contains: nameOrId, mode: "insensitive" } },
      ],
    },
    take: 5,
  });
  if (matches.length === 1) return { ok: true, userId: matches[0].id };
  if (matches.length === 0) return { ok: false, error: `Nenhum usuário do CRM encontrado para "${nameOrId}".` };
  return { ok: false, error: `Mais de um usuário para "${nameOrId}": ${matches.map((u) => u.name).join(", ")}.` };
}

const EVENT_TYPES = [
  "ATENDIMENTO",
  "REUNIAO",
  "PRAZO",
  "ENTREGA",
  "PROSPECCAO",
  "TAREFA",
  "PUBLICACAO",
  "GRAVACAO",
  "RETORNO_CLIENTE",
] as const;

const MEDIA_STATUS = [
  "IDEIA",
  "EM_PRODUCAO",
  "AGUARDANDO_APROVACAO",
  "APROVADO",
  "REPROVADO",
  "PUBLICADO",
  "CANCELADO",
] as const;

export function registerExtraCrmTools(server: McpServer, ctx: Ctx) {
  // =========================================================================
  // AGENDA
  // =========================================================================
  server.registerTool(
    "listar_agenda",
    {
      title: "Listar agenda",
      description:
        "Lista os compromissos da agenda do CRM (atendimentos, reuniões, prazos, entregas, prospecção, publicações, gravações, retornos). Padrão: de hoje até 7 dias. Horários de Brasília.",
      inputSchema: {
        de: z.string().optional().describe("Início do período (YYYY-MM-DD). Padrão: hoje."),
        ate: z.string().optional().describe("Fim do período (YYYY-MM-DD). Padrão: hoje + 7 dias."),
        tipo: z.enum(EVENT_TYPES).optional(),
        cliente: z.string().optional().describe("Nome ou ID do cliente"),
      },
    },
    async ({ de, ate, tipo, cliente }) => {
      const from = parseWall(de) ?? startOfWallDay(nowWall());
      const toParsed = parseWall(ate);
      if (from === "invalid" || toParsed === "invalid") return errorResult("Data inválida. Use YYYY-MM-DD.");
      const to = toParsed
        ? new Date(toParsed.getTime() + 24 * 60 * 60 * 1000 - 1)
        : new Date(from.getTime() + 8 * 24 * 60 * 60 * 1000 - 1);

      let clientId: string | undefined;
      if (cliente) {
        const r = await resolveClientId(cliente);
        if (!r.ok) return errorResult(r.error);
        clientId = r.clientId ?? undefined;
      }

      const events = await prisma.calendarEvent.findMany({
        where: { startAt: { gte: from, lte: to }, type: tipo ?? undefined, clientId },
        include: { client: true, responsible: true },
        orderBy: { startAt: "asc" },
        take: 200,
      });

      return textResult({
        periodo: `${fmtDay(from)} a ${fmtDay(to)}`,
        total: events.length,
        eventos: events.map((e) => ({
          id: e.id,
          titulo: e.title,
          tipo: e.type,
          tipoNome: calendarEventTypeLabels[e.type] ?? e.type,
          dia: weekday(e.startAt),
          inicio: fmtWall(e.startAt),
          fim: fmtWall(e.endAt),
          cliente: e.client ? displayClientName(e.client) : null,
          responsavel: e.responsible?.name ?? null,
          observacoes: e.notes,
        })),
      });
    },
  );

  server.registerTool(
    "criar_evento_agenda",
    {
      title: "Criar compromisso na agenda",
      description:
        "Marca um compromisso na agenda do CRM. Tipos: ATENDIMENTO, REUNIAO, PRAZO, ENTREGA, PROSPECCAO, TAREFA, PUBLICACAO, GRAVACAO, RETORNO_CLIENTE. Avisa se já houver outro compromisso no mesmo horário.",
      inputSchema: {
        titulo: z.string().min(1),
        tipo: z.enum(EVENT_TYPES),
        inicio: z.string().describe(DATA_HORA),
        fim: z.string().optional().describe(DATA_HORA),
        cliente: z.string().optional().describe("Nome ou ID do cliente (opcional)"),
        responsavel: z.string().optional().describe("Nome do usuário do CRM responsável (opcional)"),
        observacoes: z.string().optional(),
      },
    },
    async ({ titulo, tipo, inicio, fim, cliente, responsavel, observacoes }) => {
      const startAt = parseWall(inicio);
      const endAt = parseWall(fim);
      if (!startAt || startAt === "invalid" || endAt === "invalid") return errorResult(`Data inválida. ${DATA_HORA}.`);
      if (endAt && endAt < startAt) return errorResult("O fim não pode ser antes do início.");

      const clientRes = await resolveClientId(cliente);
      if (!clientRes.ok) return errorResult(clientRes.error);
      const userRes = await resolveUserId(responsavel);
      if (!userRes.ok) return errorResult(userRes.error);

      const windowEnd = endAt ?? new Date(startAt.getTime() + 60 * 60 * 1000);
      const conflitos = await prisma.calendarEvent.findMany({
        where: {
          startAt: { lt: windowEnd },
          OR: [{ endAt: { gt: startAt } }, { endAt: null, startAt: { gte: new Date(startAt.getTime() - 60 * 60 * 1000) } }],
        },
        take: 5,
      });

      const event = await prisma.calendarEvent.create({
        data: {
          title: titulo,
          type: tipo,
          startAt,
          endAt,
          clientId: clientRes.clientId,
          responsibleId: userRes.userId ?? ctx.userId,
          notes: observacoes || null,
          createdById: ctx.userId,
        },
      });

      await logMcpAction({
        tool: "criar_evento_agenda",
        summary: `Agenda: "${titulo}" em ${fmtWall(startAt)}`,
        userId: ctx.userId,
      });
      if (clientRes.clientId) {
        await logClientTimelineViaClaude({
          clientId: clientRes.clientId,
          type: "EVENTO_AGENDA",
          description: `Compromisso "${titulo}" marcado para ${fmtWall(startAt)}`,
          userId: ctx.userId,
        });
      }

      return textResult({
        ok: true,
        id: event.id,
        inicio: fmtWall(startAt),
        fim: fmtWall(endAt),
        conflitos: conflitos
          .filter((c) => c.id !== event.id)
          .map((c) => ({ id: c.id, titulo: c.title, inicio: fmtWall(c.startAt), fim: fmtWall(c.endAt) })),
      });
    },
  );

  server.registerTool(
    "atualizar_evento_agenda",
    {
      title: "Atualizar compromisso da agenda",
      description: "Remarca ou altera um compromisso da agenda (título, tipo, horário, cliente, observações).",
      inputSchema: {
        id: z.string(),
        titulo: z.string().optional(),
        tipo: z.enum(EVENT_TYPES).optional(),
        inicio: z.string().optional().describe(DATA_HORA),
        fim: z.string().optional().describe(DATA_HORA + " (vazio remove)"),
        cliente: z.string().optional(),
        observacoes: z.string().optional(),
      },
    },
    async ({ id, titulo, tipo, inicio, fim, cliente, observacoes }) => {
      const event = await prisma.calendarEvent.findUnique({ where: { id } });
      if (!event) return errorResult(`Compromisso "${id}" não encontrado.`);
      const startAt = inicio !== undefined ? parseWall(inicio) : undefined;
      const endAt = fim !== undefined ? parseWall(fim) : undefined;
      if (startAt === "invalid" || endAt === "invalid" || startAt === null) return errorResult(`Data inválida. ${DATA_HORA}.`);
      let clientId: string | null | undefined;
      if (cliente !== undefined) {
        const r = await resolveClientId(cliente || undefined);
        if (!r.ok) return errorResult(r.error);
        clientId = r.clientId;
      }
      const updated = await prisma.calendarEvent.update({
        where: { id },
        data: {
          title: titulo ?? undefined,
          type: tipo ?? undefined,
          startAt: startAt ?? undefined,
          endAt: endAt === undefined ? undefined : endAt,
          clientId,
          notes: observacoes ?? undefined,
        },
      });
      await logMcpAction({
        tool: "atualizar_evento_agenda",
        summary: `Agenda: "${updated.title}" atualizado para ${fmtWall(updated.startAt)}`,
        userId: ctx.userId,
        entity: "CalendarEvent",
        entityId: id,
        oldValue: { title: event.title, type: event.type, startAt: event.startAt, endAt: event.endAt, clientId: event.clientId, notes: event.notes },
        newValue: { title: updated.title, type: updated.type, startAt: updated.startAt, endAt: updated.endAt, clientId: updated.clientId, notes: updated.notes },
      });
      return textResult({ ok: true, id, titulo: updated.title, inicio: fmtWall(updated.startAt), fim: fmtWall(updated.endAt) });
    },
  );

  server.registerTool(
    "excluir_evento_agenda",
    {
      title: "Excluir compromisso da agenda",
      description: "Remove um compromisso da agenda do CRM.",
      inputSchema: { id: z.string() },
    },
    async ({ id }) => {
      const event = await prisma.calendarEvent.findUnique({ where: { id } });
      if (!event) return errorResult(`Compromisso "${id}" não encontrado.`);
      await prisma.calendarEvent.delete({ where: { id } });
      await logMcpAction({
        tool: "excluir_evento_agenda",
        summary: `Agenda: "${event.title}" (${fmtWall(event.startAt)}) excluído`,
        userId: ctx.userId,
        entity: "CalendarEvent",
        entityId: id,
        oldValue: event,
        newValue: null,
      });
      return textResult({ ok: true, excluido: event.title });
    },
  );

  // =========================================================================
  // MÍDIA / CALENDÁRIO DE CONTEÚDO (Instagram e outras redes)
  // =========================================================================
  server.registerTool(
    "listar_conteudos",
    {
      title: "Listar conteúdos de mídia",
      description:
        "Lista os conteúdos do calendário de mídia (posts, carrosséis, Reels, Stories) da Monteiro e dos clientes de assessoria de mídia, com status e data programada.",
      inputSchema: {
        status: z.enum(MEDIA_STATUS).optional(),
        de: z.string().optional().describe("Data programada a partir de (YYYY-MM-DD)"),
        ate: z.string().optional().describe("Data programada até (YYYY-MM-DD)"),
        cliente: z.string().optional().describe('Nome do cliente, ou "Monteiro" para a própria empresa'),
      },
    },
    async ({ status, de, ate, cliente }) => {
      const from = parseWall(de);
      const toP = parseWall(ate);
      if (from === "invalid" || toP === "invalid") return errorResult("Data inválida. Use YYYY-MM-DD.");
      const to = toP ? new Date(toP.getTime() + 24 * 60 * 60 * 1000 - 1) : null;
      let clientId: string | undefined;
      if (cliente) {
        const r = await resolveClientOrCompany(cliente, ctx.userId);
        if (!r.ok) return errorResult(r.error);
        clientId = r.clientId;
      }
      const items = await prisma.mediaContent.findMany({
        where: {
          status: status ?? undefined,
          clientId,
          ...(from || to ? { scheduledDate: { gte: from ?? undefined, lte: to ?? undefined } } : {}),
        },
        include: { client: true, responsible: true },
        orderBy: [{ scheduledDate: "asc" }, { number: "asc" }],
        take: 200,
      });
      return textResult(
        items.map((c) => ({
          id: c.id,
          numero: c.number,
          titulo: c.title,
          tipo: c.type,
          plataforma: c.platform,
          programadoPara: fmtWall(c.scheduledDate),
          status: c.status,
          cliente: displayClientName(c.client),
          responsavel: c.responsible?.name ?? null,
          legendaOuRoteiro: c.description,
          observacoes: c.notes,
          link: c.link,
        })),
      );
    },
  );

  server.registerTool(
    "criar_conteudo",
    {
      title: "Programar conteúdo de mídia",
      description:
        "Cria um conteúdo no calendário de mídia do CRM (post, carrossel, Reels, Stories) com legenda/roteiro e data programada. Sem cliente, fica no Instagram da própria Monteiro. Por padrão também marca a publicação na agenda.",
      inputSchema: {
        titulo: z.string().min(1).describe("Tema ou título curto da peça"),
        tipo: z.string().optional().describe("Post, Carrossel, Reels, Stories, Status..."),
        plataforma: z.string().optional().describe("Padrão: Instagram"),
        data_programada: z.string().optional().describe(DATA_HORA),
        legenda: z.string().optional().describe("Legenda, roteiro ou texto da peça"),
        cliente: z.string().optional().describe('Cliente de assessoria de mídia. Vazio ou "Monteiro" = a própria empresa'),
        status: z.enum(["IDEIA", "EM_PRODUCAO", "AGUARDANDO_APROVACAO", "APROVADO"]).optional().describe("Padrão: IDEIA"),
        observacoes: z.string().optional().describe("Onde está o arquivo da arte, horário sugerido, música etc."),
        marcar_na_agenda: z.boolean().optional().describe("Padrão: true (cria um evento PUBLICACAO na agenda)"),
      },
    },
    async ({ titulo, tipo, plataforma, data_programada, legenda, cliente, status, observacoes, marcar_na_agenda }) => {
      const when = parseWall(data_programada);
      if (when === "invalid") return errorResult(`Data inválida. ${DATA_HORA}.`);
      const clientRes = await resolveClientOrCompany(cliente, ctx.userId);
      if (!clientRes.ok) return errorResult(clientRes.error);

      const count = await prisma.mediaContent.count();
      const content = await prisma.mediaContent.create({
        data: {
          number: count + 1,
          clientId: clientRes.clientId,
          title: titulo,
          description: legenda || null,
          type: tipo || null,
          platform: plataforma || "Instagram",
          scheduledDate: when,
          status: status ?? "IDEIA",
          responsibleId: ctx.userId,
          notes: observacoes || null,
          createdById: ctx.userId,
        },
      });

      let eventoId: string | null = null;
      if (when && marcar_na_agenda !== false) {
        const ev = await prisma.calendarEvent.create({
          data: {
            title: `Publicar: ${titulo}${tipo ? ` (${tipo})` : ""}`,
            type: "PUBLICACAO",
            startAt: when,
            clientId: clientRes.clientId,
            responsibleId: ctx.userId,
            notes: `Conteúdo #${content.number} do calendário de mídia.`,
            createdById: ctx.userId,
          },
        });
        eventoId = ev.id;
      }

      await logMcpAction({
        tool: "criar_conteudo",
        summary: `Mídia: conteúdo #${content.number} "${titulo}" programado para ${fmtWall(when) ?? "sem data"}`,
        userId: ctx.userId,
      });
      await logClientTimelineViaClaude({
        clientId: clientRes.clientId,
        type: "CONTEUDO_CRIADO",
        description: `Conteúdo de mídia "${titulo}" criado`,
        userId: ctx.userId,
      });

      return textResult({ ok: true, id: content.id, numero: content.number, programadoPara: fmtWall(when), eventoAgendaId: eventoId });
    },
  );

  server.registerTool(
    "atualizar_conteudo",
    {
      title: "Atualizar conteúdo de mídia",
      description:
        "Altera um conteúdo do calendário de mídia ou muda o status: EM_PRODUCAO, AGUARDANDO_APROVACAO, APROVADO, REPROVADO, PUBLICADO (com link) ou CANCELADO.",
      inputSchema: {
        id: z.string(),
        titulo: z.string().optional(),
        tipo: z.string().optional(),
        plataforma: z.string().optional(),
        data_programada: z.string().optional().describe(DATA_HORA),
        legenda: z.string().optional(),
        observacoes: z.string().optional(),
        status: z.enum(MEDIA_STATUS).optional(),
        observacao_aprovacao: z.string().optional(),
        link: z.string().optional().describe("Link do post publicado"),
      },
    },
    async ({ id, titulo, tipo, plataforma, data_programada, legenda, observacoes, status, observacao_aprovacao, link }) => {
      const content = await prisma.mediaContent.findUnique({ where: { id } });
      if (!content) return errorResult(`Conteúdo "${id}" não encontrado.`);
      const when = data_programada !== undefined ? parseWall(data_programada) : undefined;
      if (when === "invalid") return errorResult(`Data inválida. ${DATA_HORA}.`);

      const statusData: Record<string, unknown> = {};
      if (status) {
        statusData.status = status;
        if (status === "APROVADO" || status === "REPROVADO") {
          statusData.approvedById = ctx.userId;
          statusData.approvedAt = new Date();
          if (observacao_aprovacao) statusData.approvalNotes = observacao_aprovacao;
        }
        if (status === "PUBLICADO") {
          statusData.publishedAt = new Date();
          if (link) statusData.link = link;
        }
      } else if (link) {
        statusData.link = link;
      }

      const updated = await prisma.mediaContent.update({
        where: { id },
        data: {
          title: titulo ?? undefined,
          type: tipo ?? undefined,
          platform: plataforma ?? undefined,
          scheduledDate: when === undefined ? undefined : when,
          description: legenda ?? undefined,
          notes: observacoes ?? undefined,
          ...statusData,
        },
      });

      if (when) {
        await prisma.calendarEvent.updateMany({
          where: { type: "PUBLICACAO", notes: `Conteúdo #${content.number} do calendário de mídia.` },
          data: { startAt: when, title: `Publicar: ${updated.title}${updated.type ? ` (${updated.type})` : ""}` },
        });
      }
      if (status === "CANCELADO") {
        await prisma.calendarEvent.deleteMany({
          where: { type: "PUBLICACAO", notes: `Conteúdo #${content.number} do calendário de mídia.` },
        });
      }

      const resumo = status ? `status ${status}` : "dados alterados";
      await logMcpAction({
        tool: "atualizar_conteudo",
        summary: `Mídia: conteúdo #${content.number} — ${resumo}`,
        userId: ctx.userId,
        entity: "MediaContent",
        entityId: id,
        oldValue: { title: content.title, type: content.type, platform: content.platform, scheduledDate: content.scheduledDate, status: content.status, link: content.link },
        newValue: { title: updated.title, type: updated.type, platform: updated.platform, scheduledDate: updated.scheduledDate, status: updated.status, link: updated.link },
      });
      if (status) {
        await logClientTimelineViaClaude({
          clientId: content.clientId,
          type: "CONTEUDO_STATUS",
          description: `Conteúdo "${updated.title}" agora está ${status}${link ? ` (link: ${link})` : ""}`,
          userId: ctx.userId,
        });
      }
      return textResult({ ok: true, id, status: updated.status, programadoPara: fmtWall(updated.scheduledDate) });
    },
  );

  // =========================================================================
  // INSTAGRAM — métricas
  // =========================================================================
  server.registerTool(
    "listar_metricas_instagram",
    {
      title: "Listar métricas do Instagram",
      description: "Mostra os registros de métricas do Instagram da Monteiro (seguidores, alcance, curtidas...) e a variação entre o último e o anterior.",
      inputSchema: { limite: z.number().int().min(1).max(100).optional().describe("Padrão: 12") },
    },
    async ({ limite }) => {
      const rows = await prisma.instagramMetric.findMany({ orderBy: { date: "desc" }, take: limite ?? 12 });
      const [last, prev] = rows;
      return textResult({
        variacaoUltimoRegistro:
          last && prev
            ? {
                seguidores: last.followers - prev.followers,
                alcance: last.reach - prev.reach,
                visitasPerfil: last.profileVisits - prev.profileVisits,
              }
            : null,
        registros: rows.map((r) => ({
          id: r.id,
          data: fmtDay(r.date),
          seguidores: r.followers,
          posts: r.posts,
          curtidas: r.likes,
          comentarios: r.comments,
          compartilhamentos: r.shares,
          alcance: r.reach,
          visitasPerfil: r.profileVisits,
          observacoes: r.notes,
        })),
      });
    },
  );

  server.registerTool(
    "registrar_metrica_instagram",
    {
      title: "Registrar métricas do Instagram",
      description: "Registra os números do Instagram da Monteiro num dia (normalmente o fechamento da semana).",
      inputSchema: {
        data: z.string().describe("YYYY-MM-DD"),
        seguidores: z.number().int().min(0),
        posts: z.number().int().min(0).optional(),
        curtidas: z.number().int().min(0).optional(),
        comentarios: z.number().int().min(0).optional(),
        compartilhamentos: z.number().int().min(0).optional(),
        alcance: z.number().int().min(0).optional(),
        visitas_perfil: z.number().int().min(0).optional(),
        observacoes: z.string().optional().describe("O que foi feito no período"),
      },
    },
    async (a) => {
      const date = parseWall(a.data);
      if (!date || date === "invalid") return errorResult("Data inválida. Use YYYY-MM-DD.");
      const m = await prisma.instagramMetric.create({
        data: {
          date,
          followers: a.seguidores,
          posts: a.posts ?? 0,
          likes: a.curtidas ?? 0,
          comments: a.comentarios ?? 0,
          shares: a.compartilhamentos ?? 0,
          reach: a.alcance ?? 0,
          profileVisits: a.visitas_perfil ?? 0,
          notes: a.observacoes || null,
          createdById: ctx.userId,
        },
      });
      await logMcpAction({ tool: "registrar_metrica_instagram", summary: `Instagram: ${a.seguidores} seguidores em ${fmtDay(date)}`, userId: ctx.userId });
      return textResult({ ok: true, id: m.id });
    },
  );

  // =========================================================================
  // PROSPECÇÃO
  // =========================================================================
  server.registerTool(
    "listar_prospeccao",
    {
      title: "Listar prospecção",
      description: "Lista os negócios prospectados (antes de virar lead), com próximo contato. Use vencidos=true para ver quem precisa ser chamado.",
      inputSchema: { vencidos: z.boolean().optional(), busca: z.string().optional() },
    },
    async ({ vencidos, busca }) => {
      const endToday = new Date(startOfWallDay(nowWall()).getTime() + 24 * 60 * 60 * 1000 - 1);
      const rows = await prisma.prospectingEntry.findMany({
        where: {
          ...(vencidos ? { nextContactDate: { lte: endToday }, convertedLeadId: null } : {}),
          ...(busca ? { name: { contains: busca, mode: "insensitive" } } : {}),
        },
        include: { potentialService: true },
        orderBy: [{ nextContactDate: "asc" }, { createdAt: "desc" }],
        take: 100,
      });
      return textResult(
        rows.map((p) => ({
          id: p.id,
          nome: p.name,
          segmento: p.segment,
          cidade: p.city,
          contato: p.contactName,
          whatsapp: p.whatsapp,
          instagram: p.instagram,
          servicoPotencial: p.potentialService?.name ?? null,
          ultimoContato: fmtDay(p.contactDate),
          resultado: p.result,
          proximoContato: fmtDay(p.nextContactDate),
          virouLead: Boolean(p.convertedLeadId),
          observacoes: p.notes,
        })),
      );
    },
  );

  server.registerTool(
    "criar_prospeccao",
    {
      title: "Registrar prospecção",
      description: "Registra um negócio prospectado (ex.: barbearia abordada no Instagram), com resultado do contato e próximo contato.",
      inputSchema: {
        nome: z.string().min(1).describe("Nome do negócio"),
        segmento: z.string().optional(),
        cidade: z.string().optional(),
        contato: z.string().optional().describe("Nome da pessoa"),
        whatsapp: z.string().optional(),
        instagram: z.string().optional(),
        servico_potencial: z.string().optional().describe("Serviço do catálogo"),
        data_contato: z.string().optional().describe("YYYY-MM-DD"),
        resultado: z.string().optional(),
        proximo_contato: z.string().optional().describe("YYYY-MM-DD"),
        observacoes: z.string().optional(),
      },
    },
    async (a) => {
      const contactDate = parseWall(a.data_contato);
      const next = parseWall(a.proximo_contato);
      if (contactDate === "invalid" || next === "invalid") return errorResult("Data inválida. Use YYYY-MM-DD.");
      const svc = await resolveServiceId(a.servico_potencial);
      if (!svc.ok) return errorResult(svc.error);
      const p = await prisma.prospectingEntry.create({
        data: {
          name: a.nome,
          segment: a.segmento || null,
          city: a.cidade || null,
          contactName: a.contato || null,
          whatsapp: a.whatsapp || null,
          instagram: a.instagram || null,
          potentialServiceId: svc.serviceId,
          responsibleId: ctx.userId,
          contactDate,
          result: a.resultado || null,
          nextContactDate: next,
          notes: a.observacoes || null,
        },
      });
      await logMcpAction({ tool: "criar_prospeccao", summary: `Prospecção: ${a.nome}`, userId: ctx.userId });
      return textResult({ ok: true, id: p.id });
    },
  );

  server.registerTool(
    "atualizar_prospeccao",
    {
      title: "Atualizar prospecção",
      description: "Atualiza resultado, próximo contato ou observações de um negócio prospectado; pode ligar ao lead criado.",
      inputSchema: {
        id: z.string(),
        data_contato: z.string().optional(),
        resultado: z.string().optional(),
        proximo_contato: z.string().optional(),
        observacoes: z.string().optional(),
        lead_id: z.string().optional().describe("ID do lead, quando a prospecção virou lead"),
      },
    },
    async (a) => {
      const p = await prisma.prospectingEntry.findUnique({ where: { id: a.id } });
      if (!p) return errorResult(`Prospecção "${a.id}" não encontrada.`);
      const contactDate = a.data_contato !== undefined ? parseWall(a.data_contato) : undefined;
      const next = a.proximo_contato !== undefined ? parseWall(a.proximo_contato) : undefined;
      if (contactDate === "invalid" || next === "invalid") return errorResult("Data inválida. Use YYYY-MM-DD.");
      await prisma.prospectingEntry.update({
        where: { id: a.id },
        data: {
          contactDate,
          nextContactDate: next,
          result: a.resultado ?? undefined,
          notes: a.observacoes ?? undefined,
          convertedLeadId: a.lead_id ?? undefined,
        },
      });
      await logMcpAction({
        tool: "atualizar_prospeccao",
        summary: `Prospecção: ${p.name} atualizada`,
        userId: ctx.userId,
        entity: "ProspectingEntry",
        entityId: a.id,
        oldValue: { contactDate: p.contactDate, nextContactDate: p.nextContactDate, result: p.result, notes: p.notes, convertedLeadId: p.convertedLeadId },
        newValue: { contactDate, nextContactDate: next, result: a.resultado, notes: a.observacoes, convertedLeadId: a.lead_id },
      });
      return textResult({ ok: true, id: a.id });
    },
  );

  // =========================================================================
  // PROPOSTAS
  // =========================================================================
  server.registerTool(
    "listar_propostas",
    {
      title: "Listar propostas",
      description: "Lista as propostas comerciais do CRM (demanda, solução, investimento, validade e status).",
      inputSchema: { status: z.enum(["RASCUNHO", "ENVIADA", "APROVADA", "RECUSADA", "EXPIRADA"]).optional() },
    },
    async ({ status }) => {
      const rows = await prisma.proposal.findMany({
        where: { status: status ?? undefined },
        include: { client: true, service: true },
        orderBy: { createdAt: "desc" },
        take: 100,
      });
      return textResult(
        rows.map((p) => ({
          id: p.id,
          numero: p.number,
          cliente: displayClientName(p.client),
          servico: p.service?.name ?? null,
          status: p.status,
          investimento: p.investment ? formatCurrencyBRL(Number(p.investment)) : null,
          validade: fmtDay(p.validUntil),
          demanda: p.demand,
        })),
      );
    },
  );

  server.registerTool(
    "criar_proposta",
    {
      title: "Criar proposta",
      description: "Cria uma proposta comercial (rascunho) para um cliente: demanda, solução, escopo, prazo, investimento, forma de pagamento e validade. O PDF sai pelo CRM.",
      inputSchema: {
        cliente: z.string().min(1).describe("Nome ou ID do cliente (lead precisa estar convertido)"),
        demanda: z.string().min(1).describe("Problema ou necessidade do cliente"),
        solucao: z.string().min(1).describe("Solução proposta"),
        escopo: z.string().optional(),
        prazo: z.string().optional().describe('Texto livre, ex.: "7 dias"'),
        investimento: z.number().positive().optional(),
        forma_pagamento: z.string().optional(),
        validade: z.string().optional().describe("YYYY-MM-DD"),
        servico: z.string().optional().describe("Serviço do catálogo"),
        observacoes: z.string().optional(),
      },
    },
    async (a) => {
      const c = await resolveClientId(a.cliente);
      if (!c.ok || !c.clientId) return errorResult(c.ok ? `Cliente "${a.cliente}" não encontrado.` : c.error);
      const svc = await resolveServiceId(a.servico);
      if (!svc.ok) return errorResult(svc.error);
      const validUntil = parseWall(a.validade);
      if (validUntil === "invalid") return errorResult("Validade inválida. Use YYYY-MM-DD.");
      const count = await prisma.proposal.count();
      const lead = await prisma.lead.findFirst({ where: { clientId: c.clientId }, orderBy: { createdAt: "desc" } });
      const p = await prisma.proposal.create({
        data: {
          number: count + 1,
          clientId: c.clientId,
          leadId: lead?.id ?? null,
          serviceId: svc.serviceId,
          demand: a.demanda,
          solution: a.solucao,
          scope: a.escopo || null,
          termText: a.prazo || null,
          investment: a.investimento ? a.investimento.toFixed(2) : null,
          paymentTerms: a.forma_pagamento || null,
          validUntil,
          notes: a.observacoes || null,
          createdById: ctx.userId,
        },
      });
      await logMcpAction({ tool: "criar_proposta", summary: `Proposta #${p.number} criada`, userId: ctx.userId });
      await logClientTimelineViaClaude({ clientId: c.clientId, type: "PROPOSTA_CRIADA", description: `Proposta #${p.number} criada`, userId: ctx.userId });
      return textResult({ ok: true, id: p.id, numero: p.number, pdf: `/propostas/${p.id}/pdf` });
    },
  );

  // =========================================================================
  // SERVIÇOS EM ANDAMENTO + CHECKLIST
  // =========================================================================
  server.registerTool(
    "listar_servicos_abertos",
    {
      title: "Listar serviços em andamento",
      description: "Lista os serviços contratados (abertos, em andamento, em revisão...), com prazo, valor e checklist.",
      inputSchema: {
        status: z.enum(["ABERTO", "EM_ANDAMENTO", "EM_REVISAO", "CONCLUIDO", "CANCELADO"]).optional().describe("Padrão: todos os não concluídos"),
        cliente: z.string().optional(),
      },
    },
    async ({ status, cliente }) => {
      let clientId: string | undefined;
      if (cliente) {
        const r = await resolveClientId(cliente);
        if (!r.ok) return errorResult(r.error);
        clientId = r.clientId ?? undefined;
      }
      const rows = await prisma.serviceInstance.findMany({
        where: { status: status ?? { notIn: ["CONCLUIDO", "CANCELADO"] }, clientId },
        include: { client: true, checklistItems: { orderBy: { order: "asc" } } },
        orderBy: [{ dueDate: "asc" }, { createdAt: "desc" }],
        take: 100,
      });
      return textResult(
        rows.map((s) => ({
          id: s.id,
          numero: s.number,
          titulo: s.title,
          cliente: displayClientName(s.client),
          status: s.status,
          valor: s.price ? formatCurrencyBRL(Number(s.price)) : null,
          prazo: fmtDay(s.dueDate),
          entregueEm: fmtDay(s.deliveredAt),
          checklist: s.checklistItems.map((i) => ({ id: i.id, item: i.description, feito: i.done })),
        })),
      );
    },
  );

  server.registerTool(
    "atualizar_servico",
    {
      title: "Atualizar serviço em andamento",
      description: "Muda status (EM_ANDAMENTO, EM_REVISAO, CONCLUIDO, CANCELADO), prazo ou observações de um serviço contratado. CONCLUIDO registra a data de entrega.",
      inputSchema: {
        id: z.string(),
        status: z.enum(["ABERTO", "EM_ANDAMENTO", "EM_REVISAO", "CONCLUIDO", "CANCELADO"]).optional(),
        prazo: z.string().optional().describe("YYYY-MM-DD"),
        observacoes: z.string().optional(),
      },
    },
    async ({ id, status, prazo, observacoes }) => {
      const s = await prisma.serviceInstance.findUnique({ where: { id } });
      if (!s) return errorResult(`Serviço "${id}" não encontrado.`);
      const due = prazo !== undefined ? parseWall(prazo) : undefined;
      if (due === "invalid") return errorResult("Prazo inválido. Use YYYY-MM-DD.");
      const updated = await prisma.serviceInstance.update({
        where: { id },
        data: {
          status: status ?? undefined,
          dueDate: due,
          notes: observacoes ?? undefined,
          deliveredAt: status === "CONCLUIDO" ? new Date() : undefined,
        },
      });
      await logMcpAction({
        tool: "atualizar_servico",
        summary: `Serviço #${s.number} (${s.title}) → ${updated.status}`,
        userId: ctx.userId,
        entity: "ServiceInstance",
        entityId: id,
        oldValue: { status: s.status, dueDate: s.dueDate, notes: s.notes },
        newValue: { status: updated.status, dueDate: updated.dueDate, notes: updated.notes },
      });
      if (status) {
        await logClientTimelineViaClaude({ clientId: s.clientId, type: "SERVICO_STATUS", description: `Serviço "${s.title}" agora está ${status}`, userId: ctx.userId });
      }
      return textResult({ ok: true, id, status: updated.status, prazo: fmtDay(updated.dueDate) });
    },
  );

  server.registerTool(
    "adicionar_checklist",
    {
      title: "Adicionar itens ao checklist do serviço",
      description: "Adiciona etapas ao checklist de um serviço em andamento (ex.: briefing, prévia, ajustes, publicação, entrega).",
      inputSchema: { servico_id: z.string(), itens: z.array(z.string().min(1)).min(1) },
    },
    async ({ servico_id, itens }) => {
      const s = await prisma.serviceInstance.findUnique({ where: { id: servico_id } });
      if (!s) return errorResult(`Serviço "${servico_id}" não encontrado.`);
      const last = await prisma.checklistItem.findFirst({ where: { serviceInstanceId: servico_id }, orderBy: { order: "desc" } });
      const base = (last?.order ?? -1) + 1;
      await prisma.checklistItem.createMany({
        data: itens.map((d, i) => ({ serviceInstanceId: servico_id, description: d, order: base + i })),
      });
      await logMcpAction({ tool: "adicionar_checklist", summary: `Checklist do serviço #${s.number}: +${itens.length} itens`, userId: ctx.userId });
      return textResult({ ok: true, adicionados: itens.length });
    },
  );

  server.registerTool(
    "marcar_checklist",
    {
      title: "Marcar item do checklist",
      description: "Marca (ou desmarca) um item do checklist de um serviço como feito.",
      inputSchema: { item_id: z.string(), feito: z.boolean().optional().describe("Padrão: true") },
    },
    async ({ item_id, feito }) => {
      const item = await prisma.checklistItem.findUnique({ where: { id: item_id } });
      if (!item) return errorResult(`Item "${item_id}" não encontrado.`);
      const done = feito ?? true;
      await prisma.checklistItem.update({ where: { id: item_id }, data: { done, doneAt: done ? new Date() : null } });
      await logMcpAction({
        tool: "marcar_checklist",
        summary: `Checklist: "${item.description}" ${done ? "feito" : "reaberto"}`,
        userId: ctx.userId,
        entity: "ChecklistItem",
        entityId: item_id,
        oldValue: { done: item.done },
        newValue: { done },
      });
      return textResult({ ok: true, item: item.description, feito: done });
    },
  );

  // =========================================================================
  // WHATSAPP (modelos e registro de mensagens)
  // =========================================================================
  server.registerTool(
    "listar_modelos_whatsapp",
    {
      title: "Listar modelos de mensagem do WhatsApp",
      description: "Lista os modelos de mensagem de WhatsApp cadastrados no CRM (com {{TOKENS}} do cliente).",
      inputSchema: {},
    },
    async () => {
      const rows = await prisma.whatsAppTemplate.findMany({ where: { active: true }, orderBy: { name: "asc" } });
      return textResult(rows.map((t) => ({ id: t.id, nome: t.name, categoria: t.category, texto: t.content })));
    },
  );

  server.registerTool(
    "registrar_mensagem_whatsapp",
    {
      title: "Registrar mensagem de WhatsApp",
      description: "Guarda no histórico do cliente uma mensagem de WhatsApp enviada ou recebida. Não envia nada: só registra.",
      inputSchema: {
        cliente: z.string().min(1),
        conteudo: z.string().min(1),
        direcao: z.enum(["ENVIADA", "RECEBIDA"]).optional().describe("Padrão: ENVIADA"),
        modelo: z.string().optional().describe("Nome ou ID do modelo usado"),
      },
    },
    async ({ cliente, conteudo, direcao, modelo }) => {
      const c = await resolveClientId(cliente);
      if (!c.ok || !c.clientId) return errorResult(c.ok ? `Cliente "${cliente}" não encontrado.` : c.error);
      let templateId: string | null = null;
      if (modelo) {
        const t =
          (await prisma.whatsAppTemplate.findUnique({ where: { id: modelo } })) ??
          (await prisma.whatsAppTemplate.findFirst({ where: { name: { contains: modelo, mode: "insensitive" } } }));
        templateId = t?.id ?? null;
      }
      const msg = await prisma.whatsAppMessage.create({
        data: { clientId: c.clientId, templateId, direction: direcao ?? "ENVIADA", content: conteudo, createdById: ctx.userId },
      });
      await logMcpAction({ tool: "registrar_mensagem_whatsapp", summary: `WhatsApp registrado para o cliente`, userId: ctx.userId });
      return textResult({ ok: true, id: msg.id });
    },
  );

  // =========================================================================
  // COMISSÕES / PAGAMENTOS DE EQUIPE
  // =========================================================================
  server.registerTool(
    "listar_comissoes",
    {
      title: "Listar comissões",
      description: "Lista comissões e pagamentos de equipe (ex.: Bia), com status PENDENTE ou PAGO.",
      inputSchema: { status: z.enum(["PENDENTE", "PAGO"]).optional(), pessoa: z.string().optional() },
    },
    async ({ status, pessoa }) => {
      const u = await resolveUserId(pessoa);
      if (!u.ok) return errorResult(u.error);
      const rows = await prisma.commission.findMany({
        where: { status: status ?? undefined, userId: u.userId ?? undefined },
        include: { user: true, client: true },
        orderBy: { date: "desc" },
        take: 100,
      });
      return textResult(
        rows.map((c) => ({
          id: c.id,
          pessoa: c.user.name,
          categoria: c.category,
          valor: formatCurrencyBRL(Number(c.amount)),
          percentual: c.percentage ? Number(c.percentage) : null,
          cliente: c.client ? displayClientName(c.client) : null,
          status: c.status,
          data: fmtDay(c.date),
          observacoes: c.notes,
        })),
      );
    },
  );

  server.registerTool(
    "criar_comissao",
    {
      title: "Lançar comissão",
      description: "Lança uma comissão ou pagamento para alguém da equipe cadastrado no CRM. Informe valor ou percentual + valor base.",
      inputSchema: {
        pessoa: z.string().min(1).describe("Nome do usuário do CRM"),
        valor: z.number().positive().optional(),
        percentual: z.number().positive().optional(),
        valor_base: z.number().positive().optional(),
        categoria: z.enum(["SALARIO_FIXO", "COMISSAO", "OUTRO_PAGAMENTO"]).optional(),
        cliente: z.string().optional(),
        servico_id: z.string().optional(),
        observacoes: z.string().optional(),
      },
    },
    async (a) => {
      const u = await resolveUserId(a.pessoa);
      if (!u.ok || !u.userId) return errorResult(u.ok ? `Usuário "${a.pessoa}" não encontrado.` : u.error);
      const amount = a.valor ?? (a.percentual && a.valor_base ? (a.percentual / 100) * a.valor_base : undefined);
      if (!amount) return errorResult("Informe o valor, ou o percentual junto com o valor base.");
      const c = await resolveClientId(a.cliente);
      if (!c.ok) return errorResult(c.error);
      const row = await prisma.commission.create({
        data: {
          userId: u.userId,
          category: a.categoria ?? "COMISSAO",
          amount: amount.toFixed(2),
          percentage: a.percentual ? a.percentual.toFixed(2) : null,
          baseAmount: a.valor_base ? a.valor_base.toFixed(2) : null,
          clientId: c.clientId,
          serviceInstanceId: a.servico_id || null,
          notes: a.observacoes || null,
          createdById: ctx.userId,
        },
      });
      await logMcpAction({ tool: "criar_comissao", summary: `Comissão de ${formatCurrencyBRL(amount)} lançada`, userId: ctx.userId });
      return textResult({ ok: true, id: row.id, valor: formatCurrencyBRL(amount) });
    },
  );

  // =========================================================================
  // HISTÓRICO DO CLIENTE
  // =========================================================================
  server.registerTool(
    "historico_cliente",
    {
      title: "Histórico do cliente",
      description: "Mostra a linha do tempo de um cliente (orçamentos, pagamentos, serviços, conteúdos, mensagens) e os próximos compromissos dele.",
      inputSchema: { cliente: z.string().min(1) },
    },
    async ({ cliente }) => {
      const c = await resolveClientId(cliente);
      if (!c.ok || !c.clientId) return errorResult(c.ok ? `Cliente "${cliente}" não encontrado.` : c.error);
      const [client, timeline, events] = await Promise.all([
        prisma.client.findUnique({ where: { id: c.clientId } }),
        prisma.timelineEvent.findMany({ where: { clientId: c.clientId }, orderBy: { createdAt: "desc" }, take: 50 }),
        prisma.calendarEvent.findMany({ where: { clientId: c.clientId, startAt: { gte: startOfWallDay(nowWall()) } }, orderBy: { startAt: "asc" }, take: 10 }),
      ]);
      return textResult({
        cliente: client ? displayClientName(client) : cliente,
        whatsapp: client?.whatsapp ?? null,
        proximosCompromissos: events.map((e) => ({ id: e.id, titulo: e.title, inicio: fmtWall(e.startAt) })),
        historico: timeline.map((t) => ({ quando: fmtDay(t.createdAt), tipo: t.type, descricao: t.description })),
      });
    },
  );
}

/** Resumo extra usado pelo resumo_do_dia: agenda de hoje e conteúdos dos próximos 7 dias. */
export async function agendaEConteudosResumo() {
  const today = startOfWallDay(nowWall());
  const endToday = new Date(today.getTime() + 24 * 60 * 60 * 1000 - 1);
  const in7 = new Date(endToday.getTime() + 7 * 24 * 60 * 60 * 1000);
  const [eventosHoje, conteudos, aguardando] = await Promise.all([
    prisma.calendarEvent.findMany({
      where: { startAt: { gte: today, lte: endToday } },
      include: { client: true },
      orderBy: { startAt: "asc" },
    }),
    prisma.mediaContent.findMany({
      where: { scheduledDate: { gte: today, lte: in7 }, status: { notIn: ["PUBLICADO", "CANCELADO"] } },
      include: { client: true },
      orderBy: { scheduledDate: "asc" },
      take: 30,
    }),
    prisma.mediaContent.count({ where: { status: "AGUARDANDO_APROVACAO" } }),
  ]);
  return {
    agendaDeHoje: eventosHoje.map((e) => ({
      id: e.id,
      inicio: fmtWall(e.startAt),
      titulo: e.title,
      tipo: calendarEventTypeLabels[e.type] ?? e.type,
      cliente: e.client ? displayClientName(e.client) : null,
    })),
    conteudosProximos7Dias: conteudos.map((c) => ({
      id: c.id,
      quando: fmtWall(c.scheduledDate),
      titulo: c.title,
      tipo: c.type,
      status: c.status,
      cliente: displayClientName(c.client),
    })),
    conteudosAguardandoAprovacao: aguardando,
  };
}
