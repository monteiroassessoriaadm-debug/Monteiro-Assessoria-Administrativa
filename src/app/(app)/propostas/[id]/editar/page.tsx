import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { displayClientName } from "@/lib/client-display";
import { ProposalForm } from "../../proposal-form";
import { updateProposalAction } from "../../actions";

export default async function EditarPropostaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [proposal, clients, services] = await Promise.all([
    prisma.proposal.findUnique({ where: { id } }),
    prisma.client.findMany({
      where: { status: "ATIVO" },
      select: { id: true, type: true, fullName: true, legalName: true, tradeName: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.service.findMany({
      where: { active: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  if (!proposal) notFound();

  const boundAction = updateProposalAction.bind(null, id);

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Editar proposta #{proposal.number}</h1>
      </div>
      <ProposalForm
        action={boundAction}
        submitLabel="Salvar alterações"
        clients={clients.map((c) => ({ id: c.id, label: displayClientName(c) }))}
        services={services}
        defaults={{
          clientId: proposal.clientId,
          leadId: proposal.leadId ?? undefined,
          serviceId: proposal.serviceId ?? undefined,
          demand: proposal.demand,
          solution: proposal.solution,
          scope: proposal.scope ?? undefined,
          termText: proposal.termText ?? undefined,
          investment: proposal.investment?.toString(),
          paymentTerms: proposal.paymentTerms ?? undefined,
          validUntil: proposal.validUntil ? proposal.validUntil.toISOString().slice(0, 10) : undefined,
          notes: proposal.notes ?? undefined,
        }}
      />
    </div>
  );
}
