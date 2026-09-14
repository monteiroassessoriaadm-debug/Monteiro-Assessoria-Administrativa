import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { LeadForm } from "../../lead-form";
import { updateLeadAction } from "../../actions";

export default async function EditarLeadPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [lead, services, users] = await Promise.all([
    prisma.lead.findUnique({ where: { id } }),
    prisma.service.findMany({
      where: { active: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.user.findMany({
      where: { active: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  if (!lead) notFound();

  const boundAction = updateLeadAction.bind(null, id);

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Editar lead</h1>
      </div>
      <LeadForm
        action={boundAction}
        services={services}
        users={users}
        submitLabel="Salvar alterações"
        defaults={{
          name: lead.name,
          whatsapp: lead.whatsapp ?? undefined,
          phone: lead.phone ?? undefined,
          instagram: lead.instagram ?? undefined,
          city: lead.city ?? undefined,
          clientTypeGuess: lead.clientTypeGuess ?? undefined,
          serviceInterestId: lead.serviceInterestId ?? undefined,
          origin: lead.origin ?? undefined,
          responsibleId: lead.responsibleId ?? undefined,
          temperature: lead.temperature,
          stage: lead.stage,
          nextContactDate: lead.nextContactDate
            ? lead.nextContactDate.toISOString().slice(0, 10)
            : undefined,
          notes: lead.notes ?? undefined,
        }}
      />
    </div>
  );
}
