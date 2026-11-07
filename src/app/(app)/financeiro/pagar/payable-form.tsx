"use client";

import { useActionState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { PayableFormState } from "./actions";

export type PayableDefaults = {
  description: string;
  category: string;
  supplier: string;
  amount: string;
  dueDate: string;
  accountId: string;
  notes: string;
};

export function PayableForm({
  action,
  accounts,
  defaults,
  lockMoney,
  submitLabel = "Criar conta a pagar",
}: {
  action: (prevState: PayableFormState, formData: FormData) => Promise<PayableFormState>;
  accounts: { id: string; name: string }[];
  defaults?: PayableDefaults;
  lockMoney?: boolean;
  submitLabel?: string;
}) {
  const [state, formAction, pending] = useActionState(action, {});

  return (
    <form action={formAction} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Conta a pagar</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Descrição *</Label>
            <Input name="description" defaultValue={defaults?.description} />
            {state.fieldErrors?.description && (
              <p className="mt-1 text-xs text-red-600">{state.fieldErrors.description}</p>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label>Categoria</Label>
              <Input name="category" defaultValue={defaults?.category} />
            </div>
            <div>
              <Label>Fornecedor</Label>
              <Input name="supplier" defaultValue={defaults?.supplier} />
            </div>
            <div>
              <Label>Valor (R$) *</Label>
              <Input
                name="amount"
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0"
                defaultValue={defaults?.amount}
                disabled={lockMoney}
              />
              {state.fieldErrors?.amount && (
                <p className="mt-1 text-xs text-red-600">{state.fieldErrors.amount}</p>
              )}
            </div>
            <div>
              <Label>Vencimento</Label>
              <Input type="date" name="dueDate" defaultValue={defaults?.dueDate} disabled={lockMoney} />
            </div>
            <div>
              <Label>Conta</Label>
              <Select name="accountId" defaultValue={defaults?.accountId ?? ""}>
                <option value="">Não definida</option>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </Select>
            </div>
          </div>
          {lockMoney && (
            <p className="text-xs text-slate-500">
              Esta conta já foi paga: para corrigir o valor, estorne e lance de novo.
            </p>
          )}
          <div>
            <Label>Observações</Label>
            <Textarea name="notes" rows={2} defaultValue={defaults?.notes} />
          </div>
        </CardContent>
      </Card>

      {state.error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
      )}

      <div className="flex justify-end">
        <Button type="submit" disabled={pending} className="w-full sm:w-auto">
          {pending ? "Salvando..." : submitLabel}
        </Button>
      </div>
    </form>
  );
}
