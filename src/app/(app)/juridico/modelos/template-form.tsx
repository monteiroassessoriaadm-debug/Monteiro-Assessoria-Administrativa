"use client";

import { useActionState, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ContractFieldDef, ContractFieldType } from "@/lib/contract-render";
import { AUTO_TOKEN_LABELS } from "@/lib/contract-auto-tokens";
import type { JuridicoFormState } from "../actions";

type FieldRow = ContractFieldDef & { rowKey: string };

const TYPE_LABELS: Record<ContractFieldType, string> = {
  text: "Texto",
  textarea: "Texto longo",
  number: "Número",
  money: "Dinheiro",
  date: "Data",
  boolean: "Sim/não",
};

const rowKey = () => Math.random().toString(36).slice(2);

export type TemplateDefaults = Partial<{
  name: string;
  slug: string;
  kind: "CONTRATO" | "DOCUMENTO";
  category: string;
  description: string;
  content: string;
  fields: ContractFieldDef[];
}>;

export function TemplateForm({
  action,
  defaults,
  versionNote,
}: {
  action: (prev: JuridicoFormState, formData: FormData) => Promise<JuridicoFormState>;
  defaults?: TemplateDefaults;
  versionNote?: string;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const [fields, setFields] = useState<FieldRow[]>((defaults?.fields ?? []).map((f) => ({ ...f, rowKey: rowKey() })));

  const update = (key: string, patch: Partial<FieldRow>) =>
    setFields((prev) => prev.map((f) => (f.rowKey === key ? { ...f, ...patch } : f)));

  return (
    <form action={formAction} className="space-y-6">
      <input
        type="hidden"
        name="fieldsSchema"
        value={JSON.stringify(
          fields
            .filter((f) => f.key.trim())
            .map(({ key, label, type, required, default: def, hint }) => ({
              key: key.trim(),
              label,
              type,
              required,
              ...(def ? { default: def } : {}),
              ...(hint ? { hint } : {}),
            })),
        )}
      />

      {versionNote && <p className="rounded-lg bg-blue-50 px-3 py-2 text-sm text-blue-800">{versionNote}</p>}

      <Card>
        <CardHeader>
          <CardTitle>Modelo</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label htmlFor="name">Nome *</Label>
            <Input id="name" name="name" defaultValue={defaults?.name} />
          </div>
          <div>
            <Label htmlFor="slug">Chave (usada pelo Claude)</Label>
            <Input id="slug" name="slug" defaultValue={defaults?.slug} placeholder="criacao-site" />
          </div>
          <div>
            <Label htmlFor="kind">Tipo</Label>
            <Select id="kind" name="kind" defaultValue={defaults?.kind ?? "CONTRATO"}>
              <option value="CONTRATO">Contrato (MON-AAAA-NNN, com assinaturas)</option>
              <option value="DOCUMENTO">Documento (DOC-AAAA-NNN, sem assinaturas)</option>
            </Select>
          </div>
          <div>
            <Label htmlFor="category">Categoria</Label>
            <Input id="category" name="category" defaultValue={defaults?.category} />
          </div>
          <div>
            <Label htmlFor="description">Quando usar</Label>
            <Input id="description" name="description" defaultValue={defaults?.description} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Campos que se preenchem na hora</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-slate-500">
            Use a chave no texto como <code>{"{{chave}}"}</code>. Campos de dinheiro também geram{" "}
            <code>{"{{chave_extenso}}"}</code>. Os campos <code>servico_descricao</code>, <code>valor</code>,{" "}
            <code>forma_pagamento</code> e <code>prazo</code> vêm prontos do orçamento.
          </p>
          {fields.map((f) => (
            <div key={f.rowKey} className="grid grid-cols-1 gap-2 rounded-lg border border-slate-200 p-3 sm:grid-cols-12">
              <div className="sm:col-span-3">
                <Label>Chave</Label>
                <Input value={f.key} onChange={(e) => update(f.rowKey, { key: e.target.value.replace(/[^A-Za-z0-9_]/g, "_") })} />
              </div>
              <div className="sm:col-span-4">
                <Label>Nome no formulário</Label>
                <Input value={f.label} onChange={(e) => update(f.rowKey, { label: e.target.value })} />
              </div>
              <div className="sm:col-span-3">
                <Label>Tipo</Label>
                <Select value={f.type} onChange={(e) => update(f.rowKey, { type: e.target.value as ContractFieldType })}>
                  {Object.entries(TYPE_LABELS).map(([v, l]) => (
                    <option key={v} value={v}>
                      {l}
                    </option>
                  ))}
                </Select>
              </div>
              <label className="flex min-h-11 items-center gap-2 text-sm text-slate-600 sm:col-span-2 sm:mt-6">
                <input type="checkbox" checked={f.required} onChange={(e) => update(f.rowKey, { required: e.target.checked })} />
                Obrigatório
              </label>
              <div className="sm:col-span-6">
                <Label>Valor padrão</Label>
                <Input value={f.default ?? ""} onChange={(e) => update(f.rowKey, { default: e.target.value })} />
              </div>
              <div className="sm:col-span-5">
                <Label>Dica</Label>
                <Input value={f.hint ?? ""} onChange={(e) => update(f.rowKey, { hint: e.target.value })} />
              </div>
              <div className="flex items-end justify-end sm:col-span-1">
                <Button type="button" variant="ghost" size="sm" aria-label="Remover campo" onClick={() => setFields((p) => p.filter((x) => x.rowKey !== f.rowKey))}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setFields((p) => [...p, { rowKey: rowKey(), key: "", label: "", type: "text", required: false }])}
          >
            <Plus className="h-4 w-4" /> Adicionar campo
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Texto do modelo</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <details className="rounded-lg bg-slate-50 p-3 text-xs text-slate-600">
            <summary className="cursor-pointer font-medium">Campos automáticos e blocos condicionais</summary>
            <ul className="mt-2 grid grid-cols-1 gap-1 sm:grid-cols-2">
              {Object.entries(AUTO_TOKEN_LABELS).map(([k, l]) => (
                <li key={k}>
                  <code>{`{{${k}}}`}</code> — {l}
                </li>
              ))}
            </ul>
            <p className="mt-2">
              <code>[[PF]]...[[/PF]]</code> só entra para pessoa física (cláusulas do CDC); <code>[[PJ]]...[[/PJ]]</code> só
              para empresa; <code>[[se chave]]...[[/se]]</code> só quando o campo foi preenchido.
            </p>
          </details>
          <Textarea name="content" rows={28} className="font-mono text-xs" defaultValue={defaults?.content} />
        </CardContent>
      </Card>

      {state.error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>}

      <div className="flex justify-end">
        <Button type="submit" disabled={pending}>
          {pending ? "Salvando..." : "Salvar modelo"}
        </Button>
      </div>
    </form>
  );
}
