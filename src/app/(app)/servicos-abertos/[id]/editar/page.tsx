import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { withCurrentOption } from "@/lib/options";
import { updateServiceInstanceAction } from "../../actions";
import { EditServiceInstanceForm } from "./form";

export default async function EditarServicoAbertoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [instance, activeUsers] = await Promise.all([
    prisma.serviceInstance.findUnique({ where: { id } }),
    prisma.user.findMany({
      where: { active: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  if (!instance) notFound();

  const currentResponsible = instance.responsibleId
    ? await prisma.user.findUnique({
        where: { id: instance.responsibleId },
        select: { id: true, name: true },
      })
    : null;
  const users = withCurrentOption(activeUsers, currentResponsible);

  const boundAction = updateServiceInstanceAction.bind(null, id);

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Editar serviço #{instance.number}</h1>
      </div>
      <EditServiceInstanceForm
        action={boundAction}
        users={users}
        defaults={{
          title: instance.title,
          responsibleId: instance.responsibleId ?? undefined,
          dueDate: instance.dueDate ? instance.dueDate.toISOString().slice(0, 10) : undefined,
          notes: instance.notes ?? undefined,
        }}
      />
    </div>
  );
}
