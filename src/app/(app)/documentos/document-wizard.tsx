"use client";

import { useActionState, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CLIENT_TOKEN_KEYS, type TemplateFieldDef } from "@/lib/document-tokens";
import type { GenerateDocumentFormState } from "./actions";

type TemplateOption = {
  id: string;
  name: string;
  category: string | null;
  version: number;
  fields: TemplateFieldDef[];
};

export function DocumentWizard({
  action,
  clients,
  templates,
  defaultClientId,
}: {
  action: (
    prevState: GenerateDocumentFormState,
    formData: FormData,
  ) => Promise<GenerateDocumentFormState>;
  clients: { id: string; label: string }[];
  templates: TemplateOption[];
  defaultClientId?: string;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const [clientId, setClientId] = useState(defaultClientId ?? "");
  const [templateId, setTemplateId] = useState("");
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});

  const selectedTemplate = useMemo(
    () => templates.find((t) => t.id === templateId) ?? null,
    [templates, templateId],
  );

  function handleTemplateChange(id: string) {
    setTemplateId(id);
    setFieldValues({});
  }

  return (
    <form action={formAction} className="space-y-6">
      <input type="hidden" name="fieldValues" value={JSON.stringify(fieldValues)} />

      <Card>
        <CardHeader>
          <CardTitle>1. Cliente</CardTitle>
        </CardHeader>
        <CardContent>
          <Label>Cliente *</Label>
          <Select name="clientId" value={clientId} onChange={(e) => setClientId(e.target.value)}>
            <option value="">Selecione um cliente</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </Select>
          {state.fieldErrors?.clientId && (
            <p className="mt-1 text-xs text-red-600">{state.fieldErrors.clientId}</p>
          )}
          {clientId && (
            <p className="mt-2 text-xs text-slate-500">
              Os dados cadastrais deste cliente ({CLIENT_TOKEN_KEYS.map((k) => `{{${k}}}`).join(", ")}) serão
              preenchidos automaticamente no documento.
            </p>
          )}
        </CardContent>
      </Card>

      {clientId && (
        <Card>
          <CardHeader>
            <CardTitle>2. Modelo</CardTitle>
          </CardHeader>
          <CardContent>
            <Label>Modelo de documento *</Label>
            <Select
              name="templateId"
              value={templateId}
              onChange={(e) => handleTemplateChange(e.target.value)}
            >
              <option value="">Selecione um modelo</option>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} {t.category ? `— ${t.category}` : ""} (v{t.version})
                </option>
              ))}
            </Select>
            {state.fieldErrors?.templateId && (
              <p className="mt-1 text-xs text-red-600">{state.fieldErrors.templateId}</p>
            )}
          </CardContent>
        </Card>
      )}

      {selectedTemplate && (
        <Card>
          <CardHeader>
            <CardTitle>3. Dados específicos deste documento</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Título do documento</Label>
              <Input name="title" placeholder={selectedTemplate.name} />
            </div>
            {selectedTemplate.fields.length === 0 && (
              <p className="text-sm text-slate-400">
                Este modelo não possui campos adicionais além dos dados do cliente.
              </p>
            )}
            {selectedTemplate.fields.map((field) => (
              <div key={field.key}>
                <Label>
                  {field.label}
                  {field.required ? " *" : ""}
                </Label>
                {field.type === "textarea" ? (
                  <Textarea
                    name={`dyn_${field.key}`}
                    rows={3}
                    value={fieldValues[field.key] ?? ""}
                    onChange={(e) =>
                      setFieldValues((prev) => ({ ...prev, [field.key]: e.target.value }))
                    }
                  />
                ) : (
                  <Input
                    name={`dyn_${field.key}`}
                    type={field.type === "number" ? "number" : field.type === "date" ? "date" : "text"}
                    value={fieldValues[field.key] ?? ""}
                    onChange={(e) =>
                      setFieldValues((prev) => ({ ...prev, [field.key]: e.target.value }))
                    }
                  />
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {state.error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
      )}

      {selectedTemplate && (
        <div className="flex justify-end">
          <Button type="submit" disabled={pending}>
            {pending ? "Gerando..." : "Gerar documento"}
          </Button>
        </div>
      )}
    </form>
  );
}
