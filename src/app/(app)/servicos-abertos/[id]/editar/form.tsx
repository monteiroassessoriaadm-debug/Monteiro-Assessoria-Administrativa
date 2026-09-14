"use client";

import { useActionState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ServiceInstanceFormState } from "../../actions";

type Defaults = Partial<{
  title: string;
  responsibleId: string;
  dueDate: string;
  notes: string;
}>;

export function EditServiceInstanceForm({
  action,
  users,
  defaults,
}: {
  action: (prevState: ServiceInstanceFormState, formData: FormData) => Promise<ServiceInstanceFormState>;
  users: { id: string; name: string }[];
  defaults?: Defaults;
}) {
  const [state, formAction, pending] = useActionState(action, {});

  return (
    <form action={formAction} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Dados do serviço</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Título *</Label>
            <Input name="title" defaultValue={defaults?.title} />
            {state.fieldErrors?.title && (
              <p className="mt-1 text-xs text-red-600">{state.fieldErrors.title}</p>
            )}
          </div>
          <div>
            <Label>Responsável</Label>
            <Select name="responsibleId" defaultValue={defaults?.responsibleId ?? ""}>
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
            <Input type="date" name="dueDate" defaultValue={defaults?.dueDate} />
            {state.fieldErrors?.dueDate && (
              <p className="mt-1 text-xs text-red-600">{state.fieldErrors.dueDate}</p>
            )}
          </div>
          <div>
            <Label>Observações</Label>
            <Textarea name="notes" rows={3} defaultValue={defaults?.notes} />
          </div>
        </CardContent>
      </Card>

      {state.error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
      )}

      <div className="flex justify-end">
        <Button type="submit" disabled={pending}>
          {pending ? "Salvando..." : "Salvar alterações"}
        </Button>
      </div>
    </form>
  );
}
