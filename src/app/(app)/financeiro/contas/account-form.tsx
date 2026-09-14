"use client";

import { useActionState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import type { FinancialAccountFormState } from "./actions";

export function AccountForm({
  action,
}: {
  action: (
    prevState: FinancialAccountFormState,
    formData: FormData,
  ) => Promise<FinancialAccountFormState>;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (!state.error && !pending) {
      formRef.current?.reset();
    }
  }, [state, pending]);

  return (
    <form ref={formRef} action={formAction} className="flex flex-wrap items-end gap-3">
      <div>
        <Label>Nome da conta *</Label>
        <Input name="name" placeholder="Caixa, Banco X, Nubank PJ..." className="w-56" />
        {state.fieldErrors?.name && (
          <p className="mt-1 text-xs text-red-600">{state.fieldErrors.name}</p>
        )}
      </div>
      <div>
        <Label>Tipo</Label>
        <Input name="type" placeholder="Caixa, Conta bancária, Carteira digital..." className="w-56" />
      </div>
      <label className="mb-2 flex items-center gap-2 text-sm">
        <input type="checkbox" name="active" defaultChecked />
        Ativa
      </label>
      <Button type="submit" disabled={pending}>
        {pending ? "Salvando..." : "Adicionar conta"}
      </Button>
      {state.error && <p className="text-xs text-red-600">{state.error}</p>}
    </form>
  );
}
