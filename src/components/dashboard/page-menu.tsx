"use client";

import { useState } from "react";
import Link from "next/link";
import { FileDown, MoreHorizontal } from "lucide-react";

/** Menu "⋯" do topo do dashboard, para o PDF não ocupar espaço. */
export function DashboardMenu() {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative shrink-0">
      <button
        type="button"
        aria-label="Mais opções"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 md:h-10 md:w-10"
      >
        <MoreHorizontal className="h-5 w-5" />
      </button>
      {open && (
        <>
          <button type="button" aria-label="Fechar menu" className="fixed inset-0 z-30 cursor-default" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-40 mt-2 w-60 rounded-lg border border-slate-200 bg-white p-1 shadow-lg">
            <Link
              href="/relatorios/graficos/pdf"
              target="_blank"
              onClick={() => setOpen(false)}
              className="flex min-h-11 items-center gap-2 rounded-md px-3 text-sm text-slate-700 hover:bg-slate-50"
            >
              <FileDown className="h-4 w-4" /> Gerar relatório em PDF
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
