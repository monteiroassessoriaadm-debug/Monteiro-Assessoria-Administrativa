"use client";

import { useActionState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { saveGoalAction, saveYearConfigAction, type GoalFormState } from "./actions";

function Feedback({ state }: { state: GoalFormState }) {
  if (state.error) return <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>;
  if (state.success) return <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-800">{state.success}</p>;
  return null;
}

export function YearConfigForm({
  year,
  minimumWage,
  meiAnnualLimit,
}: {
  year: number;
  minimumWage: number;
  meiAnnualLimit: number;
}) {
  const [state, formAction, pending] = useActionState(saveYearConfigAction, {});
  return (
    <form action={formAction} className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div>
          <Label>Ano</Label>
          <Input name="year" type="number" inputMode="numeric" defaultValue={year} />
        </div>
        <div>
          <Label>Salário mínimo (R$)</Label>
          <Input name="minimumWage" type="number" inputMode="decimal" step="0.01" min="0" defaultValue={minimumWage.toFixed(2)} />
        </div>
        <div>
          <Label>Limite anual do MEI (R$)</Label>
          <Input name="meiAnnualLimit" type="number" inputMode="decimal" step="0.01" min="0" defaultValue={meiAnnualLimit.toFixed(2)} />
        </div>
      </div>
      <Feedback state={state} />
      <div className="flex justify-end">
        <Button type="submit" disabled={pending} className="w-full sm:w-auto">
          {pending ? "Salvando..." : "Salvar configuração"}
        </Button>
      </div>
    </form>
  );
}

export function GoalOverrideForm({ today }: { today: string }) {
  const [state, formAction, pending] = useActionState(saveGoalAction, {});
  return (
    <form action={formAction} className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div>
          <Label>Tipo</Label>
          <Select name="type" defaultValue="MENSAL">
            <option value="MENSAL">Mensal</option>
            <option value="SEMANAL">Semanal</option>
          </Select>
        </div>
        <div>
          <Label>Qualquer dia do período</Label>
          <Input name="date" type="date" defaultValue={today} />
        </div>
        <div>
          <Label>Valor (R$)</Label>
          <Input name="amount" type="number" inputMode="decimal" step="0.01" min="0" />
        </div>
      </div>
      <label className="flex min-h-11 items-center gap-2 text-sm text-slate-700">
        <input type="checkbox" name="automatic" className="h-5 w-5 rounded border-slate-300" />
        Voltar ao cálculo automático neste período
      </label>
      <Feedback state={state} />
      <div className="flex justify-end">
        <Button type="submit" disabled={pending} className="w-full sm:w-auto">
          {pending ? "Salvando..." : "Salvar meta"}
        </Button>
      </div>
    </form>
  );
}
