import Link from "next/link";

/**
 * Lista de cartões usada no celular como alternativa às tabelas (que só
 * aparecem a partir do breakpoint md). Cada página monta um TableCard por
 * linha, reaproveitando os mesmos dados já buscados para a tabela.
 */
export function TableCardList({ children }: { children: React.ReactNode }) {
  return <div className="space-y-3 md:hidden">{children}</div>;
}

export function TableCard({
  title,
  subtitle,
  fields,
  actions,
  href,
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  fields?: { label: string; value: React.ReactNode }[];
  actions?: React.ReactNode;
  href?: string;
}) {
  const body = (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="min-w-0">
        <p className="truncate text-base font-medium text-slate-900">{title}</p>
        {subtitle && <p className="truncate text-sm text-slate-500">{subtitle}</p>}
      </div>
      {fields && fields.length > 0 && (
        <dl className="mt-3 space-y-1.5 border-t border-slate-100 pt-3">
          {fields.map((f, i) => (
            <div key={i} className="flex items-center justify-between gap-3 text-sm">
              <dt className="shrink-0 text-slate-500">{f.label}</dt>
              <dd className="min-w-0 truncate text-right font-medium text-slate-900">
                {f.value}
              </dd>
            </div>
          ))}
        </dl>
      )}
      {actions && (
        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
          {actions}
        </div>
      )}
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="block active:bg-slate-50">
        {body}
      </Link>
    );
  }
  return body;
}

export function TableCardEmpty({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-400">
      {children}
    </div>
  );
}
