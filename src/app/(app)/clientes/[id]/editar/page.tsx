import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ClientForm } from "../../client-form";
import { updateClientAction } from "../../actions";

export default async function EditarClientePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const client = await prisma.client.findUnique({ where: { id } });
  if (!client) notFound();

  const boundAction = updateClientAction.bind(null, id);

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Editar cliente</h1>
      </div>
      <ClientForm
        action={boundAction}
        submitLabel="Salvar alterações"
        defaults={{
          type: client.type,
          status: client.status,
          fullName: client.fullName ?? undefined,
          cpf: client.cpf ?? undefined,
          rg: client.rg ?? undefined,
          birthDate: client.birthDate
            ? client.birthDate.toISOString().slice(0, 10)
            : undefined,
          maritalStatus: client.maritalStatus ?? undefined,
          profession: client.profession ?? undefined,
          legalName: client.legalName ?? undefined,
          tradeName: client.tradeName ?? undefined,
          cnpj: client.cnpj ?? undefined,
          stateRegistration: client.stateRegistration ?? undefined,
          responsibleName: client.responsibleName ?? undefined,
          responsibleCpf: client.responsibleCpf ?? undefined,
          responsibleRole: client.responsibleRole ?? undefined,
          addressStreet: client.addressStreet ?? undefined,
          addressNumber: client.addressNumber ?? undefined,
          addressComplement: client.addressComplement ?? undefined,
          addressNeighborhood: client.addressNeighborhood ?? undefined,
          addressCity: client.addressCity ?? undefined,
          addressState: client.addressState ?? undefined,
          addressZip: client.addressZip ?? undefined,
          phone: client.phone ?? undefined,
          whatsapp: client.whatsapp ?? undefined,
          email: client.email ?? undefined,
          instagram: client.instagram ?? undefined,
          notes: client.notes ?? undefined,
        }}
      />
    </div>
  );
}
