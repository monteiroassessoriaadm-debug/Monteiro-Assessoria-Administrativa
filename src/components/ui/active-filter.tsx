import Link from "next/link";

/** Faixa "Mostrando: leads quentes · limpar filtro" no topo das listas. */
export function ActiveFilter({ label, clearHref }: { label?: string | null; clearHref: string }) {
  if (!label) return null;
  return (
    <p className="flex flex-wrap items-center gap-x-1.5 rounded-lg bg-blue-50 px-3 py-2 text-sm text-blue-900">
      <span>
        Mostrando: <strong className="font-semibold">{label}</strong>
      </span>
      <span aria-hidden="true">·</span>
      <Link href={clearHref} className="inline-flex min-h-11 items-center font-medium underline md:min-h-0">
        limpar filtro
      </Link>
    </p>
  );
}

/** "ENVIADO,AGUARDANDO_ASSINATURA" em ["ENVIADO", "AGUARDANDO_ASSINATURA"]. */
export function statusList(value: string | undefined) {
  return value ? value.split(",").filter(Boolean) : [];
}

/** Rótulos das opções escolhidas, juntos: "Enviado ou Aguardando assinatura". */
export function statusLabel(values: string[], labels: Record<string, string>) {
  return values.map((v) => labels[v] ?? v).join(" ou ");
}
