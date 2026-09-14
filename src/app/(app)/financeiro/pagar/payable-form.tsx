"use client";

import { useActionState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { PayableFormState } from "./actions";

export function PayableForm({
  action,
  accounts,
}: {
  action: (prevState: PayableFormState, formData: FormData) => Promise<PayableFormState>;
  accounts: { id: string; name: string }[];
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
            <Input name="description" />
            {state.fieldErrors?.description && (
              <p className="mt-1 text-xs text-red-600">{state.fieldErrors.description}</p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Categoria</Label>
              <Input name="category" />
            </div>
            <div>
              <Label>Fornecedor</Label>
              <Input name="supplier" />
            </div>
            <div>
              <Label>Valor (R$) *</Label>
              <Input name="amount" type="number" step="0.01" min="0" />
              {state.fieldErrors?.amount && (
                <p className="mt-1 text-xs text-red-600">{state.fieldErrors.amount}</p>
              )}
            </div>
            <div>
              <Label>Vencimento</Label>
              <Input type="date" name="dueDate" />
            </div>
            <div>
              <Label>Conta</Label>
              <Select name="accountId" defaultValue="">
                <option value="">Não definida</option>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </Select>
            </div>
          </div>
          <div>
            <Label>Observações</Label>
            <Textarea name="notes" rows={2} />
          </div>
        </CardContent>
      </Card>

      {state.error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
      )}

      <div className="flex justify-end">
        <Button type="submit" disabled={pending}>
          {pending ? "Salvando..." : "Criar conta a pagar"}
        </Button>
      </div>
    </form>
  );
}
