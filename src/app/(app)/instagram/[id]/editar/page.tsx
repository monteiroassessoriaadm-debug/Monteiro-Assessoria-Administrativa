import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/permissions";
import { Role } from "@/generated/prisma/enums";
import { InstagramMetricForm } from "../../metric-form";
import { updateInstagramMetricAction } from "../../actions";

export default async function EditarRegistroInstagramPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireRole(Role.ADMIN, Role.GESTOR, Role.BIA);
  const { id } = await params;
  const metric = await prisma.instagramMetric.findUnique({ where: { id } });

  if (!metric) notFound();

  const boundAction = updateInstagramMetricAction.bind(null, id);

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Editar registro — Instagram</h1>
      </div>
      <InstagramMetricForm
        action={boundAction}
        submitLabel="Salvar alterações"
        defaults={{
          date: metric.date.toISOString().slice(0, 10),
          followers: String(metric.followers),
          posts: String(metric.posts),
          likes: String(metric.likes),
          comments: String(metric.comments),
          shares: String(metric.shares),
          reach: String(metric.reach),
          profileVisits: String(metric.profileVisits),
          notes: metric.notes ?? undefined,
        }}
      />
    </div>
  );
}
