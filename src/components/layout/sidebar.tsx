"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Target,
  Kanban,
  Search,
  FileText,
  FileSignature,
  Briefcase,
  UserCog,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Role } from "@/generated/prisma/enums";

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  roles?: Role[];
};

type NavGroup = {
  label: string;
  items: NavItem[];
};

const navGroups: NavGroup[] = [
  {
    label: "Visão geral",
    items: [{ href: "/dashboard", label: "Dashboard", icon: LayoutDashboard }],
  },
  {
    label: "Comercial",
    items: [
      { href: "/clientes", label: "Clientes", icon: Users },
      { href: "/prospeccao", label: "Prospecção", icon: Search },
      { href: "/leads", label: "Leads", icon: Target },
      { href: "/funil", label: "Funil", icon: Kanban },
      { href: "/orcamentos", label: "Orçamentos", icon: FileText },
      { href: "/propostas", label: "Propostas", icon: FileSignature },
    ],
  },
  {
    label: "Gestão",
    items: [
      { href: "/servicos", label: "Serviços", icon: Briefcase },
      { href: "/usuarios", label: "Usuários", icon: UserCog, roles: ["ADMIN"] },
      {
        href: "/configuracoes",
        label: "Configurações",
        icon: Settings,
        roles: ["ADMIN"],
      },
    ],
  },
];

export function Sidebar({ role }: { role: Role }) {
  const pathname = usePathname();

  return (
    <aside className="flex h-screen w-60 shrink-0 flex-col overflow-y-auto bg-slate-950 text-slate-200">
      <div className="px-5 py-6">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">
          Monteiro
        </p>
        <p className="text-lg font-bold text-white">Monteiro CRM</p>
      </div>
      <nav className="flex-1 space-y-5 px-3">
        {navGroups.map((group) => {
          const items = group.items.filter(
            (item) => !item.roles || item.roles.includes(role),
          );
          if (items.length === 0) return null;
          return (
            <div key={group.label}>
              <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-widest text-slate-600">
                {group.label}
              </p>
              <div className="space-y-1">
                {items.map((item) => {
                  const Icon = item.icon;
                  const active =
                    pathname === item.href || pathname.startsWith(item.href + "/");
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                        active
                          ? "bg-white/10 text-white"
                          : "text-slate-400 hover:bg-white/5 hover:text-white",
                      )}
                    >
                      <Icon className="h-4 w-4" />
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>
      <div className="px-5 py-4 text-[11px] text-slate-500">
        A Monteiro Resolve.
      </div>
    </aside>
  );
}
