"use client";

import { useActionState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ProposalFormState } from "./actions";

type ProposalDefaults = Partial<{
  clientId: string;
  leadId: string;
  serviceId: string;
  demand: string;
  solution: string;
  scope: string;
  termText: string;
  investment: string;
  paymentTerms: string;
  validUntil: string;
  notes: string;
}>;

export function ProposalForm({
  action,
  clients,
  services,
  defaults,
  submitLabel = "Salvar proposta",
}: {
  action: (
    prevState: ProposalFormState,
    formData: FormData,
  ) => Promise<ProposalFormState>;
  clients: { id: string; label: string }[];
  services: { id: string; name: string }[];
  defaults?: ProposalDefaults;
  submitLabel?: string;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const fieldError = (name: string) => state.fieldErrors?.[name];

  return (
    <form action={formAction} className="space-y-6">
      {defaults?.leadId && <input type="hidden" name="leadId" value={defaults.leadId} />}

      <Card>
        <CardHeader>
          <CardTitle>Cliente e serviço</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <div>
            <Label>Cliente *</Label>
            <Select name="clientId" defaultValue={defaults?.clientId ?? ""}>
              <option value="">Selecione um cliente</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </Select>
            {fieldError("clientId") && (
              <p className="mt-1 text-xs text-red-600">{fieldError("clientId")}</p>
            )}
          </div>
          <div>
            <Label>Serviço</Label>
            <Select name="serviceId" defaultValue={defaults?.serviceId ?? ""}>
              <option value="">Não vinculado ao catálogo</option>
              {services.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Diagnóstico e solução</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Problema / demanda *</Label>
            <Textarea name="demand" rows={2} defaultValue={defaults?.demand} />
            {fieldError("demand") && (
              <p className="mt-1 text-xs text-red-600">{fieldError("demand")}</p>
            )}
          </div>
          <div>
            <Label>Solução proposta *</Label>
            <Textarea name="solution" rows={3} defaultValue={defaults?.solution} />
            {fieldError("solution") && (
              <p className="mt-1 text-xs text-red-600">{fieldError("solution")}</p>
            )}
          </div>
          <div>
            <Label>Escopo</Label>
            <Textarea name="scope" rows={2} defaultValue={defaults?.scope} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Investimento e prazo</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <div>
            <Label>Investimento (R$)</Label>
            <Input
              name="investment"
              type="number"
              step="0.01"
              min="0"
              defaultValue={defaults?.investment}
            />
            {fieldError("investment") && (
              <p className="mt-1 text-xs text-red-600">{fieldError("investment")}</p>
            )}
          </div>
          <div>
            <Label>Prazo</Label>
            <Input name="termText" placeholder="Ex.: 30 dias" defaultValue={defaults?.termText} />
          </div>
          <div>
            <Label>Forma de pagamento</Label>
            <Input name="paymentTerms" defaultValue={defaults?.paymentTerms} />
          </div>
          <div>
            <Label>Validade</Label>
            <Input type="date" name="validUntil" defaultValue={defaults?.validUntil} />
            {fieldError("validUntil") && (
              <p className="mt-1 text-xs text-red-600">{fieldError("validUntil")}</p>
            )}
          </div>
          <div className="col-span-2">
            <Label>Observações</Label>
            <Textarea name="notes" rows={2} defaultValue={defaults?.notes} />
          </div>
        </CardContent>
      </Card>

      {state.error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      )}

      <div className="flex justify-end">
        <Button type="submit" disabled={pending}>
          {pending ? "Salvando..." : submitLabel}
        </Button>
      </div>
    </form>
  );
}
