"use client";

import { useActionState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { updateCompanySettingsAction, type SettingsFormState } from "./actions";

const initialState: SettingsFormState = {};

export function SettingsForm({
  name,
  slogan,
  logoData,
}: {
  name: string;
  slogan: string | null;
  logoData: string | null;
}) {
  const [state, formAction, pending] = useActionState(
    updateCompanySettingsAction,
    initialState,
  );

  return (
    <form action={formAction} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Identidade da empresa</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-slate-500">
            A logo cadastrada aqui será utilizada em contratos, orçamentos,
            propostas, recibos e relatórios gerados pelo sistema. O sistema não
            cria nem altera a identidade visual por conta própria.
          </p>
          <div>
            <Label>Nome da empresa</Label>
            <Input name="name" defaultValue={name} />
          </div>
          <div>
            <Label>Slogan / posicionamento</Label>
            <Input name="slogan" defaultValue={slogan ?? ""} placeholder="A Monteiro Resolve." />
          </div>
          <div>
            <Label>Logo oficial</Label>
            {logoData && (
              // eslint-disable-next-line @next/next/no-img-element -- data URI preview of an admin-uploaded logo, no fixed dimensions
              <img
                src={logoData}
                alt="Logo atual"
                className="mb-3 h-16 rounded border border-slate-200 bg-white object-contain p-2"
              />
            )}
            <input
              type="file"
              name="logo"
              accept="image/*"
              className="block w-full text-sm text-slate-600 file:mr-4 file:rounded-lg file:border-0 file:bg-slate-900 file:px-4 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-slate-800"
            />
          </div>
        </CardContent>
      </Card>

      {state.error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      )}
      {state.success && (
        <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          Configurações salvas.
        </p>
      )}

      <div className="flex justify-end">
        <Button type="submit" disabled={pending}>
          {pending ? "Salvando..." : "Salvar configurações"}
        </Button>
      </div>
    </form>
  );
}
