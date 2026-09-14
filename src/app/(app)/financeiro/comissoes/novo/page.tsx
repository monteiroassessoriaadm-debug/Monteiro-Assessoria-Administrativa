import { requireRole } from "@/lib/permissions";
import { Role } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import { displayClientName } from "@/lib/client-display";
import { CommissionForm } from "../commission-form";
import { createCommissionAction } from "../actions";

export default async function NovaComissaoPage() {
  await requireRole(Role.ADMIN, Role.GESTOR);

  const [users, clients] = await Promise.all([
    prisma.user.findMany({
      where: { active: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.client.findMany({
      where: { status: "ATIVO" },
      select: { id: true, type: true, fullName: true, legalName: true, tradeName: true },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Novo lançamento de comissão</h1>
      </div>
      <CommissionForm
        action={createCommissionAction}
        users={users}
        clients={clients.map((c) => ({ id: c.id, label: displayClientName(c) }))}
      />
    </div>
  );
}
