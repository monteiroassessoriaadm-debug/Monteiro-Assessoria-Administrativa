import {
  Target,
  Flame,
  Headphones,
  Users,
  UserPlus,
  Briefcase,
  ShieldCheck,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { StatCard, SectionTitle, ComingSoonCard } from "@/components/dashboard/stat-card";
import { daysAgo } from "@/lib/utils";

export default async function DashboardPage() {
  const thirtyDaysAgo = daysAgo(30);

  const [
    leadsNovos,
    leadsEmAtendimento,
    leadsQuentes,
    clientesAtivos,
    clientesNovos,
    totalClientes,
    servicosAtivos,
    usuariosPorPapel,
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
  ]);

  const roleCounts = Object.fromEntries(
    usuariosPorPapel.map((r) => [r.role, r._count]),
  );

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-bold text-slate-900">
          Centro de operações — Monteiro
        </h1>
        <p className="text-sm text-slate-500">
          Visão geral em tempo real. Fase 1 (Base): clientes, leads, serviços e
          usuários.
        </p>
      </div>

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
          <ComingSoonCard phase="Fase 2 (Orçamentos, propostas, funil completo)" />
        </div>
      </section>

      <section>
        <SectionTitle>Operacional</SectionTitle>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <ComingSoonCard phase="Fase 4 (Serviços, checklist, prazos, entregas)" />
          <ComingSoonCard phase="Fase 4 (Serviços, checklist, prazos, entregas)" />
          <ComingSoonCard phase="Fase 4 (Serviços, checklist, prazos, entregas)" />
          <StatCard
            label="Serviços ativos no catálogo"
            value={servicosAtivos}
            icon={Briefcase}
            tone="slate"
          />
        </div>
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
          <ComingSoonCard phase="Fase 4 (Tarefas por responsável)" />
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
          <ComingSoonCard phase="Fase 2/5 (Clientes para reativação)" />
        </div>
      </section>
    </div>
  );
}
