import { prisma } from "@/lib/prisma";
import { LeadForm } from "../lead-form";
import { createLeadAction } from "../actions";

export default async function NovoLeadPage() {
  const [services, users] = await Promise.all([
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

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Novo lead</h1>
      </div>
      <LeadForm action={createLeadAction} services={services} users={users} />
    </div>
  );
}
