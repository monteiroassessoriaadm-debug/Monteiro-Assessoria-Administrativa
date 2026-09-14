"use client";

import { useActionState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ServiceFormState } from "./actions";

function jsonToChecklistText(json: string | null | undefined) {
  if (!json) return "";
  try {
    const items = JSON.parse(json) as string[];
    return items.join("\n");
  } catch {
    return "";
  }
}

type ServiceDefaults = Partial<{
  name: string;
  category: string;
  description: string;
  defaultPrice: string;
  defaultTermDays: string;
  checklistTemplate: string;
  defaultResponsibleId: string;
  active: boolean;
}>;

export function ServiceForm({
  action,
  defaults,
  users,
  submitLabel = "Salvar serviço",
}: {
  action: (
    prevState: ServiceFormState,
    formData: FormData,
  ) => Promise<ServiceFormState>;
  defaults?: ServiceDefaults;
  users: { id: string; name: string }[];
  submitLabel?: string;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const fieldError = (name: string) => state.fieldErrors?.[name];

  return (
    <form action={formAction} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Serviço</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <Label>Nome do serviço *</Label>
            <Input name="name" defaultValue={defaults?.name} />
            {fieldError("name") && (
              <p className="mt-1 text-xs text-red-600">{fieldError("name")}</p>
            )}
          </div>
          <div>
            <Label>Categoria</Label>
            <Input name="category" defaultValue={defaults?.category} />
          </div>
          <div>
            <Label>Responsável padrão</Label>
            <Select
              name="defaultResponsibleId"
              defaultValue={defaults?.defaultResponsibleId ?? ""}
            >
              <option value="">Não definido</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Preço padrão (R$)</Label>
            <Input
              name="defaultPrice"
              type="number"
              step="0.01"
              min="0"
              defaultValue={defaults?.defaultPrice}
            />
            <p className="mt-1 text-xs text-slate-400">
              Configurável — pode ser ajustado por orçamento.
            </p>
          </div>
          <div>
            <Label>Prazo padrão (dias)</Label>
            <Input
              name="defaultTermDays"
              type="number"
              min="0"
              defaultValue={defaults?.defaultTermDays}
            />
          </div>
          <div className="col-span-2">
            <Label>Descrição</Label>
            <Textarea name="description" rows={2} defaultValue={defaults?.description} />
          </div>
          <div className="col-span-2">
            <Label>Checklist padrão (um item por linha)</Label>
            <Textarea
              name="checklistTemplate"
              rows={5}
              placeholder={"Solicitar documentos\nConferir documentos\nProduzir documento\nRevisar\nEntregar"}
              defaultValue={jsonToChecklistText(defaults?.checklistTemplate)}
            />
          </div>
          <label className="col-span-2 flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="active"
              defaultChecked={defaults?.active ?? true}
            />
            Serviço ativo (disponível para uso em orçamentos e leads)
          </label>
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
