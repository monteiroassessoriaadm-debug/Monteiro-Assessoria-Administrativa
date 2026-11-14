import { requirePfOwner } from "@/lib/pf/access";
import { currentMonth } from "@/lib/pf/service";
import { getClosing } from "@/lib/pf/fechamento";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MonthNav, monthParam } from "../month-nav";

export const dynamic = "force-dynamic";

type SP = Promise<Record<string, string | string[] | undefined>>;

function Rows({ rows }: { rows: { label: string; value: string; hint?: string }[] }) {
  return (
    <div className="divide-y divide-slate-100">
      {rows.map((r) => (
        <div key={r.label} className="flex flex-wrap items-baseline justify-between gap-2 py-2 text-sm">
          <span className="text-slate-700">
            {r.label}
            {r.hint && <span className="text-xs text-slate-500"> · {r.hint}</span>}
          </span>
          <span className="font-medium text-slate-900">{r.value}</span>
        </div>
      ))}
    </div>
  );
}

export default async function FechamentoPage({ searchParams }: { searchParams: SP }) {
  await requirePfOwner();
  const month = monthParam((await searchParams).mes, currentMonth());
  const c = await getClosing(month);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <MonthNav month={month} basePath="/financas-pessoais/fechamento" />
        <a
          href={`/financas-pessoais/fechamento/pdf?mes=${month}`}
          target="_blank"
          rel="noreferrer"
          className="inline-flex min-h-11 items-center rounded-lg bg-slate-900 px-4 text-sm font-medium text-white hover:bg-slate-800 md:min-h-10"
        >
          Exportar PDF
        </a>
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {c.boxes.map((b) => (
          <div key={b.label} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs text-slate-500">{b.label}</p>
            <p className="text-lg font-bold text-slate-900">{b.value}</p>
          </div>
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Indicadores</CardTitle>
          </CardHeader>
          <CardContent>
            <Rows rows={c.indicators} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Comparação com o mês anterior</CardTitle>
          </CardHeader>
          <CardContent>
            <Rows rows={c.comparison} />
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Gastos por categoria</CardTitle>
        </CardHeader>
        <CardContent>{c.categories.length ? <Rows rows={c.categories} /> : <p className="text-sm text-slate-400">Nenhum gasto no mês.</p>}</CardContent>
      </Card>
    </div>
  );
}
