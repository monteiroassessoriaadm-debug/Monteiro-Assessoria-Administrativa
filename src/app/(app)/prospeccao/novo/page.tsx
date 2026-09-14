import { prisma } from "@/lib/prisma";
import { ProspectForm } from "../prospect-form";
import { createProspectAction } from "../actions";

export default async function NovaProspeccaoPage() {
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
        <h1 className="text-xl font-bold text-slate-900">Novo registro de prospecção</h1>
      </div>
      <ProspectForm action={createProspectAction} services={services} users={users} />
    </div>
  );
}
