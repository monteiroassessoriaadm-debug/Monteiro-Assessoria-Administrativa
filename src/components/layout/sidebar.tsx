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
  FileStack,
  Briefcase,
  UserCog,
  Settings,
  ClipboardList,
  CheckSquare,
  CalendarDays,
  Wallet,
  ArrowDownCircle,
  ArrowUpCircle,
  PiggyBank,
  LineChart,
  Megaphone,
  MessageCircle,
  Sparkles,
  BarChart3,
  Camera,
  Goal,
  History,
  X,
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
    items: [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { href: "/metas", label: "Metas", icon: Goal, roles: ["ADMIN", "GESTOR"] },
      { href: "/assistente", label: "Monteiro IA", icon: Sparkles },
    ],
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
      { href: "/documentos", label: "Documentos", icon: FileStack },
    ],
  },
  {
    label: "Operacional",
    items: [
      { href: "/servicos-abertos", label: "Serviços em andamento", icon: ClipboardList },
      { href: "/midia", label: "Mídia", icon: Megaphone },
      { href: "/instagram", label: "Instagram", icon: Camera },
      { href: "/tarefas", label: "Tarefas", icon: CheckSquare },
      { href: "/agenda", label: "Agenda", icon: CalendarDays },
    ],
  },
  {
    label: "Financeiro",
    items: [
      {
        href: "/financeiro/receber",
        label: "Contas a receber",
        icon: ArrowDownCircle,
        roles: ["ADMIN", "GESTOR"],
      },
      {
        href: "/financeiro/pagar",
        label: "Contas a pagar",
        icon: ArrowUpCircle,
        roles: ["ADMIN", "GESTOR"],
      },
      {
        href: "/financeiro/comissoes",
        label: "Comissões",
        icon: PiggyBank,
        roles: ["ADMIN", "GESTOR"],
      },
      {
        href: "/financeiro/fluxo-caixa",
        label: "Fluxo de caixa",
        icon: LineChart,
        roles: ["ADMIN", "GESTOR"],
      },
      {
        href: "/financeiro/contas",
        label: "Contas bancárias",
        icon: Wallet,
        roles: ["ADMIN", "GESTOR"],
      },
      {
        href: "/relatorios",
        label: "Relatórios",
        icon: BarChart3,
        roles: ["ADMIN", "GESTOR"],
      },
    ],
  },
  {
    label: "Gestão",
    items: [
      { href: "/servicos", label: "Serviços", icon: Briefcase },
      { href: "/usuarios", label: "Usuários", icon: UserCog, roles: ["ADMIN"] },
      {
        href: "/configuracoes/modelos",
        label: "Modelos de documentos",
        icon: FileStack,
        roles: ["ADMIN"],
      },
      {
        href: "/whatsapp/modelos",
        label: "Modelos de WhatsApp",
        icon: MessageCircle,
        roles: ["ADMIN", "GESTOR"],
      },
      { href: "/historico", label: "Histórico", icon: History, roles: ["ADMIN", "GESTOR"] },
      {
        href: "/configuracoes",
        label: "Configurações",
        icon: Settings,
        roles: ["ADMIN"],
      },
    ],
  },
];

export function Sidebar({
  role,
  companyName,
  logoData,
  mobileOpen = false,
  onClose,
}: {
  role: Role;
  companyName?: string;
  logoData?: string | null;
  mobileOpen?: boolean;
  onClose?: () => void;
}) {
  const pathname = usePathname();

  return (
    <>
      {/* Fundo escuro atrás do menu, só no celular, fecha ao tocar fora */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex h-dvh w-72 max-w-[85vw] shrink-0 flex-col overflow-y-auto bg-slate-950 text-slate-200 transition-transform duration-200 ease-out",
          "md:sticky md:top-0 md:z-auto md:w-60 md:max-w-none md:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex items-center justify-between px-5 py-6">
          {logoData ? (
            // eslint-disable-next-line @next/next/no-img-element -- data URI logo uploaded by the admin, no fixed dimensions
            <img src={logoData} alt={companyName ?? "Logo"} className="h-10 max-w-full object-contain" />
          ) : (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">
                Monteiro
              </p>
              <p className="text-lg font-bold text-white">Monteiro CRM</p>
            </div>
          )}
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar menu"
            className="inline-flex h-11 w-11 items-center justify-center rounded-lg text-slate-400 hover:bg-white/5 hover:text-white md:hidden"
          >
            <X className="h-5 w-5" />
          </button>
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
                        onClick={onClose}
                        className={cn(
                          "flex min-h-11 items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors md:min-h-0 md:py-2",
                          active
                            ? "bg-white/10 text-white"
                            : "text-slate-400 hover:bg-white/5 hover:text-white",
                        )}
                      >
                        <Icon className="h-4 w-4 shrink-0" />
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
    </>
  );
}
