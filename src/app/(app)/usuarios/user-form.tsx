"use client";

import { useActionState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { UserFormState } from "./actions";

type UserDefaults = Partial<{
  name: string;
  email: string;
  role: string;
  active: boolean;
}>;

export function UserForm({
  action,
  defaults,
  submitLabel = "Salvar usuário",
  isEdit = false,
}: {
  action: (
    prevState: UserFormState,
    formData: FormData,
  ) => Promise<UserFormState>;
  defaults?: UserDefaults;
  submitLabel?: string;
  isEdit?: boolean;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const fieldError = (name: string) => state.fieldErrors?.[name];

  return (
    <form action={formAction} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Usuário</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <div>
            <Label>Nome *</Label>
            <Input name="name" defaultValue={defaults?.name} />
            {fieldError("name") && (
              <p className="mt-1 text-xs text-red-600">{fieldError("name")}</p>
            )}
          </div>
          <div>
            <Label>E-mail *</Label>
            <Input name="email" type="email" defaultValue={defaults?.email} />
            {fieldError("email") && (
              <p className="mt-1 text-xs text-red-600">{fieldError("email")}</p>
            )}
          </div>
          <div>
            <Label>{isEdit ? "Nova senha (opcional)" : "Senha *"}</Label>
            <Input name="password" type="password" autoComplete="new-password" />
            {fieldError("password") && (
              <p className="mt-1 text-xs text-red-600">{fieldError("password")}</p>
            )}
          </div>
          <div>
            <Label>Papel</Label>
            <Select name="role" defaultValue={defaults?.role ?? "GESTOR"}>
              <option value="ADMIN">Administrador</option>
              <option value="GESTOR">Gestor</option>
              <option value="BIA">Bia / Mídia</option>
            </Select>
            {fieldError("role") && (
              <p className="mt-1 text-xs text-red-600">{fieldError("role")}</p>
            )}
          </div>
          <label className="col-span-2 flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="active"
              defaultChecked={defaults?.active ?? true}
            />
            Usuário ativo
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
