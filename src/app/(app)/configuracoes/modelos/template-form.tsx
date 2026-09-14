"use client";

import { useActionState, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CLIENT_TOKEN_KEYS, type TemplateFieldDef } from "@/lib/document-tokens";
import type { TemplateFormState } from "./actions";

type FieldRow = TemplateFieldDef & { rowKey: string };

function randomRowKey() {
  return Math.random().toString(36).slice(2);
}

function emptyField(): FieldRow {
  return { rowKey: randomRowKey(), key: "", label: "", type: "text", required: false };
}

function withRowKeys(fields: TemplateFieldDef[]): FieldRow[] {
  return fields.map((f) => ({ ...f, rowKey: randomRowKey() }));
}

type TemplateDefaults = Partial<{
  name: string;
  category: string;
  content: string;
  headerNote: string;
  footerNote: string;
  fields: TemplateFieldDef[];
}>;

export function TemplateForm({
  action,
  defaults,
  submitLabel = "Salvar modelo",
  versionNote,
}: {
  action: (prevState: TemplateFormState, formData: FormData) => Promise<TemplateFormState>;
  defaults?: TemplateDefaults;
  submitLabel?: string;
  versionNote?: string;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const [fields, setFields] = useState<FieldRow[]>(
    defaults?.fields && defaults.fields.length > 0 ? withRowKeys(defaults.fields) : [],
  );

  function updateField(rowKey: string, patch: Partial<FieldRow>) {
    setFields((prev) => prev.map((f) => (f.rowKey === rowKey ? { ...f, ...patch } : f)));
  }

  return (
    <form action={formAction} className="space-y-6">
      <input
        type="hidden"
        name="fieldsSchema"
        value={JSON.stringify(
          fields
            .filter((f) => f.key.trim())
            .map(({ key, label, type, required }) => ({
              key: key.trim().toUpperCase(),
              label,
              type,
              required,
            })),
        )}
      />

      {versionNote && (
        <p className="rounded-lg bg-blue-50 px-3 py-2 text-sm text-blue-700">{versionNote}</p>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Modelo</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <div>
            <Label>Nome do modelo *</Label>
            <Input name="name" defaultValue={defaults?.name} placeholder="Contrato de Prestação de Serviços" />
            {state.fieldErrors?.name && (
              <p className="mt-1 text-xs text-red-600">{state.fieldErrors.name}</p>
            )}
          </div>
          <div>
            <Label>Categoria</Label>
            <Input name="category" defaultValue={defaults?.category} placeholder="Prestação de serviços" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Campos dinâmicos deste modelo</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-xs text-slate-500">
            Preenchidos manualmente ao gerar o documento. Use a chave como{" "}
            <code>{"{{CHAVE}}"}</code> dentro do texto do modelo.
          </p>
          {state.fieldErrors?.fieldsSchema && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">
              {state.fieldErrors.fieldsSchema}
            </p>
          )}
          {fields.map((field) => (
            <div key={field.rowKey} className="grid grid-cols-12 items-end gap-2 rounded-lg border border-slate-200 p-3">
              <div className="col-span-3">
                <Label>Chave</Label>
                <Input
                  value={field.key}
                  onChange={(e) => updateField(field.rowKey, { key: e.target.value.toUpperCase() })}
                  placeholder="VALOR_TOTAL"
                />
              </div>
              <div className="col-span-4">
                <Label>Rótulo (exibido no formulário)</Label>
                <Input
                  value={field.label}
                  onChange={(e) => updateField(field.rowKey, { label: e.target.value })}
                  placeholder="Valor total"
                />
              </div>
              <div className="col-span-2">
                <Label>Tipo</Label>
                <Select
                  value={field.type}
                  onChange={(e) => updateField(field.rowKey, { type: e.target.value as TemplateFieldDef["type"] })}
                >
                  <option value="text">Texto</option>
                  <option value="textarea">Texto longo</option>
                  <option value="number">Número</option>
                  <option value="date">Data</option>
                </Select>
              </div>
              <div className="col-span-2 flex items-center gap-2 pb-2">
                <input
                  type="checkbox"
                  checked={field.required}
                  onChange={(e) => updateField(field.rowKey, { required: e.target.checked })}
                />
                <span className="text-sm text-slate-600">Obrigatório</span>
              </div>
              <div className="col-span-1 flex justify-end">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setFields((prev) => prev.filter((f) => f.rowKey !== field.rowKey))}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
          <Button type="button" variant="outline" size="sm" onClick={() => setFields((prev) => [...prev, emptyField()])}>
            <Plus className="h-4 w-4" /> Adicionar campo
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Conteúdo do documento</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg bg-slate-50 p-3 text-xs text-slate-500">
            <p className="mb-1 font-medium text-slate-600">Tokens automáticos do cliente:</p>
            <p className="font-mono">
              {CLIENT_TOKEN_KEYS.map((k) => `{{${k}}}`).join("  ")}
            </p>
            <p className="mt-2">
              Mais os campos dinâmicos definidos acima. O sistema não escreve cláusulas
              jurídicas — o texto abaixo deve ser definido pela administração da Monteiro.
            </p>
          </div>
          <div>
            <Label>Cabeçalho (opcional)</Label>
            <Textarea name="headerNote" rows={2} defaultValue={defaults?.headerNote} />
          </div>
          <div>
            <Label>Corpo do documento *</Label>
            <Textarea
              name="content"
              rows={16}
              className="font-mono text-xs"
              defaultValue={defaults?.content}
              placeholder={"CONTRATO DE PRESTAÇÃO DE SERVIÇOS\n\nCONTRATANTE: {{NOME_CLIENTE}}, {{DOCUMENTO_CLIENTE}}...\n\n[Cláusulas a serem definidas pela administração]"}
            />
            {state.fieldErrors?.content && (
              <p className="mt-1 text-xs text-red-600">{state.fieldErrors.content}</p>
            )}
          </div>
          <div>
            <Label>Rodapé (opcional)</Label>
            <Textarea name="footerNote" rows={2} defaultValue={defaults?.footerNote} />
          </div>
        </CardContent>
      </Card>

      {state.error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
      )}

      <div className="flex justify-end">
        <Button type="submit" disabled={pending}>
          {pending ? "Salvando..." : submitLabel}
        </Button>
      </div>
    </form>
  );
}
