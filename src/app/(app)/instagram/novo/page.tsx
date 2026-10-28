import { requireRole } from "@/lib/permissions";
import { Role } from "@/generated/prisma/enums";
import { InstagramMetricForm } from "../metric-form";
import { createInstagramMetricAction } from "../actions";

export default async function NovoRegistroInstagramPage() {
  await requireRole(Role.ADMIN, Role.GESTOR, Role.BIA);
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Novo registro — Instagram</h1>
        <p className="text-sm text-slate-500">
          Registre os números do perfil hoje para alimentar os gráficos de crescimento.
        </p>
      </div>
      <InstagramMetricForm action={createInstagramMetricAction} defaults={{ date: today }} />
    </div>
  );
}
