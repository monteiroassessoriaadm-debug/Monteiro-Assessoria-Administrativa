"use client";

import { useActionState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { JuridicoFormState } from "../../actions";

export function ConsultationForm({
  action,
  clients,
}: {
  action: (prev: JuridicoFormState, formData: FormData) => Promise<JuridicoFormState>;
  clients: { id: string; label: string }[];
}) {
  const [state, formAction, pending] = useActionState(action, {});
  return (
    <form action={formAction}>
      <Card>
        <CardContent className="space-y-4 pt-4">
          <div>
            <Label htmlFor="topic">Assunto *</Label>
            <Input id="topic" name="topic" placeholder="Ex.: cliente quer cancelar a manutenção" />
          </div>
          <div>
            <Label htmlFor="clientId">Cliente (opcional)</Label>
            <Select id="clientId" name="clientId" defaultValue="">
              <option value="">Nenhum</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="question">Dúvida *</Label>
            <Textarea id="question" name="question" rows={4} />
          </div>
          <div>
            <Label htmlFor="guidance">Orientação dada *</Label>
            <Textarea id="guidance" name="guidance" rows={6} />
          </div>
          <label className="flex min-h-11 items-center gap-3 text-sm text-slate-700">
            <input type="checkbox" name="needsLawyer" className="h-5 w-5" /> Foi recomendado procurar um advogado
          </label>
          {state.error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>}
          <div className="flex justify-end">
            <Button type="submit" disabled={pending}>
              {pending ? "Salvando..." : "Registrar"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  );
}
