"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { createTransactionAction } from "../actions";
import type { PfState } from "@/components/pf/pf-form";

type Option = { id: string; name: string };

export function TransactionForm({
  today,
  categories,
  accounts,
  cards,
}: {
  today: string;
  categories: (Option & { type: "ENTRADA" | "SAIDA" })[];
  accounts: Option[];
  cards: Option[];
}) {
  const [state, formAction, pending] = useActionState<PfState, FormData>(createTransactionAction, {});
  const [type, setType] = useState<"ENTRADA" | "SAIDA">("SAIDA");
  const [target, setTarget] = useState(accounts[0] ? `conta:${accounts[0].id}` : cards[0] ? `cartao:${cards[0].id}` : "");
  const ref = useRef<HTMLFormElement>(null);
  const onCard = target.startsWith("cartao:");

  useEffect(() => {
    if (state.success) ref.current?.reset();
  }, [state.at, state.success]);

  if (accounts.length === 0 && cards.length === 0) {
    return (
      <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
        Cadastre primeiro uma conta ou carteira em <a className="underline" href="/financas-pessoais/contas">Contas e categorias</a>.
      </p>
    );
  }

  return (
    <form ref={ref} action={formAction} className="space-y-4">
      <div className="grid grid-cols-2 gap-2">
        {(["SAIDA", "ENTRADA"] as const).map((t) => (
          <label
            key={t}
            className={`flex min-h-11 cursor-pointer items-center justify-center rounded-lg border text-sm font-medium ${
              type === t ? (t === "ENTRADA" ? "border-emerald-600 bg-emerald-50 text-emerald-800" : "border-red-500 bg-red-50 text-red-700") : "border-slate-300 bg-white text-slate-600"
            }`}
          >
            <input
              type="radio"
              name="type"
              value={t}
              checked={type === t}
              onChange={() => {
                setType(t);
                if (t === "ENTRADA" && onCard && accounts[0]) setTarget(`conta:${accounts[0].id}`);
              }}
              className="sr-only"
            />
            {t === "ENTRADA" ? "Entrada" : "Saída"}
          </label>
        ))}
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <Label htmlFor="pf-amount">Valor (R$)</Label>
          <Input id="pf-amount" name="amount" inputMode="decimal" placeholder="0,00" required />
        </div>
        <div>
          <Label htmlFor="pf-date">Data</Label>
          <Input id="pf-date" name="date" type="date" defaultValue={today} required />
        </div>
        <div>
          <Label htmlFor="pf-cat">{type === "ENTRADA" ? "Fonte de renda" : "Categoria"}</Label>
          <Select id="pf-cat" name="categoryId" key={type} required>
            {categories
              .filter((c) => c.type === type)
              .map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="pf-target">Conta ou cartão</Label>
          <Select id="pf-target" name="target" value={target} onChange={(e) => setTarget(e.target.value)} required>
            {accounts.map((a) => (
              <option key={a.id} value={`conta:${a.id}`}>
                {a.name}
              </option>
            ))}
            {type === "SAIDA" &&
              cards.map((c) => (
                <option key={c.id} value={`cartao:${c.id}`}>
                  Cartão {c.name}
                </option>
              ))}
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_auto]">
        <div>
          <Label htmlFor="pf-desc">Descrição</Label>
          <Input id="pf-desc" name="description" placeholder="Ex.: Mercado do mês" required />
        </div>
        {onCard && (
          <div>
            <Label htmlFor="pf-inst">Parcelas</Label>
            <Input id="pf-inst" name="installments" type="number" min={1} max={48} defaultValue={1} inputMode="numeric" className="sm:w-28" />
          </div>
        )}
      </div>
      <div>
        <Label htmlFor="pf-notes">Observação (opcional)</Label>
        <Textarea id="pf-notes" name="notes" rows={2} />
      </div>
      {onCard && <p className="text-xs text-slate-500">No cartão, o valor total é dividido nas parcelas e cada uma cai na sua fatura.</p>}
      {state.error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>}
      {state.success && <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-800">{state.success} O comprovante pode ser anexado na lista abaixo.</p>}
      <div className="flex justify-end">
        <Button type="submit" disabled={pending} className="w-full sm:w-auto">
          {pending ? "Salvando..." : "Salvar lançamento"}
        </Button>
      </div>
    </form>
  );
}
