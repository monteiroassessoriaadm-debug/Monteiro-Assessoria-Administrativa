import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/permissions";
import { Role } from "@/generated/prisma/enums";
import { SettingsForm } from "./settings-form";

export default async function ConfiguracoesPage() {
  await requireRole(Role.ADMIN);

  const settings = await prisma.companySettings.findFirst();

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Gestão da Monteiro</h1>
        <p className="text-sm text-slate-500">
          Configurações da empresa. Novas seções (preços, permissões,
          automações, modelos) chegam nas próximas fases.
        </p>
      </div>
      <SettingsForm
        name={settings?.name ?? "Monteiro Assessoria Administrativa"}
        slogan={settings?.slogan ?? null}
        logoData={settings?.logoData ?? null}
      />
    </div>
  );
}
