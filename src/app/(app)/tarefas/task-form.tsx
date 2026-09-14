"use client";

import { useActionState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { TaskFormState } from "./actions";

export function TaskForm({
  action,
  users,
  clients,
  defaultAssignedToId,
}: {
  action: (prevState: TaskFormState, formData: FormData) => Promise<TaskFormState>;
  users: { id: string; name: string }[];
  clients: { id: string; label: string }[];
  defaultAssignedToId?: string;
}) {
  const [state, formAction, pending] = useActionState(action, {});

  return (
    <form action={formAction} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Tarefa</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Título *</Label>
            <Input name="title" />
            {state.fieldErrors?.title && (
              <p className="mt-1 text-xs text-red-600">{state.fieldErrors.title}</p>
            )}
          </div>
          <div>
            <Label>Descrição</Label>
            <Textarea name="description" rows={3} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Responsável</Label>
              <Select name="assignedToId" defaultValue={defaultAssignedToId ?? ""}>
                <option value="">Não definido</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label>Prazo</Label>
              <Input type="date" name="dueDate" />
              {state.fieldErrors?.dueDate && (
                <p className="mt-1 text-xs text-red-600">{state.fieldErrors.dueDate}</p>
              )}
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
        </CardContent>
      </Card>

      {state.error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
      )}

      <div className="flex justify-end">
        <Button type="submit" disabled={pending}>
          {pending ? "Salvando..." : "Criar tarefa"}
        </Button>
      </div>
    </form>
  );
}
