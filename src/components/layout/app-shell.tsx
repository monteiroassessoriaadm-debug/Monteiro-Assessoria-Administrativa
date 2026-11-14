"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { BottomNav, QuickAdd } from "@/components/layout/mobile-nav";
import type { Role } from "@/generated/prisma/enums";

export function AppShell({
  role,
  companyName,
  logoData,
  name,
  showPersonal = false,
  children,
}: {
  role: Role;
  companyName?: string;
  logoData?: string | null;
  name: string;
  showPersonal?: boolean;
  children: React.ReactNode;
}) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const pathname = usePathname();
  const [lastPathname, setLastPathname] = useState(pathname);

  // Fecha o menu ao navegar para outra página (ex.: botão voltar do celular),
  // ajustando o estado durante a renderização em vez de em um efeito.
  if (pathname !== lastPathname) {
    setLastPathname(pathname);
    setMobileNavOpen(false);
  }

  return (
    <div className="flex min-h-dvh bg-slate-100">
      <Sidebar
        role={role}
        companyName={companyName}
        logoData={logoData}
        mobileOpen={mobileNavOpen}
        onClose={() => setMobileNavOpen(false)}
        showPersonal={showPersonal}
      />
      <div className="flex min-h-dvh min-w-0 flex-1 flex-col">
        <Topbar name={name} role={role} onMenuClick={() => setMobileNavOpen(true)} />
        {/* Sem overflow-x-hidden: esconder a sobra cortaria o conteúdo em vez de resolver. */}
        <main className="min-w-0 flex-1 p-4 pb-[calc(6rem+env(safe-area-inset-bottom))] md:p-6">
          {children}
        </main>
      </div>
      <BottomNav role={role} onMore={() => setMobileNavOpen(true)} />
      <QuickAdd role={role} />
    </div>
  );
}
