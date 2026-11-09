import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

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
  className,
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  fields?: { label: string; value: React.ReactNode }[];
  actions?: React.ReactNode;
  href?: string;
  className?: string;
}) {
  const main = (
    <>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="break-words text-base font-medium text-slate-900">{title}</p>
          {subtitle && <p className="break-words text-sm text-slate-500">{subtitle}</p>}
        </div>
        {href && <ChevronRight className="mt-0.5 h-5 w-5 shrink-0 text-slate-400" aria-hidden="true" />}
      </div>
      {fields && fields.length > 0 && (
        <dl className="mt-3 space-y-1.5 border-t border-slate-100 pt-3">
          {fields.map((f, i) => (
            <div key={i} className="flex items-start justify-between gap-3 text-sm">
              <dt className="shrink-0 text-slate-500">{f.label}</dt>
              <dd className="min-w-0 break-words text-right font-medium text-slate-900">
                {f.value}
              </dd>
            </div>
          ))}
        </dl>
      )}
    </>
  );

  // Os botões ficam fora do link: botão dentro de link é inválido e o toque vira navegação.
  return (
    <div className={cn("overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm", className)}>
      {href ? (
        <Link href={href} className="block p-4 active:bg-slate-50">
          {main}
        </Link>
      ) : (
        <div className="p-4">{main}</div>
      )}
      {actions && (
        <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 px-4 py-3">
          {actions}
        </div>
      )}
    </div>
  );
}

export function TableCardEmpty({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-400">
      {children}
    </div>
  );
}
