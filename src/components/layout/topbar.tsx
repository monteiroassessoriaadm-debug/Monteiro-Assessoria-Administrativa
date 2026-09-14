import { Search } from "lucide-react";
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
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-6">
      <form action="/busca" className="relative w-full max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          type="search"
          name="q"
          placeholder="Buscar clientes, leads, serviços..."
          className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm text-slate-900 focus:border-slate-400 focus:bg-white focus:outline-none"
        />
      </form>
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
