"use client";

import { useActionState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { LeadFormState } from "./actions";
import { stageLabels } from "@/lib/lead-labels";

type LeadDefaults = Partial<{
  name: string;
  whatsapp: string;
  phone: string;
  instagram: string;
  city: string;
  clientTypeGuess: string;
  serviceInterestId: string;
  origin: string;
  responsibleId: string;
  temperature: string;
  stage: string;
  nextContactDate: string;
  notes: string;
}>;

export function LeadForm({
  action,
  defaults,
  services,
  users,
  submitLabel = "Salvar lead",
  fromProspectId,
}: {
  action: (
    prevState: LeadFormState,
    formData: FormData,
  ) => Promise<LeadFormState>;
  defaults?: LeadDefaults;
  services: { id: string; name: string }[];
  users: { id: string; name: string }[];
  submitLabel?: string;
  fromProspectId?: string;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const fieldError = (name: string) => state.fieldErrors?.[name];

  return (
    <form action={formAction} className="space-y-6">
      {fromProspectId && (
        <input type="hidden" name="fromProspectId" value={fromProspectId} />
      )}
      <Card>
        <CardHeader>
          <CardTitle>Dados do lead</CardTitle>
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
            <Label>WhatsApp</Label>
            <Input name="whatsapp" defaultValue={defaults?.whatsapp} />
          </div>
          <div>
            <Label>Telefone</Label>
            <Input name="phone" defaultValue={defaults?.phone} />
          </div>
          <div>
            <Label>Instagram</Label>
            <Input name="instagram" defaultValue={defaults?.instagram} />
          </div>
          <div>
            <Label>Cidade</Label>
            <Input name="city" defaultValue={defaults?.city} />
          </div>
          <div>
            <Label>Tipo de cliente</Label>
            <Select name="clientTypeGuess" defaultValue={defaults?.clientTypeGuess ?? ""}>
              <option value="">Não definido</option>
              <option value="PF">Pessoa Física</option>
              <option value="PJ">Pessoa Jurídica</option>
            </Select>
          </div>
          <div>
            <Label>Serviço de interesse</Label>
            <Select
              name="serviceInterestId"
              defaultValue={defaults?.serviceInterestId ?? ""}
            >
              <option value="">Não definido</option>
              {services.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Origem</Label>
            <Input
              name="origin"
              placeholder="Instagram, indicação, site..."
              defaultValue={defaults?.origin}
            />
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
          <CardTitle>Funil</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-3 gap-4">
          <div>
            <Label>Temperatura</Label>
            <Select name="temperature" defaultValue={defaults?.temperature ?? "MORNO"}>
              <option value="FRIO">🔴 Frio</option>
              <option value="MORNO">🟡 Morno</option>
              <option value="QUENTE">🟢 Quente</option>
            </Select>
          </div>
          <div>
            <Label>Etapa</Label>
            <Select name="stage" defaultValue={defaults?.stage ?? "NOVO_LEAD"}>
              {Object.entries(stageLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Próximo contato</Label>
            <Input
              type="date"
              name="nextContactDate"
              defaultValue={defaults?.nextContactDate}
            />
            {fieldError("nextContactDate") && (
              <p className="mt-1 text-xs text-red-600">{fieldError("nextContactDate")}</p>
            )}
          </div>
          <div className="col-span-3">
            <Label>Observações</Label>
            <Textarea name="notes" rows={3} defaultValue={defaults?.notes} />
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
