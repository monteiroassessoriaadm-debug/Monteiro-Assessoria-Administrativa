"use client";

import { useActionState, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrencyBRL } from "@/lib/utils";
import type { QuoteFormState } from "./actions";

type ServiceOption = {
  id: string;
  name: string;
  defaultPrice: string | null;
  defaultTermDays: number | null;
};

type ClientOption = { id: string; label: string };

type ItemRow = {
  key: string;
  serviceId: string;
  description: string;
  quantity: string;
  unitPrice: string;
  termDays: string;
};

function emptyRow(): ItemRow {
  return {
    key: Math.random().toString(36).slice(2),
    serviceId: "",
    description: "",
    quantity: "1",
    unitPrice: "",
    termDays: "",
  };
}

type QuoteDefaults = Partial<{
  clientId: string;
  paymentTerms: string;
  validUntil: string;
  notes: string;
  items: ItemRow[];
}>;

export function QuoteForm({
  action,
  clients,
  services,
  defaults,
  submitLabel = "Salvar orçamento",
}: {
  action: (
    prevState: QuoteFormState,
    formData: FormData,
  ) => Promise<QuoteFormState>;
  clients: ClientOption[];
  services: ServiceOption[];
  defaults?: QuoteDefaults;
  submitLabel?: string;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const [items, setItems] = useState<ItemRow[]>(
    defaults?.items && defaults.items.length > 0 ? defaults.items : [emptyRow()],
  );

  const fieldError = (name: string) => state.fieldErrors?.[name];

  function updateItem(key: string, patch: Partial<ItemRow>) {
    setItems((prev) => prev.map((it) => (it.key === key ? { ...it, ...patch } : it)));
  }

  function handleServiceChange(key: string, serviceId: string) {
    const service = services.find((s) => s.id === serviceId);
    updateItem(key, {
      serviceId,
      description: service?.name ?? "",
      unitPrice: service?.defaultPrice ?? "",
      termDays: service?.defaultTermDays ? String(service.defaultTermDays) : "",
    });
  }

  const total = items.reduce(
    (sum, i) => sum + (Number(i.quantity) || 0) * (Number(i.unitPrice) || 0),
    0,
  );

  return (
    <form action={formAction} className="space-y-6">
      <input
        type="hidden"
        name="items"
        value={JSON.stringify(
          items.map((i) => ({
            serviceId: i.serviceId || undefined,
            description: i.description,
            quantity: i.quantity,
            unitPrice: i.unitPrice,
            termDays: i.termDays || undefined,
          })),
        )}
      />

      <Card>
        <CardHeader>
          <CardTitle>Cliente</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <div>
            <Label>Cliente *</Label>
            <Select name="clientId" defaultValue={defaults?.clientId ?? ""}>
              <option value="">Selecione um cliente</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </Select>
            {fieldError("clientId") && (
              <p className="mt-1 text-xs text-red-600">{fieldError("clientId")}</p>
            )}
          </div>
          <div>
            <Label>Validade</Label>
            <Input type="date" name="validUntil" defaultValue={defaults?.validUntil} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Serviços</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {items.map((item, idx) => (
            <div
              key={item.key}
              className="grid grid-cols-12 items-end gap-2 rounded-lg border border-slate-200 p-3"
            >
              <div className="col-span-3">
                <Label>Serviço</Label>
                <Select
                  value={item.serviceId}
                  onChange={(e) => handleServiceChange(item.key, e.target.value)}
                >
                  <option value="">Personalizado</option>
                  {services.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="col-span-4">
                <Label>Descrição</Label>
                <Input
                  value={item.description}
                  onChange={(e) => updateItem(item.key, { description: e.target.value })}
                />
              </div>
              <div className="col-span-1">
                <Label>Qtd.</Label>
                <Input
                  type="number"
                  min="1"
                  value={item.quantity}
                  onChange={(e) => updateItem(item.key, { quantity: e.target.value })}
                />
              </div>
              <div className="col-span-2">
                <Label>Valor unit. (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={item.unitPrice}
                  onChange={(e) => updateItem(item.key, { unitPrice: e.target.value })}
                />
              </div>
              <div className="col-span-1">
                <Label>Prazo (d)</Label>
                <Input
                  type="number"
                  min="0"
                  value={item.termDays}
                  onChange={(e) => updateItem(item.key, { termDays: e.target.value })}
                />
              </div>
              <div className="col-span-1 flex justify-end">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={items.length === 1}
                  onClick={() => setItems((prev) => prev.filter((_, i) => i !== idx))}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
          {fieldError("items") && (
            <p className="text-xs text-red-600">{fieldError("items")}</p>
          )}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setItems((prev) => [...prev, emptyRow()])}
          >
            <Plus className="h-4 w-4" /> Adicionar item
          </Button>
          <div className="flex justify-end border-t border-slate-100 pt-3 text-sm font-semibold text-slate-900">
            Total: {formatCurrencyBRL(total)}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Condições</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <div>
            <Label>Forma de pagamento</Label>
            <Input name="paymentTerms" defaultValue={defaults?.paymentTerms} />
          </div>
          <div className="col-span-2">
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
