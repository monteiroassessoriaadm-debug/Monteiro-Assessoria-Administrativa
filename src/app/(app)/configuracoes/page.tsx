import Link from "next/link";
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
      <Link
        href="/metas"
        className="flex min-h-11 items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm hover:bg-slate-50"
      >
        <span>
          <span className="block font-medium text-slate-900">Meta, salário mínimo e teto do MEI</span>
          <span className="block text-slate-500">Editar os valores de cada ano</span>
        </span>
        <span className="shrink-0 text-blue-700">Abrir →</span>
      </Link>
      <SettingsForm
        name={settings?.name ?? "Monteiro Assessoria Administrativa"}
        slogan={settings?.slogan ?? null}
        logoData={settings?.logoData ?? null}
        whatsapp={settings?.whatsapp ?? null}
        instagram={settings?.instagram ?? null}
        about={settings?.about ?? null}
      />
    </div>
  );
}
