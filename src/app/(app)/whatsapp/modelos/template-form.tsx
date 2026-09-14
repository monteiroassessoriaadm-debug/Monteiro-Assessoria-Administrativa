"use client";

import { useActionState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CLIENT_TOKEN_KEYS } from "@/lib/document-tokens";
import type { WhatsAppTemplateFormState } from "./actions";

export function WhatsAppTemplateForm({
  action,
  defaultValues,
  submitLabel,
}: {
  action: (
    prevState: WhatsAppTemplateFormState,
    formData: FormData,
  ) => Promise<WhatsAppTemplateFormState>;
  defaultValues?: { name?: string; category?: string; content?: string; active?: boolean };
  submitLabel?: string;
}) {
  const [state, formAction, pending] = useActionState(action, {});

  return (
    <form action={formAction} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Modelo de mensagem</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Nome *</Label>
              <Input name="name" defaultValue={defaultValues?.name} />
              {state.fieldErrors?.name && (
                <p className="mt-1 text-xs text-red-600">{state.fieldErrors.name}</p>
              )}
            </div>
            <div>
              <Label>Categoria</Label>
              <Input
                name="category"
                placeholder="Cobrança, Boas-vindas, Pós-venda..."
                defaultValue={defaultValues?.category}
              />
            </div>
          </div>
          <div>
            <Label>Conteúdo *</Label>
            <Textarea name="content" rows={6} defaultValue={defaultValues?.content} />
            {state.fieldErrors?.content && (
              <p className="mt-1 text-xs text-red-600">{state.fieldErrors.content}</p>
            )}
            <p className="mt-2 text-xs text-slate-400">
              Tokens disponíveis: {CLIENT_TOKEN_KEYS.map((k) => `{{${k}}}`).join(", ")}
            </p>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="active"
              defaultChecked={defaultValues?.active ?? true}
            />
            Ativo
          </label>
        </CardContent>
      </Card>

      {state.error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
      )}

      <div className="flex justify-end">
        <Button type="submit" disabled={pending}>
          {pending ? "Salvando..." : submitLabel ?? "Criar modelo"}
        </Button>
      </div>
    </form>
  );
}
