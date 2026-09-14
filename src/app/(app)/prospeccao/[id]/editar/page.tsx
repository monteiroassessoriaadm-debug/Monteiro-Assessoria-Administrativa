import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { withCurrentOption } from "@/lib/options";
import { ProspectForm } from "../../prospect-form";
import { updateProspectAction } from "../../actions";

export default async function EditarProspeccaoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [prospect, activeServices, activeUsers] = await Promise.all([
    prisma.prospectingEntry.findUnique({ where: { id } }),
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

  if (!prospect) notFound();

  const [currentService, currentResponsible] = await Promise.all([
    prospect.potentialServiceId
      ? prisma.service.findUnique({
          where: { id: prospect.potentialServiceId },
          select: { id: true, name: true },
        })
      : null,
    prospect.responsibleId
      ? prisma.user.findUnique({
          where: { id: prospect.responsibleId },
          select: { id: true, name: true },
        })
      : null,
  ]);

  const services = withCurrentOption(activeServices, currentService);
  const users = withCurrentOption(activeUsers, currentResponsible);

  const boundAction = updateProspectAction.bind(null, id);

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Editar prospecção</h1>
      </div>
      <ProspectForm
        action={boundAction}
        services={services}
        users={users}
        submitLabel="Salvar alterações"
        defaults={{
          name: prospect.name,
          segment: prospect.segment ?? undefined,
          city: prospect.city ?? undefined,
          contactName: prospect.contactName ?? undefined,
          whatsapp: prospect.whatsapp ?? undefined,
          instagram: prospect.instagram ?? undefined,
          potentialServiceId: prospect.potentialServiceId ?? undefined,
          responsibleId: prospect.responsibleId ?? undefined,
          contactDate: prospect.contactDate
            ? prospect.contactDate.toISOString().slice(0, 10)
            : undefined,
          result: prospect.result ?? undefined,
          nextContactDate: prospect.nextContactDate
            ? prospect.nextContactDate.toISOString().slice(0, 10)
            : undefined,
          notes: prospect.notes ?? undefined,
        }}
      />
    </div>
  );
}
