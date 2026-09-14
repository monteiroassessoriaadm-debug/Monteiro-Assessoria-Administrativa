import Link from "next/link";
import { Sparkles, AlertTriangle } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { daysAgo, formatDateBR, formatCurrencyBRL } from "@/lib/utils";
import { displayClientName } from "@/lib/client-display";
import { getSession } from "@/lib/session";

type Insight = {
  id: string;
  text: string;
  href: string;
  cta: string;
};

function Section({
  title,
  insights,
  emptyText,
}: {
  title: string;
  insights: Insight[];
  emptyText: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>{title}</span>
          <Badge tone={insights.length > 0 ? "yellow" : "green"}>
            {insights.length} {insights.length === 1 ? "item" : "itens"}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {insights.length === 0 ? (
          <p className="text-sm text-slate-400">{emptyText}</p>
        ) : (
          insights.map((i) => (
            <Link
              key={i.id}
              href={i.href}
              className="flex items-center justify-between gap-4 rounded-lg border border-slate-100 px-3 py-2 text-sm hover:bg-slate-50"
            >
              <span className="text-slate-700">{i.text}</span>
              <span className="shrink-0 text-blue-600">{i.cta} →</span>
            </Link>
          ))
        )}
      </CardContent>
    </Card>
  );
}

export default async function AssistenteIAPage() {
  const session = await getSession();
  const canSeeFinanceiro = session?.role === "ADMIN" || session?.role === "GESTOR";
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  const threeDaysAgo = daysAgo(3);
  const reactivationCutoff = daysAgo(90);

  const [
    leadsParaFollowUp,
    orcamentosParados,
    propostasSemResposta,
    servicosAtrasadosList,
    tarefasAtrasadasList,
    receivablesVencidos,
    payablesVencidos,
    conteudosAguardando,
    conteudosAtrasados,
    prospectsParaContato,
    clientesCandidatosReativacao,
  ] = await Promise.all([
    prisma.lead.findMany({
      where: {
        stage: { notIn: ["CONTRATADO", "PERDIDO"] },
        nextContactDate: { lte: today, not: null },
      },
      orderBy: { nextContactDate: "asc" },
      take: 8,
    }),
    prisma.quote.findMany({
      where: {
        status: { in: ["ENVIADO", "VISUALIZADO", "EM_NEGOCIACAO"] },
        sentAt: { lte: threeDaysAgo },
      },
      include: { client: true },
      orderBy: { sentAt: "asc" },
      take: 8,
    }),
    prisma.proposal.findMany({
      where: { status: "ENVIADA", updatedAt: { lte: threeDaysAgo } },
      include: { client: true },
      orderBy: { updatedAt: "asc" },
      take: 8,
    }),
    prisma.serviceInstance.findMany({
      where: {
        status: { in: ["ABERTO", "EM_ANDAMENTO", "EM_REVISAO"] },
        dueDate: { lt: today },
      },
      include: { client: true },
      orderBy: { dueDate: "asc" },
      take: 8,
    }),
    prisma.task.findMany({
      where: { status: "PENDENTE", dueDate: { lt: today } },
      include: { assignedTo: true, client: true },
      orderBy: { dueDate: "asc" },
      take: 8,
    }),
    canSeeFinanceiro
      ? prisma.receivable.findMany({
          where: { status: "PENDENTE", dueDate: { lt: today } },
          include: { client: true },
          orderBy: { dueDate: "asc" },
          take: 8,
        })
      : Promise.resolve([]),
    canSeeFinanceiro
      ? prisma.payable.findMany({
          where: { status: "PENDENTE", dueDate: { lt: today } },
          orderBy: { dueDate: "asc" },
          take: 8,
        })
      : Promise.resolve([]),
    prisma.mediaContent.findMany({
      where: { status: "AGUARDANDO_APROVACAO" },
      include: { client: true },
      orderBy: { createdAt: "asc" },
      take: 8,
    }),
    prisma.mediaContent.findMany({
      where: {
        status: { in: ["IDEIA", "EM_PRODUCAO", "AGUARDANDO_APROVACAO", "APROVADO"] },
        scheduledDate: { lt: today },
      },
      include: { client: true },
      orderBy: { scheduledDate: "asc" },
      take: 8,
    }),
    prisma.prospectingEntry.findMany({
      where: { convertedLeadId: null, nextContactDate: { lte: today, not: null } },
      orderBy: { nextContactDate: "asc" },
      take: 8,
    }),
    prisma.client.findMany({
      where: { status: "ATIVO", createdAt: { lte: reactivationCutoff } },
      include: { timelineEvents: { orderBy: { createdAt: "desc" }, take: 1 } },
      orderBy: { createdAt: "asc" },
      take: 100,
    }),
  ]);

  const reativacao = clientesCandidatosReativacao
    .filter((c) => {
      const lastActivity = c.timelineEvents[0]?.createdAt ?? c.createdAt;
      return lastActivity <= reactivationCutoff;
    })
    .slice(0, 8);

  const comercial: Insight[] = [
    ...leadsParaFollowUp.map((l) => ({
      id: `lead-${l.id}`,
      text: `Lead "${l.name}" — retorno previsto para ${formatDateBR(l.nextContactDate)}`,
      href: `/leads/${l.id}`,
      cta: "Ver lead",
    })),
    ...orcamentosParados.map((q) => ({
      id: `quote-${q.id}`,
      text: `Orçamento #${q.number} de ${displayClientName(q.client)} enviado em ${formatDateBR(q.sentAt)} sem resposta`,
      href: `/orcamentos/${q.id}`,
      cta: "Cobrar retorno",
    })),
    ...propostasSemResposta.map((p) => ({
      id: `proposal-${p.id}`,
      text: `Proposta #${p.number} de ${displayClientName(p.client)} sem resposta desde ${formatDateBR(p.updatedAt)}`,
      href: `/propostas/${p.id}`,
      cta: "Cobrar retorno",
    })),
    ...prospectsParaContato.map((pr) => ({
      id: `prospect-${pr.id}`,
      text: `Prospecção "${pr.name}" — contato previsto para ${formatDateBR(pr.nextContactDate)}`,
      href: `/prospeccao/${pr.id}`,
      cta: "Fazer contato",
    })),
  ];

  const operacional: Insight[] = [
    ...servicosAtrasadosList.map((s) => ({
      id: `service-${s.id}`,
      text: `Serviço "${s.title}" de ${displayClientName(s.client)} — prazo era ${formatDateBR(s.dueDate)}`,
      href: `/servicos-abertos/${s.id}`,
      cta: "Ver serviço",
    })),
    ...tarefasAtrasadasList.map((t) => ({
      id: `task-${t.id}`,
      text: `Tarefa "${t.title}"${t.assignedTo ? ` (${t.assignedTo.name})` : ""} — prazo era ${formatDateBR(t.dueDate)}`,
      href: "/tarefas",
      cta: "Ver tarefas",
    })),
  ];

  const financeiro: Insight[] = [
    ...receivablesVencidos.map((r) => ({
      id: `receivable-${r.id}`,
      text: `Conta a receber "${r.description}" (${formatCurrencyBRL(r.amount.toString())}) de ${r.client ? displayClientName(r.client) : "-"} vencida em ${formatDateBR(r.dueDate)}`,
      href: "/financeiro/receber",
      cta: "Cobrar",
    })),
    ...payablesVencidos.map((p) => ({
      id: `payable-${p.id}`,
      text: `Conta a pagar "${p.description}" (${formatCurrencyBRL(p.amount.toString())}) vencida em ${formatDateBR(p.dueDate)}`,
      href: "/financeiro/pagar",
      cta: "Ver conta",
    })),
  ];

  const midia: Insight[] = [
    ...conteudosAguardando.map((c) => ({
      id: `media-aprov-${c.id}`,
      text: `Conteúdo "${c.title}" de ${displayClientName(c.client)} aguardando aprovação`,
      href: `/midia/${c.id}`,
      cta: "Revisar",
    })),
    ...conteudosAtrasados.map((c) => ({
      id: `media-atraso-${c.id}`,
      text: `Conteúdo "${c.title}" de ${displayClientName(c.client)} — previsto para ${formatDateBR(c.scheduledDate)}`,
      href: `/midia/${c.id}`,
      cta: "Ver conteúdo",
    })),
  ];

  const reativacaoInsights: Insight[] = reativacao.map((c) => {
    const lastActivity = c.timelineEvents[0]?.createdAt ?? c.createdAt;
    return {
      id: `reativacao-${c.id}`,
      text: `${displayClientName(c)} sem nenhuma interação registrada desde ${formatDateBR(lastActivity)}`,
      href: `/clientes/${c.id}`,
      cta: "Reativar",
    };
  });

  const totalItens =
    comercial.length +
    operacional.length +
    (canSeeFinanceiro ? financeiro.length : 0) +
    midia.length +
    reativacaoInsights.length;

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-blue-600" />
          <h1 className="text-xl font-bold text-slate-900">Monteiro IA</h1>
        </div>
        <p className="text-sm text-slate-500">
          Análise automática dos dados reais do sistema — orçamentos parados, prazos vencidos,
          clientes sem contato recente e outros pontos que precisam de atenção. Não é um chat
          nem uma IA externa: são regras aplicadas sobre o seu próprio cadastro.
        </p>
      </div>

      {totalItens === 0 ? (
        <Card className="border-emerald-200 bg-emerald-50 p-6 text-center text-sm text-emerald-700">
          Nenhum ponto de atenção no momento. Tudo em dia!
        </Card>
      ) : (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="flex items-center gap-2 py-4 text-amber-800">
            <AlertTriangle className="h-4 w-4" />
            <span className="text-sm font-medium">
              {totalItens} {totalItens === 1 ? "ponto" : "pontos"} de atenção encontrados.
            </span>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        <Section
          title="Comercial"
          insights={comercial}
          emptyText="Nenhum follow-up comercial pendente."
        />
        {canSeeFinanceiro && (
          <Section
            title="Financeiro"
            insights={financeiro}
            emptyText="Nenhuma conta vencida."
          />
        )}
        <Section
          title="Operacional"
          insights={operacional}
          emptyText="Nenhum serviço ou tarefa atrasado."
        />
        <Section
          title="Mídia"
          insights={midia}
          emptyText="Nenhum conteúdo pendente de atenção."
        />
        <Section
          title="Reativação de clientes"
          insights={reativacaoInsights}
          emptyText="Nenhum cliente ativo parado há mais de 90 dias."
        />
      </div>
    </div>
  );
}
