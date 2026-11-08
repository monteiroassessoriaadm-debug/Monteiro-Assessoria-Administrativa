"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowDownCircle,
  ArrowUpCircle,
  CalendarDays,
  Home,
  Megaphone,
  Menu,
  Plus,
  Target,
  Wallet,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Role } from "@/generated/prisma/enums";

/** Com o teclado aberto, barras fixas tampariam o campo que está sendo digitado. */
function useTyping() {
  const [typing, setTyping] = useState(false);
  useEffect(() => {
    const isField = (t: EventTarget | null) =>
      t instanceof HTMLElement && t.matches("input:not([type=checkbox]):not([type=radio]):not([type=file]), textarea, select");
    const onIn = (e: FocusEvent) => isField(e.target) && setTyping(true);
    const onOut = (e: FocusEvent) => isField(e.target) && setTyping(false);
    document.addEventListener("focusin", onIn);
    document.addEventListener("focusout", onOut);
    return () => {
      document.removeEventListener("focusin", onIn);
      document.removeEventListener("focusout", onOut);
    };
  }, []);
  return typing;
}

export function BottomNav({ role, onMore }: { role: Role; onMore: () => void }) {
  const pathname = usePathname();
  const typing = useTyping();
  const canSeeFinance = role === "ADMIN" || role === "GESTOR";

  const items = [
    { href: "/dashboard", label: "Início", icon: Home, match: ["/dashboard"] },
    { href: "/agenda", label: "Agenda", icon: CalendarDays, match: ["/agenda"] },
    ...(canSeeFinance
      ? [{ href: "/financeiro/fluxo-caixa", label: "Financeiro", icon: Wallet, match: ["/financeiro"] }]
      : []),
    { href: "/midia", label: "Mídia", icon: Megaphone, match: ["/midia"] },
  ];

  if (typing) return null;

  return (
    <nav
      aria-label="Navegação principal"
      className="fixed inset-x-0 bottom-0 z-40 flex border-t border-slate-200 bg-white pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      {items.map((item) => {
        const active = item.match.some((m) => pathname === m || pathname.startsWith(m + "/"));
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 text-[11px] font-medium",
              active ? "text-blue-700" : "text-slate-500",
            )}
          >
            <Icon className="h-5 w-5" />
            {item.label}
          </Link>
        );
      })}
      <button
        type="button"
        onClick={onMore}
        className="flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 text-[11px] font-medium text-slate-500"
      >
        <Menu className="h-5 w-5" />
        Mais
      </button>
    </nav>
  );
}

/** Botão "+" com ações rápidas. Some nas telas de formulário, onde atrapalharia o salvar. */
export function QuickAdd({ role }: { role: Role }) {
  const pathname = usePathname();
  const typing = useTyping();
  const [open, setOpen] = useState(false);
  const [lastPathname, setLastPathname] = useState(pathname);

  if (pathname !== lastPathname) {
    setLastPathname(pathname);
    setOpen(false);
  }

  const canSeeFinance = role === "ADMIN" || role === "GESTOR";
  const actions = [
    { href: "/leads/novo", label: "Novo lead", icon: Target },
    ...(canSeeFinance
      ? [
          { href: "/financeiro/receber/novo", label: "Novo recebimento", icon: ArrowDownCircle },
          { href: "/financeiro/pagar/novo", label: "Nova despesa", icon: ArrowUpCircle },
        ]
      : []),
    { href: "/agenda/novo", label: "Novo evento", icon: CalendarDays },
    { href: "/midia/novo", label: "Novo conteúdo", icon: Megaphone },
  ];

  if (typing || /\/(novo|editar)(\/|$)/.test(pathname) || pathname === "/financeiro/ajustar-saldo") return null;

  return (
    <div className="md:hidden">
      {open && (
        <button
          type="button"
          aria-label="Fechar ações rápidas"
          className="fixed inset-0 z-40 cursor-default bg-black/40"
          onClick={() => setOpen(false)}
        />
      )}
      <div className="fixed right-4 z-50 flex flex-col items-end gap-2 bottom-[calc(4.5rem+env(safe-area-inset-bottom))]">
        {open &&
          actions.map((a) => {
            const Icon = a.icon;
            return (
              <Link
                key={a.href}
                href={a.href}
                className="flex min-h-11 items-center gap-2 rounded-full bg-white px-4 text-sm font-medium text-slate-800 shadow-lg"
              >
                <Icon className="h-4 w-4 text-slate-500" /> {a.label}
              </Link>
            );
          })}
        <button
          type="button"
          aria-label={open ? "Fechar ações rápidas" : "Ações rápidas"}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-900 text-white shadow-lg"
        >
          {open ? <X className="h-6 w-6" /> : <Plus className="h-6 w-6" />}
        </button>
      </div>
    </div>
  );
}
