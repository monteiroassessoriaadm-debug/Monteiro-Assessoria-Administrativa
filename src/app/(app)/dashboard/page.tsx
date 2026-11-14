import Link from "next/link";
import {
  Target,
  Flame,
  Headphones,
  Users,
  UserPlus,
  Briefcase,
  ShieldCheck,
  FileText,
  FileSignature,
  FileStack,
  AlertTriangle,
  ClipboardList,
  CalendarClock,
  CalendarDays,
  CheckSquare,
  ArrowDownCircle,
  ArrowUpCircle,
  Wallet,
  Megaphone,
  Send,
  Sparkles,
  RotateCcw,
  Camera,
  Check,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { StatCard, SectionTitle } from "@/components/dashboard/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { daysAgo, formatCurrencyBRL, formatDateBR, formatWallTime } from "@/lib/utils";
import { displayClientName } from "@/lib/client-display";
import { getSession } from "@/lib/session";
import { getMonthlyChartSeries } from "@/lib/dashboard-charts";
import { GoalsSection } from "@/components/dashboard/goals-section";
import { BalanceCard } from "@/components/dashboard/balance-card";
import { ChartTabs, type ChartTab } from "@/components/dashboard/chart-tabs";
import { CollapsibleSection } from "@/components/dashboard/collapsible-section";
import { DashboardMenu } from "@/components/dashboard/page-menu";
import { getGoalsProgress } from "@/lib/goals";
import { getAccountBalances, getBalanceSeries } from "@/lib/account-balance";
import { brTodayRange, brDayKey, addDaysKey, keyToUtc } from "@/lib/br-time";
import { refreshContractStatuses } from "@/lib/contracts";
import { contractNextDate } from "@/lib/contract-display";

const QUOTE_AWAITING_STATUSES = ["ENVIADO", "VISUALIZADO", "EM_NEGOCIACAO"] as const;
const ACTIVE_SERVICE_STATUSES = ["ABERTO", "EM_ANDAMENTO", "EM_REVISAO"] as const;
const REACTIVATION_DAYS = 90;
const STAT_GRID = "grid grid-cols-2 gap-2 md:grid-cols-4 md:gap-4";

export default async function DashboardPage() {
  const session = await getSession();
  const canSeeFinanceiro = session?.role === "ADMIN" || session?.role === "GESTOR";
  const thirtyDaysAgo = daysAgo(30);
  const threeDaysAgo = daysAgo(3);
  const reactivationCutoff = daysAgo(REACTIVATION_DAYS);
  const { start: startOfToday, end: endOfToday } = brTodayRange();
  const todayDay = keyToUtc(brDayKey(new Date()));
  const in30Days = keyToUtc(addDaysKey(brDayKey(new Date()), 30));
  await refreshContractStatuses();

  const [goalsProgress, accountBalances, balanceSeries] = canSeeFinanceiro
    ? await Promise.all([getGoalsProgress(), getAccountBalances(), getBalanceSeries()])
    : [null, [], null];
  const brand = goalsProgress
    ? await prisma.companySettings.findFirst({ select: { name: true, slogan: true, logoData: true } })
    : null;
  const activeAccounts = accountBalances.filter((a) => a.active);
  const totalBalance = activeAccounts.reduce((sum, a) => sum + a.current, 0);

  const [
    leadsNovos,
    leadsEmAtendimento,
    leadsQuentes,
    clientesAtivos,
    clientesNovos,
    totalClientes,
    servicosAtivos,
    usuariosPorPapel,
    orcamentosAguardando,
    orcamentosAprovadosQuotes,
    propostasEnviadas,
    orcamentosParaFollowUp,
    leadsParaFollowUp,
    contratosAguardandoAssinatura,
    contratosVencendo,
    servicosEmAndamento,
    servicosParaHoje,
    servicosAtrasados,
    servicosAtrasadosList,
    tarefasAtrasadas,
    tarefasBia,
    tarefasAdmin,
    servicosPorResponsavel,
    clientesCandidatosReativacao,
    monthlyChartSeries,
    agendaDeHoje,
    servicosDeHoje,
    conteudosDeHoje,
    usuariosAtivos,
  ] = await Promise.all([
    prisma.lead.count({ where: { stage: "NOVO_LEAD" } }),
    prisma.lead.count({
      where: { stage: { in: ["PRIMEIRO_CONTATO", "EM_ATENDIMENTO"] } },
    }),
    prisma.lead.count({ where: { temperature: "QUENTE" } }),
    prisma.client.count({ where: { status: "ATIVO" } }),
    prisma.client.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
    prisma.client.count(),
    prisma.service.count({ where: { active: true } }),
    prisma.user.groupBy({ by: ["role"], _count: true, where: { active: true } }),
    prisma.quote.count({ where: { status: { in: [...QUOTE_AWAITING_STATUSES] } } }),
    prisma.quote.findMany({
      where: { status: "APROVADO", respondedAt: { gte: thirtyDaysAgo } },
      include: { items: true },
    }),
    prisma.proposal.count({ where: { status: "ENVIADA" } }),
    prisma.quote.findMany({
      where: {
        status: { in: [...QUOTE_AWAITING_STATUSES] },
        sentAt: { lte: threeDaysAgo },
      },
      include: { client: true },
      orderBy: { sentAt: "asc" },
      take: 5,
    }),
    prisma.lead.findMany({
      where: {
        stage: { notIn: ["CONTRATADO", "PERDIDO"] },
        nextContactDate: { lte: endOfToday, not: null },
      },
      orderBy: { nextContactDate: "asc" },
      take: 5,
    }),
    prisma.contract.findMany({
      where: { status: "ENVIADO" },
      include: { client: true },
      orderBy: { sentAt: "asc" },
    }),
    prisma.contract.findMany({
      where: {
        status: { in: ["ASSINADO", "VIGENTE"] },
        OR: [{ endDate: { gte: todayDay, lte: in30Days } }, { renewalDate: { gte: todayDay, lte: in30Days } }],
      },
      include: { client: true },
    }),
    prisma.serviceInstance.count({ where: { status: { in: [...ACTIVE_SERVICE_STATUSES] } } }),
    prisma.serviceInstance.count({
      where: {
        status: { in: [...ACTIVE_SERVICE_STATUSES] },
        dueDate: { gte: startOfToday, lte: endOfToday },
      },
    }),
    prisma.serviceInstance.count({
      where: { status: { in: [...ACTIVE_SERVICE_STATUSES] }, dueDate: { lt: startOfToday } },
    }),
    prisma.serviceInstance.findMany({
      where: { status: { in: [...ACTIVE_SERVICE_STATUSES] }, dueDate: { lt: startOfToday } },
      include: { client: true },
      orderBy: { dueDate: "asc" },
      take: 5,
    }),
    prisma.task.count({ where: { status: "PENDENTE", dueDate: { lt: startOfToday } } }),
    prisma.task.count({
      where: { status: "PENDENTE", assignedTo: { role: "BIA" } },
    }),
    prisma.task.count({
      where: { status: "PENDENTE", assignedTo: { role: "ADMIN" } },
    }),
    prisma.serviceInstance.groupBy({
      by: ["responsibleId"],
      where: { status: { in: [...ACTIVE_SERVICE_STATUSES] } },
      _count: true,
    }),
    prisma.client.findMany({
      where: { status: "ATIVO", createdAt: { lte: reactivationCutoff } },
      include: { timelineEvents: { orderBy: { createdAt: "desc" }, take: 1 } },
      take: 300,
    }),
    getMonthlyChartSeries(canSeeFinanceiro),
    prisma.calendarEvent.findMany({
      where: { startAt: { gte: startOfToday, lte: endOfToday } },
      orderBy: { startAt: "asc" },
      take: 10,
    }),
    prisma.serviceInstance.findMany({
      where: { status: { in: [...ACTIVE_SERVICE_STATUSES] }, dueDate: { gte: startOfToday, lte: endOfToday } },
      include: { client: true },
      take: 10,
    }),
    prisma.mediaContent.findMany({
      where: {
        status: { in: ["IDEIA", "EM_PRODUCAO", "AGUARDANDO_APROVACAO", "APROVADO"] },
        scheduledDate: { gte: startOfToday, lte: endOfToday },
      },
      orderBy: { scheduledDate: "asc" },
      take: 10,
    }),
    prisma.user.findMany({ where: { active: true }, select: { id: true, role: true } }),
  ]);

  const responsibleIds = servicosPorResponsavel
    .map((r) => r.responsibleId)
    .filter((id): id is string => id !== null);
  const responsibleUsers = await prisma.user.findMany({
    where: { id: { in: responsibleIds } },
    select: { id: true, name: true },
  });

  const orcamentosAprovadosMes = orcamentosAprovadosQuotes.length;
  const orcamentosAprovadosValorMes = orcamentosAprovadosQuotes.reduce(
    (sum, q) => sum + q.items.reduce((s, i) => s + i.quantity * Number(i.unitPrice), 0),
    0,
  );

  const clientesParaReativacao = clientesCandidatosReativacao.filter((c) => {
    const lastActivity = c.timelineEvents[0]?.createdAt ?? c.createdAt;
    return lastActivity <= reactivationCutoff;
  }).length;

  const financeiro = canSeeFinanceiro
    ? await (async () => {
        const [pendenteReceber, recebido30, pendentePagar, atrasadas] = await Promise.all([
          prisma.receivable.aggregate({ where: { status: "PENDENTE" }, _sum: { amount: true } }),
          prisma.receivable.aggregate({
            where: { status: "RECEBIDO", receivedAt: { gte: thirtyDaysAgo } },
            _sum: { amount: true },
          }),
          prisma.payable.aggregate({ where: { status: "PENDENTE" }, _sum: { amount: true } }),
          prisma.receivable.count({
            where: { status: "PENDENTE", dueDate: { lt: startOfToday } },
          }),
        ]);
        return {
          pendenteReceber: Number(pendenteReceber._sum.amount ?? 0),
          recebido30: Number(recebido30._sum.amount ?? 0),
          pendentePagar: Number(pendentePagar._sum.amount ?? 0),
          atrasadas,
        };
      })()
    : null;
  const MEDIA_ACTIVE_STATUSES = ["IDEIA", "EM_PRODUCAO", "AGUARDANDO_APROVACAO", "APROVADO"] as const;
  const [conteudosAguardandoAprovacao, conteudosPublicadosMes, conteudosAtrasados] =
    await Promise.all([
      prisma.mediaContent.count({ where: { status: "AGUARDANDO_APROVACAO" } }),
      prisma.mediaContent.count({
        where: { status: "PUBLICADO", publishedAt: { gte: thirtyDaysAgo } },
      }),
      prisma.mediaContent.count({
        where: {
          status: { in: [...MEDIA_ACTIVE_STATUSES] },
          scheduledDate: { lt: startOfToday },
        },
      }),
    ]);

  const lastTwoInstagramMetrics = await prisma.instagramMetric.findMany({
    orderBy: { date: "desc" },
    take: 2,
  });
  const latestInstagramMetric = lastTwoInstagramMetrics[0] ?? null;
  const instagramFollowerGrowth =
    lastTwoInstagramMetrics.length === 2
      ? lastTwoInstagramMetrics[0].followers - lastTwoInstagramMetrics[1].followers
      : null;

  const responsibleNameById = Object.fromEntries(responsibleUsers.map((u) => [u.id, u.name]));

  const roleCounts = Object.fromEntries(
    usuariosPorPapel.map((r) => [r.role, r._count]),
  );

  // Com uma pessoa só no papel, abre direto as tarefas dela; com mais, filtra pelo papel.
  const tasksHref = (role: "BIA" | "ADMIN") => {
    const people = usuariosAtivos.filter((u) => u.role === role);
    return people.length === 1 ? `/tarefas?assignedTo=${people[0].id}` : `/tarefas?papel=${role}`;
  };

  const followUpCount =
    orcamentosParaFollowUp.length + leadsParaFollowUp.length + servicosAtrasadosList.length;
  const hojeCount = agendaDeHoje.length + servicosDeHoje.length + conteudosDeHoje.length;

  const { monthLabels, clientesSerie, leadsSerie, receitaSerie, despesaSerie } =
    monthlyChartSeries;

  const chartTabs: ChartTab[] = [
    {
      key: "clientes",
      label: "Clientes",
      title: "Novos clientes por mês",
      format: "number",
      series: [{ key: "clientes", label: "Novos clientes", color: "#2a78d6" }],
      data: monthLabels.map((label, i) => ({ label, clientes: clientesSerie[i] })),
    },
    {
      key: "leads",
      label: "Leads",
      title: "Leads convertidos por mês",
      format: "number",
      series: [{ key: "leads", label: "Leads convertidos", color: "#6250d6" }],
      data: monthLabels.map((label, i) => ({ label, leads: leadsSerie[i] })),
    },
    ...(financeiro
      ? ([
          {
            key: "faturamento",
            label: "Faturamento",
            title: "Faturamento recebido por mês",
            format: "currency",
            series: [{ key: "receita", label: "Recebido", color: "#008300" }],
            data: monthLabels.map((label, i) => ({ label, receita: receitaSerie[i] })),
          },
          {
            key: "receita-despesa",
            label: "Receita x Despesa",
            title: "Receita x Despesa por mês",
            format: "currency",
            series: [
              { key: "receita", label: "Receita", color: "#008300" },
              { key: "despesa", label: "Despesa", color: "#e34948", dashed: true },
            ],
            data: monthLabels.map((label, i) => ({ label, receita: receitaSerie[i], despesa: despesaSerie[i] })),
          },
        ] satisfies ChartTab[])
      : []),
  ];

  return (
    <div className="space-y-5 md:space-y-8">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl font-bold text-slate-900">Centro de operações</h1>
          <p className="hidden text-sm text-slate-500 md:block">
            Visão geral em tempo real. O que a Monteiro precisa fazer agora está destacado abaixo.
          </p>
        </div>
        <DashboardMenu />
      </div>

      {balanceSeries && (
        <BalanceCard
          total={totalBalance}
          accounts={activeAccounts.map((a) => ({ id: a.accountId, name: a.name, current: a.current }))}
          daily={balanceSeries.daily}
          monthly={balanceSeries.monthly}
        />
      )}

      {goalsProgress && <GoalsSection progress={goalsProgress} company={brand ?? undefined} />}

      {followUpCount > 0 && (
        <Card className="border-amber-200 bg-amber-50">
          <CardHeader className="border-amber-100">
            <CardTitle className="flex items-center gap-2 text-amber-800">
              <AlertTriangle className="h-4 w-4" /> Follow-up necessário
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {orcamentosParaFollowUp.map((q) => (
              <Link
                key={q.id}
                href={`/orcamentos/${q.id}`}
                className="flex flex-col gap-1 rounded-lg bg-white px-3 py-2 text-sm hover:bg-slate-50 sm:flex-row sm:items-center sm:justify-between sm:gap-3"
              >
                <span>
                  Orçamento #{q.number} de {displayClientName(q.client)} enviado em{" "}
                  {formatDateBR(q.sentAt)} sem resposta
                </span>
                <span className="text-amber-700">Cobrar retorno →</span>
              </Link>
            ))}
            {leadsParaFollowUp.map((l) => (
              <Link
                key={l.id}
                href={`/leads/${l.id}`}
                className="flex flex-col gap-1 rounded-lg bg-white px-3 py-2 text-sm hover:bg-slate-50 sm:flex-row sm:items-center sm:justify-between sm:gap-3"
              >
                <span>
                  Lead {l.name} — retorno previsto para {formatDateBR(l.nextContactDate)}
                </span>
                <span className="text-amber-700">Fazer contato →</span>
              </Link>
            ))}
            {servicosAtrasadosList.map((s) => (
              <Link
                key={s.id}
                href={`/servicos-abertos/${s.id}`}
                className="flex flex-col gap-1 rounded-lg bg-white px-3 py-2 text-sm hover:bg-slate-50 sm:flex-row sm:items-center sm:justify-between sm:gap-3"
              >
                <span>
                  Serviço &quot;{s.title}&quot; de {displayClientName(s.client)} — prazo era{" "}
                  {formatDateBR(s.dueDate)}
                </span>
                <span className="text-amber-700">Ver serviço →</span>
              </Link>
            ))}
            <Link
              href="/assistente"
              className="flex min-h-11 items-center gap-1 pt-1 text-sm font-medium text-amber-800 hover:underline md:min-h-0"
            >
              <Sparkles className="h-3.5 w-3.5" /> Ver análise completa na Monteiro IA →
            </Link>
          </CardContent>
        </Card>
      )}

      <section aria-labelledby="hoje-titulo">
        <Card>
          <CardHeader>
            <CardTitle id="hoje-titulo" className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4" /> Hoje
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {hojeCount === 0 && <p className="text-sm text-slate-500">Nada marcado para hoje.</p>}
            {agendaDeHoje.map((e) => (
              <Link
                key={e.id}
                href={`/agenda/${e.id}`}
                className="flex min-h-11 items-center justify-between gap-3 rounded-lg px-2 py-1.5 text-sm hover:bg-slate-50"
              >
                <span
                  className={
                    e.status === "CONCLUIDO" ? "min-w-0 text-slate-400 line-through" : "min-w-0 text-slate-800"
                  }
                >
                  {e.status === "CONCLUIDO" && <Check className="mr-1 inline h-3.5 w-3.5 text-emerald-600" aria-label="Concluído" />}
                  {e.title}
                </span>
                <span className="shrink-0 text-xs text-slate-500">{formatWallTime(e.startAt)}</span>
              </Link>
            ))}
            {servicosDeHoje.map((s) => (
              <Link
                key={s.id}
                href={`/servicos-abertos/${s.id}`}
                className="flex min-h-11 items-center justify-between gap-3 rounded-lg px-2 py-1.5 text-sm hover:bg-slate-50"
              >
                <span className="min-w-0 text-slate-800">
                  {s.title} — {displayClientName(s.client)}
                </span>
                <span className="shrink-0 text-xs text-slate-500">Serviço</span>
              </Link>
            ))}
            {conteudosDeHoje.map((c) => (
              <Link
                key={c.id}
                href={`/midia/${c.id}`}
                className="flex min-h-11 items-center justify-between gap-3 rounded-lg px-2 py-1.5 text-sm hover:bg-slate-50"
              >
                <span className="min-w-0 text-slate-800">{c.title}</span>
                <span className="shrink-0 text-xs text-slate-500">
                  {c.scheduledDate ? formatWallTime(c.scheduledDate) : "Conteúdo"}
                </span>
              </Link>
            ))}
          </CardContent>
        </Card>
      </section>

      {financeiro && (
        <CollapsibleSection title="Financeiro" defaultOpen>
          <div className={STAT_GRID}>
            <StatCard
              label="A receber"
              value={formatCurrencyBRL(financeiro.pendenteReceber)}
              icon={ArrowDownCircle}
              tone="green"
              href="/financeiro/receber?status=PENDENTE"
            />
            <StatCard
              label="Recebido (30 dias)"
              value={formatCurrencyBRL(financeiro.recebido30)}
              icon={Wallet}
              tone="blue"
              href="/financeiro/receber?status=RECEBIDO&dias=30"
            />
            <StatCard
              label="A pagar"
              value={formatCurrencyBRL(financeiro.pendentePagar)}
              icon={ArrowUpCircle}
              tone="amber"
              href="/financeiro/pagar?status=PENDENTE"
            />
            <StatCard
              label="Vencidas a receber"
              value={financeiro.atrasadas}
              icon={AlertTriangle}
              tone="red"
              href="/financeiro/receber?overdue=1"
            />
          </div>
        </CollapsibleSection>
      )}

      <CollapsibleSection title="Comercial" defaultOpen>
        <div className={STAT_GRID}>
          <StatCard label="Leads novos" value={leadsNovos} icon={Target} tone="blue" href="/leads?stage=NOVO_LEAD" />
          <StatCard
            label="Em atendimento"
            value={leadsEmAtendimento}
            icon={Headphones}
            tone="amber"
            href="/leads?stage=PRIMEIRO_CONTATO,EM_ATENDIMENTO"
          />
          <StatCard label="Leads quentes" value={leadsQuentes} icon={Flame} tone="red" href="/leads?temperature=QUENTE" />
          <StatCard
            label="Orçamentos sem resposta"
            value={orcamentosAguardando}
            icon={FileText}
            tone="amber"
            href={`/orcamentos?status=${QUOTE_AWAITING_STATUSES.join(",")}`}
          />
          <StatCard
            label="Propostas enviadas"
            value={propostasEnviadas}
            icon={FileSignature}
            tone="blue"
            href="/propostas?status=ENVIADA"
          />
          <StatCard
            label="Aprovados (30 dias)"
            value={orcamentosAprovadosMes}
            icon={FileText}
            tone="green"
            href="/orcamentos?status=APROVADO&dias=30"
          />
          <StatCard
            label="Valor aprovado (30 dias)"
            value={formatCurrencyBRL(orcamentosAprovadosValorMes)}
            icon={Wallet}
            tone="green"
            href="/orcamentos?status=APROVADO&dias=30"
          />
          <StatCard
            label="Contratos a assinar"
            value={contratosAguardandoAssinatura.length}
            icon={FileStack}
            tone="amber"
            href="/juridico/contratos?status=ENVIADO"
          />
          <StatCard
            label="Vencem ou reajustam (30 dias)"
            value={contratosVencendo.length}
            icon={FileStack}
            tone="slate"
            href="/juridico/contratos?vence=30"
          />
        </div>
        {(contratosAguardandoAssinatura.length > 0 || contratosVencendo.length > 0) && (
          <Card className="mt-4">
            <CardHeader>
              <CardTitle>Jurídico</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase text-slate-500">Aguardando assinatura</p>
                {contratosAguardandoAssinatura.length === 0 && <p className="text-sm text-slate-400">Nenhum.</p>}
                {contratosAguardandoAssinatura.slice(0, 5).map((c) => (
                  <Link
                    key={c.id}
                    href={`/juridico/contratos/${c.id}`}
                    className="flex min-h-11 items-center justify-between gap-2 rounded-lg border border-slate-100 px-3 py-2 text-sm hover:bg-slate-50 md:min-h-0"
                  >
                    <span className="min-w-0 break-words">
                      {c.code} — {displayClientName(c.client)}
                    </span>
                    <span className="shrink-0 text-xs text-slate-500">desde {formatDateBR(c.sentAt)}</span>
                  </Link>
                ))}
              </div>
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase text-slate-500">Vencimentos e reajustes (30 dias)</p>
                {contratosVencendo.length === 0 && <p className="text-sm text-slate-400">Nenhum.</p>}
                {contratosVencendo.slice(0, 5).map((c) => (
                  <Link
                    key={c.id}
                    href={`/juridico/contratos/${c.id}`}
                    className="flex min-h-11 items-center justify-between gap-2 rounded-lg border border-slate-100 px-3 py-2 text-sm hover:bg-slate-50 md:min-h-0"
                  >
                    <span className="min-w-0 break-words">
                      {c.code} — {displayClientName(c.client)}
                    </span>
                    <span className="shrink-0 text-xs text-slate-500">{contractNextDate(c)}</span>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </CollapsibleSection>

      <CollapsibleSection title="Operacional" defaultOpen>
        <div className={STAT_GRID}>
          <StatCard
            label="Serviços em andamento"
            value={servicosEmAndamento}
            icon={ClipboardList}
            tone="blue"
            href={`/servicos-abertos?status=${ACTIVE_SERVICE_STATUSES.join(",")}`}
          />
          <StatCard
            label="Serviços para hoje"
            value={servicosParaHoje}
            icon={CalendarClock}
            tone="amber"
            href="/servicos-abertos?due=today"
          />
          <StatCard
            label="Serviços atrasados"
            value={servicosAtrasados}
            icon={AlertTriangle}
            tone="red"
            href="/servicos-abertos?overdue=1"
          />
          <StatCard
            label="Ativos no catálogo"
            value={servicosAtivos}
            icon={Briefcase}
            tone="slate"
            href="/servicos?ativos=1"
          />
        </div>
        {servicosPorResponsavel.length > 0 && (
          <Card className="mt-4">
            <CardHeader>
              <CardTitle>Serviços em andamento por responsável</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 text-sm">
              {servicosPorResponsavel.map((r) => (
                <div key={r.responsibleId ?? "sem-responsavel"} className="flex justify-between">
                  <span className="text-slate-600">
                    {r.responsibleId ? responsibleNameById[r.responsibleId] ?? "-" : "Sem responsável"}
                  </span>
                  <span className="font-medium text-slate-900">{r._count}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </CollapsibleSection>

      <section>
        <SectionTitle>Evolução (últimos 12 meses)</SectionTitle>
        <ChartTabs tabs={chartTabs} />
      </section>

      <CollapsibleSection title="Bia / Mídia">
        <div className={STAT_GRID}>
          <StatCard
            label="Aguardando aprovação"
            value={conteudosAguardandoAprovacao}
            icon={Megaphone}
            tone="amber"
            href="/midia?status=AGUARDANDO_APROVACAO"
          />
          <StatCard
            label="Publicados (30 dias)"
            value={conteudosPublicadosMes}
            icon={Send}
            tone="green"
            href="/midia?status=PUBLICADO&dias=30"
          />
          <StatCard
            label="Conteúdos atrasados"
            value={conteudosAtrasados}
            icon={AlertTriangle}
            tone="red"
            href="/midia?overdue=1"
          />
          <StatCard
            label="Seguidores no Instagram"
            value={latestInstagramMetric ? latestInstagramMetric.followers : "-"}
            hint={
              instagramFollowerGrowth !== null
                ? `${instagramFollowerGrowth >= 0 ? "+" : ""}${instagramFollowerGrowth}`
                : undefined
            }
            icon={Camera}
            tone={instagramFollowerGrowth !== null && instagramFollowerGrowth < 0 ? "red" : "blue"}
            href="/instagram"
          />
        </div>
      </CollapsibleSection>

      <CollapsibleSection title="Equipe">
        <div className={STAT_GRID}>
          <StatCard
            label="Administradores"
            value={roleCounts.ADMIN ?? 0}
            icon={ShieldCheck}
            tone="slate"
            href="/usuarios?papel=ADMIN"
          />
          <StatCard label="Gestores" value={roleCounts.GESTOR ?? 0} icon={Users} tone="slate" href="/usuarios?papel=GESTOR" />
          <StatCard label="Bia / Mídia" value={roleCounts.BIA ?? 0} icon={Users} tone="slate" href="/usuarios?papel=BIA" />
          <StatCard
            label="Tarefas atrasadas"
            value={tarefasAtrasadas}
            icon={AlertTriangle}
            tone="red"
            href="/tarefas?overdue=1"
          />
          <StatCard label="Tarefas da Bia" value={tarefasBia} icon={CheckSquare} tone="slate" href={tasksHref("BIA")} />
          <StatCard
            label="Tarefas do administrador"
            value={tarefasAdmin}
            icon={CheckSquare}
            tone="slate"
            href={tasksHref("ADMIN")}
          />
        </div>
      </CollapsibleSection>

      <CollapsibleSection title="Clientes">
        <div className={STAT_GRID}>
          <StatCard label="Clientes ativos" value={clientesAtivos} icon={Users} tone="green" href="/clientes?status=ATIVO" />
          <StatCard
            label="Novos (30 dias)"
            value={clientesNovos}
            icon={UserPlus}
            tone="blue"
            href="/clientes?novos=30"
          />
          <StatCard label="Total cadastrados" value={totalClientes} icon={Users} href="/clientes" />
          <StatCard
            label="Para reativação"
            value={clientesParaReativacao}
            icon={RotateCcw}
            tone="amber"
            href="/clientes?reativacao=1"
          />
        </div>
      </CollapsibleSection>
    </div>
  );
}
