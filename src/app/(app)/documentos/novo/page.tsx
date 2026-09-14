import { prisma } from "@/lib/prisma";
import { displayClientName } from "@/lib/client-display";
import { parseFieldsSchema } from "@/lib/document-tokens";
import { DocumentWizard } from "../document-wizard";
import { generateDocumentAction } from "../actions";

export default async function NovoDocumentoPage({
  searchParams,
}: {
  searchParams: Promise<{ clientId?: string }>;
}) {
  const { clientId } = await searchParams;

  const [clients, templates] = await Promise.all([
    prisma.client.findMany({
      where: { status: "ATIVO" },
      select: { id: true, type: true, fullName: true, legalName: true, tradeName: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.documentTemplate.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Gerar documento</h1>
        <p className="text-sm text-slate-500">
          Selecione o cliente e o modelo — os dados cadastrais são reutilizados
          automaticamente.
        </p>
      </div>
      <DocumentWizard
        action={generateDocumentAction}
        clients={clients.map((c) => ({ id: c.id, label: displayClientName(c) }))}
        templates={templates.map((t) => ({
          id: t.id,
          name: t.name,
          category: t.category,
          version: t.version,
          fields: parseFieldsSchema(t.fieldsSchema),
        }))}
        defaultClientId={clientId}
      />
    </div>
  );
}
