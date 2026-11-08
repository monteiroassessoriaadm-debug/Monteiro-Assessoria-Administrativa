"use client";

import { useState } from "react";
import { SlidersHorizontal, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Filtros de lista: no celular ficam numa gaveta que abre por um botão; no
 * computador aparecem normalmente na página.
 */
export function FilterDrawer({
  label = "Filtrar",
  children,
}: {
  label?: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button type="button" variant="outline" className="w-full md:hidden" onClick={() => setOpen(true)}>
        <SlidersHorizontal className="h-4 w-4" /> {label}
      </Button>

      {open && (
        <button
          type="button"
          aria-label="Fechar filtros"
          className="fixed inset-0 z-[60] cursor-default bg-black/50 md:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      <div
        className={cn(
          // Na gaveta, campos e botões ocupam a largura toda.
          "fixed inset-x-0 bottom-0 z-[70] max-h-[85dvh] overflow-y-auto rounded-t-2xl bg-white p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] shadow-2xl",
          "[&_button]:w-full [&_form>*]:w-full [&_form>*]:max-w-none [&_input]:w-full [&_select]:w-full",
          "md:static md:z-auto md:block md:max-h-none md:overflow-visible md:rounded-none md:bg-transparent md:p-0 md:shadow-none",
          "md:[&_button]:w-auto md:[&_form>*]:w-auto md:[&_form>*]:max-w-sm md:[&_input]:w-full md:[&_select]:w-auto",
          open ? "block" : "hidden",
        )}
      >
        <div className="mb-3 flex items-center justify-between md:hidden">
          <p className="text-base font-semibold text-slate-900">{label}</p>
          <button
            type="button"
            aria-label="Fechar filtros"
            onClick={() => setOpen(false)}
            className="inline-flex h-11 !w-11 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        {children}
      </div>
    </>
  );
}
