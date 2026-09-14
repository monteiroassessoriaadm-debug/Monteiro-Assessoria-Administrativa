import { prisma } from "@/lib/prisma";
import { LeadForm } from "../lead-form";
import { createLeadAction } from "../actions";

export default async function NovoLeadPage({
  searchParams,
}: {
  searchParams: Promise<{
    fromProspect?: string;
    name?: string;
    whatsapp?: string;
    instagram?: string;
    city?: string;
    serviceInterestId?: string;
  }>;
}) {
  const params = await searchParams;

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
      <LeadForm
        action={createLeadAction}
        services={services}
        users={users}
        fromProspectId={params.fromProspect}
        defaults={
          params.fromProspect
            ? {
                name: params.name,
                whatsapp: params.whatsapp,
                instagram: params.instagram,
                city: params.city,
                serviceInterestId: params.serviceInterestId,
              }
            : undefined
        }
      />
    </div>
  );
}
