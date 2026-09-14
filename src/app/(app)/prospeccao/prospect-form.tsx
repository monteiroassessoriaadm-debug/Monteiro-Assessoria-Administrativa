"use client";

import { useActionState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ProspectFormState } from "./actions";

type ProspectDefaults = Partial<{
  name: string;
  segment: string;
  city: string;
  contactName: string;
  whatsapp: string;
  instagram: string;
  potentialServiceId: string;
  responsibleId: string;
  contactDate: string;
  result: string;
  nextContactDate: string;
  notes: string;
}>;

export function ProspectForm({
  action,
  services,
  users,
  defaults,
  submitLabel = "Salvar prospecção",
}: {
  action: (
    prevState: ProspectFormState,
    formData: FormData,
  ) => Promise<ProspectFormState>;
  services: { id: string; name: string }[];
  users: { id: string; name: string }[];
  defaults?: ProspectDefaults;
  submitLabel?: string;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const fieldError = (name: string) => state.fieldErrors?.[name];

  return (
    <form action={formAction} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Empresa ou pessoa potencial</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <Label>Nome *</Label>
            <Input name="name" defaultValue={defaults?.name} />
            {fieldError("name") && (
              <p className="mt-1 text-xs text-red-600">{fieldError("name")}</p>
            )}
          </div>
          <div>
            <Label>Segmento</Label>
            <Input name="segment" defaultValue={defaults?.segment} />
          </div>
          <div>
            <Label>Cidade</Label>
            <Input name="city" defaultValue={defaults?.city} />
          </div>
          <div>
            <Label>Contato</Label>
            <Input name="contactName" defaultValue={defaults?.contactName} />
          </div>
          <div>
            <Label>WhatsApp</Label>
            <Input name="whatsapp" defaultValue={defaults?.whatsapp} />
          </div>
          <div>
            <Label>Instagram</Label>
            <Input name="instagram" defaultValue={defaults?.instagram} />
          </div>
          <div>
            <Label>Serviço potencial</Label>
            <Select name="potentialServiceId" defaultValue={defaults?.potentialServiceId ?? ""}>
              <option value="">Não definido</option>
              {services.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
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
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Contato</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <div>
            <Label>Data do contato</Label>
            <Input type="date" name="contactDate" defaultValue={defaults?.contactDate} />
          </div>
          <div>
            <Label>Próximo contato</Label>
            <Input type="date" name="nextContactDate" defaultValue={defaults?.nextContactDate} />
          </div>
          <div className="col-span-2">
            <Label>Resultado do contato</Label>
            <Textarea name="result" rows={2} defaultValue={defaults?.result} />
          </div>
          <div className="col-span-2">
            <Label>Observações</Label>
            <Textarea name="notes" rows={2} defaultValue={defaults?.notes} />
          </div>
        </CardContent>
      </Card>

      {state.error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      )}

      <div className="flex justify-end">
        <Button type="submit" disabled={pending}>
          {pending ? "Salvando..." : submitLabel}
        </Button>
      </div>
    </form>
  );
}
