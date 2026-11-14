import { requirePfOwner } from "@/lib/pf/access";
import * as pf from "@/lib/pf/service";
import { moneyToInput } from "@/lib/money";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PfForm } from "@/components/pf/pf-form";
import { Money, ProgressBar, pctText } from "@/components/pf/pf-ui";
import { MonthNav, monthParam } from "../month-nav";
import { setBudgetAction } from "../actions";

export const dynamic = "force-dynamic";

type SP = Promise<Record<string, string | string[] | undefined>>;

export default async function OrcamentoPage({ searchParams }: { searchParams: SP }) {
  await requirePfOwner();
  const month = monthParam((await searchParams).mes, pf.currentMonth());
  const [status, categories] = await Promise.all([pf.getBudgetStatus(month), pf.listCategories("SAIDA")]);
  const totalLimit = status.reduce((s, b) => s + b.limit, 0);
  const totalSpent = status.reduce((s, b) => s + b.spent, 0);

  return (
    <Card>
      <CardHeader className="flex-wrap gap-3">
        <MonthNav month={month} basePath="/financas-pessoais/orcamento" />
        <span className="text-sm text-slate-600">
          Gasto <Money value={totalSpent} className="font-semibold text-slate-900" /> de <Money value={totalLimit} />
        </span>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-slate-500">
          O limite vale deste mês em diante, até você mudar. Barra verde; amarela a partir de 80%; vermelha quando estoura. Deixe 0 para não controlar a categoria.
        </p>
        <div className="space-y-4">
          {categories.map((c) => {
            const b = status.find((s) => s.categoryId === c.id);
            return (
              <div key={c.id} className="rounded-lg border border-slate-100 p-3">
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <span className="font-medium text-slate-900">{c.name}</span>
                  <span className="text-sm text-slate-500">
                    <Money value={b?.spent ?? 0} className="font-medium text-slate-900" />
                    {b && b.limit > 0 ? (
                      <>
                        {" "}
                        de <Money value={b.limit} /> · {pctText(b.percent)}
                      </>
                    ) : (
                      " · sem limite"
                    )}
                  </span>
                </div>
                {b && b.limit > 0 && <ProgressBar value={b.percent ?? 0} tone={b.tone} />}
                <PfForm action={setBudgetAction} compact keepValues submitLabel="Salvar limite" variant="outline" className="mt-2">
                  <input type="hidden" name="categoryId" value={c.id} />
                  <input type="hidden" name="month" value={month} />
                  <Input name="limit" inputMode="decimal" defaultValue={b?.limit ? moneyToInput(b.limit) : ""} placeholder="Limite R$" className="w-36" aria-label={`Limite de ${c.name}`} />
                </PfForm>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
