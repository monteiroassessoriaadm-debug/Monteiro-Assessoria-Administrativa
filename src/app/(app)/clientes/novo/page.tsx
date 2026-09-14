import { ClientForm } from "../client-form";
import { createClientAction } from "../actions";

export default async function NovoClientePage({
  searchParams,
}: {
  searchParams: Promise<{
    fromLead?: string;
    name?: string;
    whatsapp?: string;
    phone?: string;
    instagram?: string;
    city?: string;
    type?: string;
  }>;
}) {
  const params = await searchParams;

  const defaults = params.fromLead
    ? {
        type: (params.type as "PF" | "PJ") ?? "PF",
        fullName: params.name,
        legalName: params.name,
        whatsapp: params.whatsapp,
        phone: params.phone,
        instagram: params.instagram,
        addressCity: params.city,
      }
    : undefined;

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Novo cliente</h1>
        <p className="text-sm text-slate-500">
          Este cadastro será reutilizado em orçamentos, contratos, documentos e
          financeiro.
        </p>
      </div>
      <ClientForm
        action={createClientAction}
        defaults={defaults}
        fromLeadId={params.fromLead}
      />
    </div>
  );
}
