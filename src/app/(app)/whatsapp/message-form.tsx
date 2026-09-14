"use client";

import { useActionState, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { WhatsAppMessageFormState } from "./actions";

export function WhatsAppMessageForm({
  action,
  clientId,
  templates,
}: {
  action: (
    prevState: WhatsAppMessageFormState,
    formData: FormData,
  ) => Promise<WhatsAppMessageFormState>;
  clientId: string;
  templates: { id: string; name: string; renderedContent: string }[];
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const [templateId, setTemplateId] = useState("");
  const [content, setContent] = useState("");

  function handleTemplateChange(id: string) {
    setTemplateId(id);
    const template = templates.find((t) => t.id === id);
    if (template) setContent(template.renderedContent);
  }

  return (
    <form action={formAction} className="space-y-6">
      <input type="hidden" name="clientId" value={clientId} />
      <Card>
        <CardHeader>
          <CardTitle>Registrar mensagem de WhatsApp</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">
            Registro manual — não há envio automático. Envie a mensagem pelo WhatsApp
            normalmente e registre aqui para manter o histórico no cadastro do cliente.
          </p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Direção</Label>
              <Select name="direction" defaultValue="ENVIADA">
                <option value="ENVIADA">Enviada</option>
                <option value="RECEBIDA">Recebida</option>
              </Select>
            </div>
            <div>
              <Label>Data/hora</Label>
              <Input type="datetime-local" name="sentAt" />
            </div>
          </div>
          {templates.length > 0 && (
            <div>
              <Label>Usar modelo (opcional)</Label>
              <Select
                aria-label="Selecionar modelo"
                value={templateId}
                onChange={(e) => handleTemplateChange(e.target.value)}
              >
                <option value="">Nenhum — escrever livremente</option>
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </Select>
              <input type="hidden" name="templateId" value={templateId} />
            </div>
          )}
          <div>
            <Label>Conteúdo *</Label>
            <Textarea
              name="content"
              rows={6}
              value={content}
              onChange={(e) => setContent(e.target.value)}
            />
            {state.fieldErrors?.content && (
              <p className="mt-1 text-xs text-red-600">{state.fieldErrors.content}</p>
            )}
          </div>
        </CardContent>
      </Card>

      {state.error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
      )}

      <div className="flex justify-end">
        <Button type="submit" disabled={pending}>
          {pending ? "Salvando..." : "Registrar mensagem"}
        </Button>
      </div>
    </form>
  );
}
