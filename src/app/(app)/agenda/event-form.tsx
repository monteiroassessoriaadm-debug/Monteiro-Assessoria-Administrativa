"use client";

import { useActionState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { calendarEventTypeLabels } from "@/lib/lead-labels";
import type { CalendarEventFormState } from "./actions";

export function EventForm({
  action,
  users,
  clients,
}: {
  action: (prevState: CalendarEventFormState, formData: FormData) => Promise<CalendarEventFormState>;
  users: { id: string; name: string }[];
  clients: { id: string; label: string }[];
}) {
  const [state, formAction, pending] = useActionState(action, {});

  return (
    <form action={formAction} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Evento</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Título *</Label>
            <Input name="title" />
            {state.fieldErrors?.title && (
              <p className="mt-1 text-xs text-red-600">{state.fieldErrors.title}</p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Tipo *</Label>
              <Select name="type" defaultValue="ATENDIMENTO">
                {Object.entries(calendarEventTypeLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label>Responsável</Label>
              <Select name="responsibleId" defaultValue="">
                <option value="">Não definido</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label>Início *</Label>
              <Input type="datetime-local" name="startAt" />
              {state.fieldErrors?.startAt && (
                <p className="mt-1 text-xs text-red-600">{state.fieldErrors.startAt}</p>
              )}
            </div>
            <div>
              <Label>Término</Label>
              <Input type="datetime-local" name="endAt" />
            </div>
          </div>
          <div>
            <Label>Cliente relacionado</Label>
            <Select name="clientId" defaultValue="">
              <option value="">Nenhum</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Observações</Label>
            <Textarea name="notes" rows={3} />
          </div>
        </CardContent>
      </Card>

      {state.error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
      )}

      <div className="flex justify-end">
        <Button type="submit" disabled={pending}>
          {pending ? "Salvando..." : "Criar evento"}
        </Button>
      </div>
    </form>
  );
}
