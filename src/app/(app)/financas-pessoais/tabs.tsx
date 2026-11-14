"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const BASE = "/financas-pessoais";
const TABS = [
  { href: BASE, label: "Painel" },
  { href: `${BASE}/lancamentos`, label: "Lançamentos" },
  { href: `${BASE}/contas-fixas`, label: "Contas fixas" },
  { href: `${BASE}/cartoes`, label: "Cartões" },
  { href: `${BASE}/dividas`, label: "Dívidas" },
  { href: `${BASE}/orcamento`, label: "Orçamento" },
  { href: `${BASE}/metas`, label: "Metas" },
  { href: `${BASE}/investimentos`, label: "Investimentos" },
  { href: `${BASE}/fechamento`, label: "Fechamento" },
  { href: `${BASE}/contas`, label: "Contas e categorias" },
];

export function PfTabs() {
  const pathname = usePathname();
  return (
    <nav aria-label="Seções das Finanças Pessoais" className="-mx-4 overflow-x-auto px-4 md:mx-0 md:px-0">
      <div className="flex w-max gap-1.5">
        {TABS.map((t) => {
          const active = t.href === BASE ? pathname === BASE : pathname === t.href || pathname.startsWith(t.href + "/");
          return (
            <Link
              key={t.href}
              href={t.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex min-h-11 shrink-0 items-center rounded-lg px-3 text-sm font-medium md:min-h-9",
                active ? "bg-slate-900 text-white" : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50",
              )}
            >
              {t.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
