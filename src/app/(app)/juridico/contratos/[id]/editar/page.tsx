import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { parseContractFields } from "@/lib/contract-render";
import { updateContractAction } from "../../../actions";
import { EditContractForm } from "./edit-form";

export default async function EditarContratoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const contract = await prisma.contract.findUnique({ where: { id }, include: { template: true } });
  if (!contract) notFound();

  const editable = contract.status === "RASCUNHO" || contract.status === "ENVIADO";
  const fields = parseContractFields(contract.template.fieldsSchema);
  let values: Record<string, string> = {};
  try {
    values = JSON.parse(contract.fieldValues || "{}");
  } catch {
    values = {};
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Editar {contract.code}</h1>
        <p className="text-sm text-slate-500">Cada alteração salva uma nova versão; as anteriores continuam no histórico.</p>
      </div>
      {editable ? (
        <EditContractForm
          action={updateContractAction.bind(null, contract.id)}
          fields={fields}
          values={values}
          title={contract.title}
          notes={contract.notes ?? ""}
          renderedContent={contract.renderedContent}
          sent={contract.status === "ENVIADO"}
        />
      ) : (
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">
          Contrato assinado não muda. Para alterar condições, gere um aditivo (novo contrato).{" "}
          <Link href={`/juridico/contratos/${contract.id}`} className="underline">
            Voltar
          </Link>
        </p>
      )}
    </div>
  );
}
