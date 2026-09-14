import { prisma } from "@/lib/prisma";
import { displayClientName } from "@/lib/client-display";
import { ProposalForm } from "../proposal-form";
import { createProposalAction } from "../actions";

export default async function NovaPropostaPage({
  searchParams,
}: {
  searchParams: Promise<{ clientId?: string; leadId?: string }>;
}) {
  const { clientId, leadId } = await searchParams;

  const [clients, services] = await Promise.all([
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

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Nova proposta</h1>
      </div>
      <ProposalForm
        action={createProposalAction}
        clients={clients.map((c) => ({ id: c.id, label: displayClientName(c) }))}
        services={services}
        defaults={{ clientId, leadId }}
      />
    </div>
  );
}
