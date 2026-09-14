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
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { StatCard, SectionTitle, ComingSoonCard } from "@/components/dashboard/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { daysAgo, formatDateBR } from "@/lib/utils";
import { displayClientName } from "@/lib/client-display";

const QUOTE_AWAITING_STATUSES = ["ENVIADO", "VISUALIZADO", "EM_NEGOCIACAO"] as const;

export default async function DashboardPage() {
  const thirtyDaysAgo = daysAgo(30);
  const threeDaysAgo = daysAgo(3);
  const endOfToday = new Date();
  endOfToday.setHours(23, 59, 59, 999);
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const ACTIVE_SERVICE_STATUSES = ["ABERTO", "EM_ANDAMENTO", "EM_REVISAO"] as const;

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
    orcamentosAprovadosMes,
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
    prisma.quote.count({
      where: { status: "APROVADO", respondedAt: { gte: thirtyDaysAgo } },
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
  ]);

  const responsibleIds = servicosPorResponsavel
    .map((r) => r.responsibleId)
    .filter((id): id is string => id !== null);
  const responsibleUsers = await prisma.user.findMany({
    where: { id: { in: responsibleIds } },
    select: { id: true, name: true },
  });
  const responsibleNameById = Object.fromEntries(responsibleUsers.map((u) => [u.id, u.name]));

  const roleCounts = Object.fromEntries(
    usuariosPorPapel.map((r) => [r.role, r._count]),
  );

  const followUpCount =
    orcamentosParaFollowUp.length + leadsParaFollowUp.length + servicosAtrasadosList.length;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-bold text-slate-900">
          Centro de operações — Monteiro
        </h1>
        <p className="text-sm text-slate-500">
          Visão geral em tempo real. O que a Monteiro precisa fazer agora está
          destacado abaixo.
        </p>
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
          </CardContent>
        </Card>
      )}

      <section>
        <SectionTitle>Comercial</SectionTitle>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <StatCard label="Leads novos" value={leadsNovos} icon={Target} tone="blue" />
          <StatCard
            label="Leads em atendimento"
            value={leadsEmAtendimento}
            icon={Headphones}
            tone="amber"
          />
          <StatCard label="Leads quentes" value={leadsQuentes} icon={Flame} tone="red" />
          <StatCard
            label="Orçamentos aguardando resposta"
            value={orcamentosAguardando}
            icon={FileText}
            tone="amber"
          />
          <StatCard
            label="Propostas enviadas"
            value={propostasEnviadas}
            icon={FileSignature}
            tone="blue"
          />
          <StatCard
            label="Orçamentos aprovados (30 dias)"
            value={orcamentosAprovadosMes}
            icon={FileText}
            tone="green"
          />
          <StatCard
            label="Contratos aguardando assinatura"
            value={contratosAguardandoAssinatura}
            icon={FileStack}
            tone="amber"
          />
          <StatCard
            label="Documentos gerados (30 dias)"
            value={documentosGeradosMes}
            icon={FileStack}
            tone="slate"
          />
          <ComingSoonCard phase="Fase 5 (Vendas realizadas / faturamento)" />
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
          />
          <StatCard
            label="Serviços para hoje"
            value={servicosParaHoje}
            icon={CalendarClock}
            tone="amber"
          />
          <StatCard
            label="Serviços atrasados"
            value={servicosAtrasados}
            icon={AlertTriangle}
            tone="red"
          />
          <StatCard
            label="Serviços ativos no catálogo"
            value={servicosAtivos}
            icon={Briefcase}
            tone="slate"
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
        <SectionTitle>Financeiro</SectionTitle>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <ComingSoonCard phase="Fase 5 (Contas a receber e a pagar)" />
          <ComingSoonCard phase="Fase 5 (Contas a receber e a pagar)" />
          <ComingSoonCard phase="Fase 5 (Fluxo de caixa)" />
          <ComingSoonCard phase="Fase 5 (Previsão de recebimentos)" />
        </div>
      </section>

      <section>
        <SectionTitle>Equipe</SectionTitle>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <StatCard
            label="Administradores ativos"
            value={roleCounts.ADMIN ?? 0}
            icon={ShieldCheck}
            tone="slate"
          />
          <StatCard
            label="Gestores ativos"
            value={roleCounts.GESTOR ?? 0}
            icon={Users}
            tone="slate"
          />
          <StatCard
            label="Bia / Mídia ativas"
            value={roleCounts.BIA ?? 0}
            icon={Users}
            tone="slate"
          />
          <StatCard
            label="Tarefas atrasadas"
            value={tarefasAtrasadas}
            icon={AlertTriangle}
            tone="red"
          />
          <StatCard label="Tarefas da Bia" value={tarefasBia} icon={CheckSquare} tone="slate" />
          <StatCard
            label="Tarefas do administrador"
            value={tarefasAdmin}
            icon={CheckSquare}
            tone="slate"
          />
        </div>
      </section>

      <section>
        <SectionTitle>Clientes</SectionTitle>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <StatCard label="Clientes ativos" value={clientesAtivos} icon={Users} tone="green" />
          <StatCard
            label="Clientes novos (30 dias)"
            value={clientesNovos}
            icon={UserPlus}
            tone="blue"
          />
          <StatCard label="Total de clientes cadastrados" value={totalClientes} icon={Users} />
          <ComingSoonCard phase="Fase 5 (Clientes para reativação)" />
        </div>
      </section>
    </div>
  );
}
