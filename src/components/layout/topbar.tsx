import { logoutAction } from "@/app/(app)/logout-action";
import { Badge } from "@/components/ui/badge";
import type { Role } from "@/generated/prisma/enums";

const roleLabels: Record<Role, string> = {
  ADMIN: "Administrador",
  GESTOR: "Gestor",
  BIA: "Bia / Mídia",
};

export function Topbar({ name, role }: { name: string; role: Role }) {
  return (
    <header className="flex h-16 shrink-0 items-center justify-end border-b border-slate-200 bg-white px-6">
      <div className="flex items-center gap-3">
        <div className="text-right">
          <p className="text-sm font-medium text-slate-900">{name}</p>
          <Badge tone="blue">{roleLabels[role]}</Badge>
        </div>
        <form action={logoutAction}>
          <button
            type="submit"
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50"
          >
            Sair
          </button>
        </form>
      </div>
    </header>
  );
}
