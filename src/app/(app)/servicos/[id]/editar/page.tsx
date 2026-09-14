import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/permissions";
import { Role } from "@/generated/prisma/enums";
import { ServiceForm } from "../../service-form";
import { updateServiceAction } from "../../actions";

export default async function EditarServicoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireRole(Role.ADMIN, Role.GESTOR);
  const { id } = await params;
  const [service, users] = await Promise.all([
    prisma.service.findUnique({ where: { id } }),
    prisma.user.findMany({
      where: { active: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  if (!service) notFound();

  const boundAction = updateServiceAction.bind(null, id);

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Editar serviço</h1>
      </div>
      <ServiceForm
        action={boundAction}
        users={users}
        submitLabel="Salvar alterações"
        defaults={{
          name: service.name,
          category: service.category ?? undefined,
          description: service.description ?? undefined,
          defaultPrice: service.defaultPrice?.toString(),
          defaultTermDays: service.defaultTermDays?.toString(),
          checklistTemplate: service.checklistTemplate ?? undefined,
          defaultResponsibleId: service.defaultResponsibleId ?? undefined,
          active: service.active,
        }}
      />
    </div>
  );
}
