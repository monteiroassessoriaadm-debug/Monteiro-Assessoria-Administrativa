"use client";

import { useActionState, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ClientFormState } from "./actions";

type ClientDefaults = Partial<{
  type: "PF" | "PJ";
  status: "ATIVO" | "INATIVO";
  fullName: string;
  cpf: string;
  rg: string;
  birthDate: string;
  maritalStatus: string;
  profession: string;
  legalName: string;
  tradeName: string;
  cnpj: string;
  stateRegistration: string;
  responsibleName: string;
  responsibleCpf: string;
  responsibleRole: string;
  addressStreet: string;
  addressNumber: string;
  addressComplement: string;
  addressNeighborhood: string;
  addressCity: string;
  addressState: string;
  addressZip: string;
  phone: string;
  whatsapp: string;
  email: string;
  instagram: string;
  notes: string;
}>;

export function ClientForm({
  action,
  defaults,
  submitLabel = "Salvar cliente",
  fromLeadId,
}: {
  action: (
    prevState: ClientFormState,
    formData: FormData,
  ) => Promise<ClientFormState>;
  defaults?: ClientDefaults;
  submitLabel?: string;
  fromLeadId?: string;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const [type, setType] = useState<"PF" | "PJ">(defaults?.type ?? "PF");

  const fieldError = (name: string) => state.fieldErrors?.[name];

  return (
    <form action={formAction} className="space-y-6">
      {fromLeadId && <input type="hidden" name="fromLeadId" value={fromLeadId} />}
      <Card>
        <CardHeader>
          <CardTitle>Tipo de cadastro</CardTitle>
        </CardHeader>
        <CardContent className="flex gap-6">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              name="type"
              value="PF"
              checked={type === "PF"}
              onChange={() => setType("PF")}
            />
            Pessoa Física
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              name="type"
              value="PJ"
              checked={type === "PJ"}
              onChange={() => setType("PJ")}
            />
            Pessoa Jurídica
          </label>
          <label className="ml-auto flex items-center gap-2 text-sm">
            <span>Status</span>
            <Select
              name="status"
              defaultValue={defaults?.status ?? "ATIVO"}
              className="w-40"
            >
              <option value="ATIVO">Ativo</option>
              <option value="INATIVO">Inativo</option>
            </Select>
          </label>
        </CardContent>
      </Card>

      {type === "PF" ? (
        <Card>
          <CardHeader>
            <CardTitle>Dados pessoais</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label>Nome completo *</Label>
              <Input name="fullName" defaultValue={defaults?.fullName} />
              {fieldError("fullName") && (
                <p className="mt-1 text-xs text-red-600">{fieldError("fullName")}</p>
              )}
            </div>
            <div>
              <Label>CPF</Label>
              <Input name="cpf" defaultValue={defaults?.cpf} />
            </div>
            <div>
              <Label>RG</Label>
              <Input name="rg" defaultValue={defaults?.rg} />
            </div>
            <div>
              <Label>Data de nascimento</Label>
              <Input type="date" name="birthDate" defaultValue={defaults?.birthDate} />
            </div>
            <div>
              <Label>Estado civil</Label>
              <Input name="maritalStatus" defaultValue={defaults?.maritalStatus} />
            </div>
            <div>
              <Label>Profissão</Label>
              <Input name="profession" defaultValue={defaults?.profession} />
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Dados da empresa</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <div>
              <Label>Razão social *</Label>
              <Input name="legalName" defaultValue={defaults?.legalName} />
              {fieldError("legalName") && (
                <p className="mt-1 text-xs text-red-600">{fieldError("legalName")}</p>
              )}
            </div>
            <div>
              <Label>Nome fantasia</Label>
              <Input name="tradeName" defaultValue={defaults?.tradeName} />
            </div>
            <div>
              <Label>CNPJ</Label>
              <Input name="cnpj" defaultValue={defaults?.cnpj} />
            </div>
            <div>
              <Label>Inscrição estadual</Label>
              <Input
                name="stateRegistration"
                defaultValue={defaults?.stateRegistration}
              />
            </div>
            <div>
              <Label>Responsável</Label>
              <Input name="responsibleName" defaultValue={defaults?.responsibleName} />
            </div>
            <div>
              <Label>CPF do responsável</Label>
              <Input name="responsibleCpf" defaultValue={defaults?.responsibleCpf} />
            </div>
            <div>
              <Label>Cargo do responsável</Label>
              <Input name="responsibleRole" defaultValue={defaults?.responsibleRole} />
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Endereço</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-3 gap-4">
          <div className="col-span-2">
            <Label>Endereço</Label>
            <Input name="addressStreet" defaultValue={defaults?.addressStreet} />
          </div>
          <div>
            <Label>Número</Label>
            <Input name="addressNumber" defaultValue={defaults?.addressNumber} />
          </div>
          <div>
            <Label>Complemento</Label>
            <Input
              name="addressComplement"
              defaultValue={defaults?.addressComplement}
            />
          </div>
          <div>
            <Label>Bairro</Label>
            <Input
              name="addressNeighborhood"
              defaultValue={defaults?.addressNeighborhood}
            />
          </div>
          <div>
            <Label>CEP</Label>
            <Input name="addressZip" defaultValue={defaults?.addressZip} />
          </div>
          <div>
            <Label>Cidade</Label>
            <Input name="addressCity" defaultValue={defaults?.addressCity} />
          </div>
          <div>
            <Label>Estado</Label>
            <Input name="addressState" defaultValue={defaults?.addressState} maxLength={2} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Contato</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <div>
            <Label>Telefone</Label>
            <Input name="phone" defaultValue={defaults?.phone} />
          </div>
          <div>
            <Label>WhatsApp</Label>
            <Input name="whatsapp" defaultValue={defaults?.whatsapp} />
          </div>
          <div>
            <Label>E-mail</Label>
            <Input type="email" name="email" defaultValue={defaults?.email} />
          </div>
          <div>
            <Label>Instagram</Label>
            <Input name="instagram" defaultValue={defaults?.instagram} />
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

      <div className="flex justify-end gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Salvando..." : submitLabel}
        </Button>
      </div>
    </form>
  );
}
