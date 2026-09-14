"use client";

import { useActionState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { MediaContentFormState } from "./actions";

export function MediaContentForm({
  action,
  clients,
  users,
  defaultValues,
  submitLabel,
}: {
  action: (prevState: MediaContentFormState, formData: FormData) => Promise<MediaContentFormState>;
  clients: { id: string; label: string }[];
  users: { id: string; name: string }[];
  defaultValues?: {
    clientId?: string;
    title?: string;
    description?: string;
    type?: string;
    platform?: string;
    scheduledDate?: string;
    responsibleId?: string;
    notes?: string;
  };
  submitLabel?: string;
}) {
  const [state, formAction, pending] = useActionState(action, {});

  return (
    <form action={formAction} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Conteúdo de mídia</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Cliente *</Label>
              <Select name="clientId" defaultValue={defaultValues?.clientId ?? ""}>
                <option value="" disabled>
                  Selecione
                </option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </Select>
              {state.fieldErrors?.clientId && (
                <p className="mt-1 text-xs text-red-600">{state.fieldErrors.clientId}</p>
              )}
            </div>
            <div>
              <Label>Responsável</Label>
              <Select name="responsibleId" defaultValue={defaultValues?.responsibleId ?? ""}>
                <option value="">Não definido</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </Select>
            </div>
          </div>
          <div>
            <Label>Título *</Label>
            <Input name="title" defaultValue={defaultValues?.title} />
            {state.fieldErrors?.title && (
              <p className="mt-1 text-xs text-red-600">{state.fieldErrors.title}</p>
            )}
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label>Tipo</Label>
              <Input
                name="type"
                placeholder="Post, Stories, Reels, Vídeo..."
                defaultValue={defaultValues?.type}
              />
            </div>
            <div>
              <Label>Plataforma</Label>
              <Input
                name="platform"
                placeholder="Instagram, Facebook, TikTok..."
                defaultValue={defaultValues?.platform}
              />
            </div>
            <div>
              <Label>Data prevista</Label>
              <Input type="date" name="scheduledDate" defaultValue={defaultValues?.scheduledDate} />
            </div>
          </div>
          <div>
            <Label>Descrição / pauta</Label>
            <Textarea name="description" rows={3} defaultValue={defaultValues?.description} />
          </div>
          <div>
            <Label>Observações</Label>
            <Textarea name="notes" rows={2} defaultValue={defaultValues?.notes} />
          </div>
        </CardContent>
      </Card>

      {state.error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
      )}

      <div className="flex justify-end">
        <Button type="submit" disabled={pending}>
          {pending ? "Salvando..." : submitLabel ?? "Criar conteúdo"}
        </Button>
      </div>
    </form>
  );
}
