"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import type { Role } from "@/generated/prisma/enums";

export function AppShell({
  role,
  companyName,
  logoData,
  name,
  children,
}: {
  role: Role;
  companyName?: string;
  logoData?: string | null;
  name: string;
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
      />
      <div className="flex min-h-dvh min-w-0 flex-1 flex-col">
        <Topbar name={name} role={role} onMenuClick={() => setMobileNavOpen(true)} />
        {/* Sem overflow-x-hidden: esconder a sobra cortaria o conteúdo em vez de resolver. */}
        <main className="min-w-0 flex-1 p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
