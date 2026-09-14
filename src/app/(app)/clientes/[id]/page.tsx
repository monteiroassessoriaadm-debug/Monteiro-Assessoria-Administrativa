import Link from "next/link";
import { notFound } from "next/navigation";
import { Pencil } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDateBR, formatDateTimeBR } from "@/lib/utils";
import { ToggleStatusButton } from "./toggle-status-button";

export default async function ClienteDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const client = await prisma.client.findUnique({
    where: { id },
    include: {
      timelineEvents: { orderBy: { createdAt: "desc" } },
      leads: true,
    },
  });

  if (!client) notFound();

  const name =
    client.type === "PF"
      ? client.fullName
      : client.tradeName || client.legalName;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-slate-900">{name}</h1>
            <Badge tone={client.status === "ATIVO" ? "green" : "slate"}>
              {client.status === "ATIVO" ? "Ativo" : "Inativo"}
            </Badge>
            <Badge tone="blue">
              {client.type === "PF" ? "Pessoa Física" : "Pessoa Jurídica"}
            </Badge>
          </div>
          <p className="text-sm text-slate-500">
            Cliente desde {formatDateBR(client.createdAt)}
          </p>
        </div>
        <div className="flex gap-2">
          <ToggleStatusButton clientId={client.id} status={client.status} />
          <Link href={`/clientes/${client.id}/editar`}>
            <Button variant="outline">
              <Pencil className="h-4 w-4" /> Editar
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Dados cadastrais</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
              {client.type === "PF" ? (
                <>
                  <Field label="Nome completo" value={client.fullName} />
                  <Field label="CPF" value={client.cpf} />
                  <Field label="RG" value={client.rg} />
                  <Field
                    label="Data de nascimento"
                    value={formatDateBR(client.birthDate)}
                  />
                  <Field label="Estado civil" value={client.maritalStatus} />
                  <Field label="Profissão" value={client.profession} />
                </>
              ) : (
                <>
                  <Field label="Razão social" value={client.legalName} />
                  <Field label="Nome fantasia" value={client.tradeName} />
                  <Field label="CNPJ" value={client.cnpj} />
                  <Field
                    label="Inscrição estadual"
                    value={client.stateRegistration}
                  />
                  <Field label="Responsável" value={client.responsibleName} />
                  <Field
                    label="CPF do responsável"
                    value={client.responsibleCpf}
                  />
                  <Field
                    label="Cargo do responsável"
                    value={client.responsibleRole}
                  />
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Endereço</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
              <Field
                label="Endereço"
                value={
                  [client.addressStreet, client.addressNumber]
                    .filter(Boolean)
                    .join(", ") || null
                }
              />
              <Field label="Complemento" value={client.addressComplement} />
              <Field label="Bairro" value={client.addressNeighborhood} />
              <Field label="CEP" value={client.addressZip} />
              <Field label="Cidade" value={client.addressCity} />
              <Field label="Estado" value={client.addressState} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Contato</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
              <Field label="Telefone" value={client.phone} />
              <Field label="WhatsApp" value={client.whatsapp} />
              <Field label="E-mail" value={client.email} />
              <Field label="Instagram" value={client.instagram} />
              <div className="col-span-2">
                <Field label="Observações" value={client.notes} />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Linha do tempo</CardTitle>
            </CardHeader>
            <CardContent>
              {client.timelineEvents.length === 0 ? (
                <p className="text-sm text-slate-400">Sem eventos ainda.</p>
              ) : (
                <ol className="space-y-4">
                  {client.timelineEvents.map((event) => (
                    <li key={event.id} className="border-l-2 border-slate-200 pl-3">
                      <p className="text-xs text-slate-400">
                        {formatDateTimeBR(event.createdAt)}
                      </p>
                      <p className="text-sm text-slate-800">
                        {event.description}
                      </p>
                    </li>
                  ))}
                </ol>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-slate-400">{label}</p>
      <p className="text-slate-800">{value || "-"}</p>
    </div>
  );
}
