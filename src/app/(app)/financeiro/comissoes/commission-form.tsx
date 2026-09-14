"use client";

import { useActionState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { commissionCategoryLabels } from "@/lib/lead-labels";
import type { CommissionFormState } from "./actions";

export function CommissionForm({
  action,
  users,
  clients,
}: {
  action: (prevState: CommissionFormState, formData: FormData) => Promise<CommissionFormState>;
  users: { id: string; name: string }[];
  clients: { id: string; label: string }[];
}) {
  const [state, formAction, pending] = useActionState(action, {});

  return (
    <form action={formAction} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Lançamento de comissão / pagamento</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Usuário *</Label>
              <Select name="userId" defaultValue="">
                <option value="" disabled>
                  Selecione
                </option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </Select>
              {state.fieldErrors?.userId && (
                <p className="mt-1 text-xs text-red-600">{state.fieldErrors.userId}</p>
              )}
            </div>
            <div>
              <Label>Categoria *</Label>
              <Select name="category" defaultValue="COMISSAO">
                {Object.entries(commissionCategoryLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label>Cliente / serviço relacionado</Label>
              <Select name="clientId" defaultValue="">
                <option value="">Nenhum</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label>Data</Label>
              <Input type="date" name="date" />
            </div>
            <div>
              <Label>Valor base (R$)</Label>
              <Input name="baseAmount" type="number" step="0.01" min="0" />
            </div>
            <div>
              <Label>Percentual (%)</Label>
              <Input name="percentage" type="number" step="0.01" min="0" />
            </div>
            <div>
              <Label>Valor final (R$) *</Label>
              <Input name="amount" type="number" step="0.01" min="0" />
              {state.fieldErrors?.amount && (
                <p className="mt-1 text-xs text-red-600">{state.fieldErrors.amount}</p>
              )}
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
          {pending ? "Salvando..." : "Criar lançamento"}
        </Button>
      </div>
    </form>
  );
}
