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
  CheckSquare,
  ArrowDownCircle,
  ArrowUpCircle,
  Wallet,
  Megaphone,
  Send,
  Sparkles,
  RotateCcw,
  FileDown,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { StatCard, SectionTitle } from "@/components/dashboard/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { daysAgo, formatCurrencyBRL, formatDateBR } from "@/lib/utils";
import { displayClientName } from "@/lib/client-display";
import { getSession } from "@/lib/session";
import { getMonthlyChartSeries } from "@/lib/dashboard-charts";
import { MonthlyLineChart } from "@/components/dashboard/monthly-line-chart";

const QUOTE_AWAITING_STATUSES = ["ENVIADO", "VISUALIZADO", "EM_NEGOCIACAO"] as const;
const ACTIVE_SERVICE_STATUSES = ["ABERTO", "EM_ANDAMENTO", "EM_REVISAO"] as const;
const REACTIVATION_DAYS = 90;

export default async function DashboardPage() {
  const session = await getSession();
  const canSeeFinanceiro = session?.role === "ADMIN" || session?.role === "GESTOR";
  const thirtyDaysAgo = daysAgo(30);
  const threeDaysAgo = daysAgo(3);
  const reactivationCutoff = daysAgo(REACTIVATION_DAYS);
  const endOfToday = new Date();
  endOfToday.setHours(23, 59, 59, 999);
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

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
    documentosGeradosMes,
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
    prisma.generatedDocument.count({
      where: { status: { in: ["ENVIADO", "AGUARDANDO_ASSINATURA"] } },
    }),
    prisma.generatedDocument.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
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

  const responsibleNameById = Object.fromEntries(responsibleUsers.map((u) => [u.id, u.name]));

  const roleCounts = Object.fromEntries(
    usuariosPorPapel.map((r) => [r.role, r._count]),
  );

  const followUpCount =
    orcamentosParaFollowUp.length + leadsParaFollowUp.length + servicosAtrasadosList.length;

  const { monthLabels, clientesSerie, leadsSerie, receitaSerie, despesaSerie } =
    monthlyChartSeries;

  const clientesChartData = monthLabels.map((label, i) => ({
    label,
    clientes: clientesSerie[i],
  }));
  const leadsChartData = monthLabels.map((label, i) => ({
    label,
    leads: leadsSerie[i],
  }));
  const faturamentoChartData = financeiro
    ? monthLabels.map((label, i) => ({ label, receita: receitaSerie[i] }))
    : [];
  const receitaDespesaChartData = financeiro
    ? monthLabels.map((label, i) => ({
        label,
        receita: receitaSerie[i],
        despesa: despesaSerie[i],
      }))
    : [];

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900">
            Centro de operações — Monteiro
          </h1>
          <p className="text-sm text-slate-500">
            Visão geral em tempo real. O que a Monteiro precisa fazer agora está
            destacado abaixo.
          </p>
        </div>
        <Link href="/relatorios/graficos/pdf" target="_blank">
          <Button variant="outline">
            <FileDown className="h-4 w-4" /> Gerar relatório em PDF
          </Button>
        </Link>
      </div>

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
                className="flex items-center justify-between rounded-lg bg-white px-3 py-2 text-sm hover:bg-slate-50"
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
                className="flex items-center justify-between rounded-lg bg-white px-3 py-2 text-sm hover:bg-slate-50"
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
                className="flex items-center justify-between rounded-lg bg-white px-3 py-2 text-sm hover:bg-slate-50"
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
              className="flex items-center gap-1 pt-1 text-sm font-medium text-amber-800 hover:underline"
            >
              <Sparkles className="h-3.5 w-3.5" /> Ver análise completa na Monteiro IA →
            </Link>
          </CardContent>
        </Card>
      )}

      <section>
        <div className="mb-3 flex items-center justify-between">
          <SectionTitle>Evolução (últimos 12 meses)</SectionTitle>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Novos clientes por mês</CardTitle>
            </CardHeader>
            <CardContent>
              <MonthlyLineChart
                data={clientesChartData}
                series={[{ key: "clientes", label: "Novos clientes", color: "#2a78d6" }]}
                format="number"
              />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Leads convertidos por mês</CardTitle>
            </CardHeader>
            <CardContent>
              <MonthlyLineChart
                data={leadsChartData}
                series={[{ key: "leads", label: "Leads convertidos", color: "#6250d6" }]}
                format="number"
              />
            </CardContent>
          </Card>
          {financeiro && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>Faturamento recebido por mês</CardTitle>
                </CardHeader>
                <CardContent>
                  <MonthlyLineChart
                    data={faturamentoChartData}
                    series={[{ key: "receita", label: "Recebido", color: "#008300" }]}
                    format="currency"
                  />
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Receita x Despesa por mês</CardTitle>
                </CardHeader>
                <CardContent>
                  <MonthlyLineChart
                    data={receitaDespesaChartData}
                    series={[
                      { key: "receita", label: "Receita", color: "#008300" },
                      { key: "despesa", label: "Despesa", color: "#e34948", dashed: true },
                    ]}
                    format="currency"
                  />
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </section>

      <section>
        <SectionTitle>Comercial</SectionTitle>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <StatCard
            label="Leads novos"
            value={leadsNovos}
            icon={Target}
            tone="blue"
            href="/leads?stage=NOVO_LEAD"
          />
          <StatCard
            label="Leads em atendimento"
            value={leadsEmAtendimento}
            icon={Headphones}
            tone="amber"
            href="/leads?stage=PRIMEIRO_CONTATO,EM_ATENDIMENTO"
          />
          <StatCard
            label="Leads quentes"
            value={leadsQuentes}
            icon={Flame}
            tone="red"
            href="/leads?temperature=QUENTE"
          />
          <StatCard
            label="Orçamentos aguardando resposta"
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
            label="Orçamentos aprovados (30 dias)"
            value={orcamentosAprovadosMes}
            icon={FileText}
            tone="green"
            href="/orcamentos?status=APROVADO"
          />
          <StatCard
            label="Contratos aguardando assinatura"
            value={contratosAguardandoAssinatura}
            icon={FileStack}
            tone="amber"
            href="/documentos?status=ENVIADO,AGUARDANDO_ASSINATURA"
          />
          <StatCard
            label="Documentos gerados (30 dias)"
            value={documentosGeradosMes}
            icon={FileStack}
            tone="slate"
            href="/documentos"
          />
          <StatCard
            label="Valor aprovado em orçamentos (30 dias)"
            value={formatCurrencyBRL(orcamentosAprovadosValorMes)}
            icon={Wallet}
            tone="green"
            href="/relatorios"
          />
        </div>
      </section>

      <section>
        <SectionTitle>Operacional</SectionTitle>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
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
            label="Serviços ativos no catálogo"
            value={servicosAtivos}
            icon={Briefcase}
            tone="slate"
            href="/servicos"
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
      </section>

      <section>
        <SectionTitle>Bia / Mídia</SectionTitle>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
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
            href="/midia?status=PUBLICADO"
          />
          <StatCard
            label="Conteúdos atrasados"
            value={conteudosAtrasados}
            icon={AlertTriangle}
            tone="red"
            href="/midia?overdue=1"
          />
        </div>
      </section>

      {financeiro && (
        <section>
          <SectionTitle>Financeiro</SectionTitle>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <StatCard
              label="A receber (pendente)"
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
              href="/financeiro/receber?status=RECEBIDO"
            />
            <StatCard
              label="A pagar (pendente)"
              value={formatCurrencyBRL(financeiro.pendentePagar)}
              icon={ArrowUpCircle}
              tone="amber"
              href="/financeiro/pagar?status=PENDENTE"
            />
            <StatCard
              label="Contas a receber vencidas"
              value={financeiro.atrasadas}
              icon={AlertTriangle}
              tone="red"
              href="/financeiro/receber?overdue=1"
            />
          </div>
        </section>
      )}

      <section>
        <SectionTitle>Equipe</SectionTitle>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <StatCard
            label="Administradores ativos"
            value={roleCounts.ADMIN ?? 0}
            icon={ShieldCheck}
            tone="slate"
            href="/usuarios"
          />
          <StatCard
            label="Gestores ativos"
            value={roleCounts.GESTOR ?? 0}
            icon={Users}
            tone="slate"
            href="/usuarios"
          />
          <StatCard
            label="Bia / Mídia ativas"
            value={roleCounts.BIA ?? 0}
            icon={Users}
            tone="slate"
            href="/usuarios"
          />
          <StatCard
            label="Tarefas atrasadas"
            value={tarefasAtrasadas}
            icon={AlertTriangle}
            tone="red"
            href="/tarefas?overdue=1"
          />
          <StatCard
            label="Tarefas da Bia"
            value={tarefasBia}
            icon={CheckSquare}
            tone="slate"
            href="/tarefas"
          />
          <StatCard
            label="Tarefas do administrador"
            value={tarefasAdmin}
            icon={CheckSquare}
            tone="slate"
            href="/tarefas"
          />
        </div>
      </section>

      <section>
        <SectionTitle>Clientes</SectionTitle>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <StatCard
            label="Clientes ativos"
            value={clientesAtivos}
            icon={Users}
            tone="green"
            href="/clientes?status=ATIVO"
          />
          <StatCard
            label="Clientes novos (30 dias)"
            value={clientesNovos}
            icon={UserPlus}
            tone="blue"
            href="/clientes"
          />
          <StatCard
            label="Total de clientes cadastrados"
            value={totalClientes}
            icon={Users}
            href="/clientes"
          />
          <StatCard
            label="Clientes para reativação"
            value={clientesParaReativacao}
            icon={RotateCcw}
            tone="amber"
            href="/assistente"
          />
        </div>
      </section>
    </div>
  );
}
