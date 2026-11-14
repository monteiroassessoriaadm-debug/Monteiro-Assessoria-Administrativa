import { requirePfOwner } from "@/lib/pf/access";
import * as pf from "@/lib/pf/service";
import { moneyToInput } from "@/lib/money";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { PfForm } from "@/components/pf/pf-form";
import { Money, ProgressBar, dayBR, pctText } from "@/components/pf/pf-ui";
import { formatCurrencyBRL } from "@/lib/utils";
import { deleteGoalAction, depositGoalAction, saveGoalAction } from "../actions";

export const dynamic = "force-dynamic";

export default async function MetasPessoaisPage() {
  await requirePfOwner();
  const [goals, summary] = await Promise.all([pf.getGoalsProgress(), pf.getMonthSummary()]);
  const essenciais = summary.indicadores.mesesReserva.gastosEssenciaisMes;

  return (
    <div className="space-y-6">
      {goals.map((g) => (
        <Card key={g.id}>
          <CardHeader className="flex-wrap gap-2">
            <CardTitle className="flex items-center gap-2">
              {g.name}
              {g.emergency && <Badge tone="blue">fixa</Badge>}
              {g.done && <Badge tone="green">concluída</Badge>}
            </CardTitle>
            <span className="text-sm text-slate-600">{g.target > 0 ? pctText(g.percent) : "sem alvo"}</span>
          </CardHeader>
          <CardContent className="space-y-4">
            <ProgressBar value={g.percent} tone={g.percent >= 100 ? "green" : "slate"} className="h-3 [&>div]:bg-blue-600" />
            <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
              <div>
                <p className="text-xs text-slate-500">Já tenho</p>
                <Money value={g.current} className="font-semibold text-slate-900" />
              </div>
              <div>
                <p className="text-xs text-slate-500">Alvo</p>
                <Money value={g.target} className="font-semibold text-slate-900" />
              </div>
              <div>
                <p className="text-xs text-slate-500">Prazo</p>
                <span className="font-semibold text-slate-900">{dayBR(g.deadline)}</span>
              </div>
              <div>
                <p className="text-xs text-slate-500">Guardar por mês</p>
                <span className="font-semibold text-slate-900">
                  {g.suggestedMonthly === null ? "defina o prazo" : formatCurrencyBRL(g.suggestedMonthly)}
                </span>
              </div>
            </div>
            {g.emergency && essenciais > 0 && (
              <p className="rounded-lg bg-blue-50 px-3 py-2 text-sm text-blue-800">
                Seus gastos essenciais são cerca de {formatCurrencyBRL(essenciais)} por mês. O ideal é ter 6 meses guardados: {formatCurrencyBRL(essenciais * 6)}.
              </p>
            )}
            <PfForm action={depositGoalAction} compact submitLabel="Somar ao guardado" variant="secondary">
              <input type="hidden" name="id" value={g.id} />
              <Input name="amount" inputMode="decimal" placeholder="R$ (negativo retira)" className="w-44" aria-label="Valor" />
            </PfForm>
            <details className="rounded-lg border border-slate-200">
              <summary className="flex min-h-11 cursor-pointer items-center px-4 text-sm text-slate-600">Editar meta</summary>
              <div className="space-y-3 border-t border-slate-100 p-4">
                <PfForm action={saveGoalAction} keepValues>
                  <input type="hidden" name="id" value={g.id} />
                  <input type="hidden" name="doneField" value="1" />
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
                    {!g.emergency && (
                      <div>
                        <Label>Nome</Label>
                        <Input name="name" defaultValue={g.name} required />
                      </div>
                    )}
                    <div>
                      <Label>Valor-alvo (R$)</Label>
                      <Input name="target" inputMode="decimal" defaultValue={moneyToInput(g.target)} />
                    </div>
                    <div>
                      <Label>Quanto já tenho (R$)</Label>
                      <Input name="current" inputMode="decimal" defaultValue={moneyToInput(g.current)} />
                    </div>
                    <div>
                      <Label>Prazo</Label>
                      <Input name="deadline" type="date" defaultValue={g.deadline ?? ""} />
                    </div>
                  </div>
                  <label className="flex min-h-11 items-center gap-2 text-sm text-slate-700">
                    <input type="checkbox" name="done" defaultChecked={g.done} className="h-5 w-5 rounded border-slate-300" /> Meta concluída
                  </label>
                </PfForm>
                {!g.emergency && (
                  <PfForm action={deleteGoalAction} compact submitLabel="Excluir meta" variant="ghost" confirmText="Excluir esta meta?">
                    <input type="hidden" name="id" value={g.id} />
                  </PfForm>
                )}
              </div>
            </details>
          </CardContent>
        </Card>
      ))}

      <Card>
        <CardHeader>
          <CardTitle>Nova meta</CardTitle>
        </CardHeader>
        <CardContent>
          <PfForm action={saveGoalAction} submitLabel="Criar meta">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
              <div>
                <Label>Nome</Label>
                <Input name="name" placeholder="Ex.: Viagem, Carro, Curso" required />
              </div>
              <div>
                <Label>Valor-alvo (R$)</Label>
                <Input name="target" inputMode="decimal" required />
              </div>
              <div>
                <Label>Quanto já tenho (R$)</Label>
                <Input name="current" inputMode="decimal" placeholder="0,00" />
              </div>
              <div>
                <Label>Prazo</Label>
                <Input name="deadline" type="date" />
              </div>
            </div>
          </PfForm>
        </CardContent>
      </Card>
    </div>
  );
}
