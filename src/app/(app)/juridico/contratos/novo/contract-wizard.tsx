"use client";

import Link from "next/link";
import { useActionState, useMemo, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ContractFieldDef } from "@/lib/contract-render";
import { ContractFields } from "../../contract-fields";
import type { JuridicoFormState } from "../../actions";

export type WizardClient = { id: string; label: string; missing: string[] };
export type WizardTemplate = {
  id: string;
  slug: string | null;
  name: string;
  kind: "CONTRATO" | "DOCUMENTO";
  description: string | null;
  version: number;
  fields: ContractFieldDef[];
};
export type WizardQuote = {
  id: string;
  clientId: string;
  label: string;
  approved: boolean;
  prefill: Record<string, string>;
  suggestedSlug: string;
};

const PREFILL_KEYS = ["servico_descricao", "valor", "forma_pagamento", "prazo"];

function startValues(template: WizardTemplate | null, quote: WizardQuote | null) {
  if (!template) return {};
  const out: Record<string, string> = {};
  for (const f of template.fields) {
    const fromQuote = quote && PREFILL_KEYS.includes(f.key) ? quote.prefill[f.key] : undefined;
    out[f.key] = fromQuote ?? f.default ?? "";
  }
  return out;
}

export function ContractWizard({
  action,
  clients,
  templates,
  quotes,
  defaults,
}: {
  action: (prev: JuridicoFormState, formData: FormData) => Promise<JuridicoFormState>;
  clients: WizardClient[];
  templates: WizardTemplate[];
  quotes: WizardQuote[];
  defaults: { clientId?: string; quoteId?: string; templateSlug?: string };
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const initialQuote = quotes.find((q) => q.id === defaults.quoteId) ?? null;
  const initialTemplate =
    templates.find((t) => t.slug === (defaults.templateSlug ?? initialQuote?.suggestedSlug)) ?? null;

  const [clientId, setClientId] = useState(defaults.clientId ?? initialQuote?.clientId ?? "");
  const [quoteId, setQuoteId] = useState(initialQuote?.id ?? "");
  const [templateId, setTemplateId] = useState(initialTemplate?.id ?? "");
  const [values, setValues] = useState<Record<string, string>>(() => startValues(initialTemplate, initialQuote));

  const client = clients.find((c) => c.id === clientId) ?? null;
  const template = templates.find((t) => t.id === templateId) ?? null;
  const quote = quotes.find((q) => q.id === quoteId) ?? null;
  const clientQuotes = useMemo(() => quotes.filter((q) => q.clientId === clientId), [quotes, clientId]);
  const blocked = template?.kind === "CONTRATO" && client && client.missing.length > 0;

  function pickClient(id: string) {
    setClientId(id);
    setQuoteId("");
    setValues(startValues(template, null));
  }

  function pickQuote(id: string) {
    const q = quotes.find((x) => x.id === id) ?? null;
    setQuoteId(id);
    let t = template;
    if (q && !t) {
      t = templates.find((x) => x.slug === q.suggestedSlug) ?? null;
      if (t) setTemplateId(t.id);
    }
    setValues(startValues(t, q));
  }

  function pickTemplate(id: string) {
    const t = templates.find((x) => x.id === id) ?? null;
    setTemplateId(id);
    setValues(startValues(t, quote));
  }

  return (
    <form action={formAction} className="space-y-6">
      <input type="hidden" name="values" value={JSON.stringify(values)} />
      <input type="hidden" name="quoteId" value={quoteId} />

      <Card>
        <CardHeader>
          <CardTitle>1. Cliente e orçamento</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="clientId">Cliente *</Label>
            <Select id="clientId" name="clientId" value={clientId} onChange={(e) => pickClient(e.target.value)}>
              <option value="">Selecione um cliente</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </Select>
          </div>
          {clientId && (
            <div>
              <Label htmlFor="quote">Orçamento (opcional)</Label>
              <Select id="quote" value={quoteId} onChange={(e) => pickQuote(e.target.value)}>
                <option value="">Sem orçamento ligado</option>
                {clientQuotes.map((q) => (
                  <option key={q.id} value={q.id}>
                    {q.label}
                  </option>
                ))}
              </Select>
              <p className="mt-1 text-xs text-slate-500">
                O orçamento preenche descrição, valor, forma de pagamento e prazo, e liga as contas a receber dele ao contrato.
              </p>
            </div>
          )}
          {client && client.missing.length > 0 && (
            <div className="flex gap-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <p>
                Para gerar contrato faltam no cadastro: <strong>{client.missing.join(", ")}</strong>.{" "}
                <Link href={`/clientes/${client.id}/editar`} className="font-medium underline">
                  Completar cadastro
                </Link>
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {clientId && (
        <Card>
          <CardHeader>
            <CardTitle>2. Modelo</CardTitle>
          </CardHeader>
          <CardContent>
            <Label htmlFor="templateId">Modelo *</Label>
            <Select id="templateId" name="templateId" value={templateId} onChange={(e) => pickTemplate(e.target.value)}>
              <option value="">Selecione um modelo</option>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} (v{t.version})
                </option>
              ))}
            </Select>
            {template?.description && <p className="mt-2 text-sm text-slate-500">{template.description}</p>}
          </CardContent>
        </Card>
      )}

      {template && (
        <Card>
          <CardHeader>
            <CardTitle>3. Revisar os dados do contrato</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="title">Título</Label>
              <Input id="title" name="title" placeholder={template.name} />
            </div>
            <ContractFields
              fields={template.fields}
              values={values}
              onChange={(k, v) => setValues((prev) => ({ ...prev, [k]: v }))}
              fromQuote={quote ? Object.keys(quote.prefill) : []}
            />
            <div>
              <Label htmlFor="notes">Observações internas</Label>
              <Textarea id="notes" name="notes" rows={2} placeholder="Não aparecem no contrato." />
            </div>
          </CardContent>
        </Card>
      )}

      {state.error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>}

      {template && (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
          <p className="text-xs text-slate-500 sm:mr-auto">
            O contrato é salvo como rascunho. Você confere o texto e o PDF antes de enviar ao cliente.
          </p>
          <Button type="submit" disabled={pending || Boolean(blocked)}>
            {pending ? "Gerando..." : "Gerar contrato"}
          </Button>
        </div>
      )}
    </form>
  );
}
