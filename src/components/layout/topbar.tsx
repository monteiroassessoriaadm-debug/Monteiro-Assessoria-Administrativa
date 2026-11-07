"use client";

import { Search, Menu } from "lucide-react";
import { logoutAction } from "@/app/(app)/logout-action";
import { Badge } from "@/components/ui/badge";
import type { Role } from "@/generated/prisma/enums";

const roleLabels: Record<Role, string> = {
  ADMIN: "Administrador",
  GESTOR: "Gestor",
  BIA: "Bia / Mídia",
};

export function Topbar({
  name,
  role,
  onMenuClick,
}: {
  name: string;
  role: Role;
  onMenuClick?: () => void;
}) {
  return (
    <header className="flex h-14 shrink-0 items-center justify-between gap-2 border-b border-slate-200 bg-white px-3 md:h-16 md:px-6">
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <button
          type="button"
          onClick={onMenuClick}
          aria-label="Abrir menu"
          className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 md:hidden"
        >
          <Menu className="h-5 w-5" />
        </button>
        <form action="/busca" className="relative hidden w-full max-w-sm sm:block">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            name="q"
            placeholder="Buscar clientes, leads, serviços..."
            className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm text-slate-900 focus:border-slate-400 focus:bg-white focus:outline-none"
          />
        </form>
      </div>
      <div className="flex shrink-0 items-center gap-2 md:gap-3">
        <div className="hidden text-right sm:block">
          <p className="truncate text-sm font-medium text-slate-900">{name}</p>
          <Badge tone="blue">{roleLabels[role]}</Badge>
        </div>
        <form action={logoutAction}>
          <button
            type="submit"
            className="min-h-11 rounded-lg border border-slate-200 px-3 text-sm text-slate-600 hover:bg-slate-50 md:min-h-0 md:py-1.5"
          >
            Sair
          </button>
        </form>
      </div>
    </header>
  );
}
