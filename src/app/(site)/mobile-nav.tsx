"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";

const LINKS = [
  { href: "/", label: "Início" },
  { href: "/sobre", label: "Quem Somos" },
  { href: "/nossos-servicos", label: "Serviços" },
  { href: "/contato", label: "Contato" },
];

export function MobileNav({ crmHref, crmLabel }: { crmHref: string; crmLabel: string }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="md:hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Fechar menu" : "Abrir menu"}
        className="flex h-10 w-10 items-center justify-center rounded-lg border border-white/15 text-neutral-200"
      >
        {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {open && (
        <div className="fixed inset-x-0 top-[65px] z-20 border-b border-white/10 bg-neutral-950 px-5 py-6">
          <nav className="flex flex-col gap-1">
            {LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="rounded-lg px-3 py-3 text-base font-medium text-neutral-200 hover:bg-white/5 hover:text-[#d4af37]"
              >
                {link.label}
              </Link>
            ))}
            <Link
              href={crmHref}
              onClick={() => setOpen(false)}
              className="mt-2 rounded-lg border border-[#d4af37]/40 px-3 py-3 text-center text-base font-medium text-[#d4af37]"
            >
              {crmLabel}
            </Link>
          </nav>
        </div>
      )}
    </div>
  );
}
