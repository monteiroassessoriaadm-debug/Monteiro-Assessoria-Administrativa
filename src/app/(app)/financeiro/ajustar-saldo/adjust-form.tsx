"use client";

import { useActionState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { formatCurrencyBRL } from "@/lib/utils";
import { adjustBalanceAction } from "./actions";

export function AdjustBalanceForm({
  accounts,
  defaultAccountId,
}: {
  accounts: { id: string; name: string; current: number }[];
  defaultAccountId?: string;
}) {
  const [state, formAction, pending] = useActionState(adjustBalanceAction, {});

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <Label>Conta e saldo no sistema</Label>
        <Select name="accountId" defaultValue={defaultAccountId ?? accounts[0]?.id ?? ""}>
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}: {formatCurrencyBRL(a.current)}
            </option>
          ))}
        </Select>
      </div>
      <div>
        <Label>Quanto tem na conta de verdade hoje? (R$)</Label>
        <Input name="realBalance" type="text" inputMode="decimal" placeholder="950,00" autoComplete="off" />
      </div>
      <div>
        <Label>Motivo (opcional)</Label>
        <Textarea name="reason" rows={2} placeholder="Ex.: conferido com o extrato do banco" />
      </div>

      {state.error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>}
      {state.success && <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-800">{state.success}</p>}

      <div className="flex justify-end">
        <Button type="submit" disabled={pending} className="w-full sm:w-auto">
          {pending ? "Salvando..." : "Salvar ajuste"}
        </Button>
      </div>
    </form>
  );
}
