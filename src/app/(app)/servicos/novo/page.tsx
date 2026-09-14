import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/permissions";
import { Role } from "@/generated/prisma/enums";
import { ServiceForm } from "../service-form";
import { createServiceAction } from "../actions";

export default async function NovoServicoPage() {
  await requireRole(Role.ADMIN, Role.GESTOR);
  const users = await prisma.user.findMany({
    where: { active: true },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Novo serviço</h1>
      </div>
      <ServiceForm action={createServiceAction} users={users} />
    </div>
  );
}
