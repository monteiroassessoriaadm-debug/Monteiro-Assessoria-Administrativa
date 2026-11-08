"use client";

import { useActionState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import type { FinancialAccountFormState } from "./actions";

export function AccountForm({
  action,
  isEdit = false,
  submitLabel,
  defaults,
}: {
  action: (
    prevState: FinancialAccountFormState,
    formData: FormData,
  ) => Promise<FinancialAccountFormState>;
  isEdit?: boolean;
  submitLabel?: string;
  defaults?: {
    name: string;
    type: string | null;
    active: boolean;
    openingBalance: string | null;
    openingBalanceAt: string | null;
  };
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (!isEdit && !state.error && !pending) {
      formRef.current?.reset();
    }
  }, [state, pending, isEdit]);

  return (
    <form ref={formRef} action={formAction} className="flex flex-col gap-3 md:flex-row md:flex-wrap md:items-end">
      <div>
        <Label>Nome da conta *</Label>
        <Input
          name="name"
          placeholder="Caixa, Banco X, Nubank PJ..."
          className="w-full md:w-56"
          defaultValue={defaults?.name}
        />
        {state.fieldErrors?.name && (
          <p className="mt-1 text-xs text-red-600">{state.fieldErrors.name}</p>
        )}
      </div>
      <div>
        <Label>Tipo</Label>
        <Input
          name="type"
          placeholder="Caixa, Conta bancária, Carteira digital..."
          className="w-full md:w-56"
          defaultValue={defaults?.type ?? undefined}
        />
      </div>
      <div>
        <Label>Saldo inicial</Label>
        <Input
          name="openingBalance"
          type="text"
          inputMode="decimal"
          placeholder="0,00"
          className="w-full md:w-32"
          defaultValue={defaults?.openingBalance ?? undefined}
        />
        {state.fieldErrors?.openingBalance && (
          <p className="mt-1 text-xs text-red-600">{state.fieldErrors.openingBalance}</p>
        )}
      </div>
      <div>
        <Label>Data do saldo inicial</Label>
        <Input
          name="openingBalanceAt"
          type="date"
          className="w-full md:w-40"
          defaultValue={defaults?.openingBalanceAt ?? undefined}
        />
      </div>
      <label className="flex min-h-11 items-center gap-2 text-sm md:mb-2 md:min-h-0">
        <input type="checkbox" name="active" defaultChecked={defaults?.active ?? true} />
        Ativa
      </label>
      <Button type="submit" disabled={pending}>
        {pending ? "Salvando..." : (submitLabel ?? "Adicionar conta")}
      </Button>
      {state.error && <p className="text-xs text-red-600">{state.error}</p>}
    </form>
  );
}
