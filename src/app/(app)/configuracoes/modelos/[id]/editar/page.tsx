import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/permissions";
import { Role } from "@/generated/prisma/enums";
import { parseFieldsSchema } from "@/lib/document-tokens";
import { TemplateForm } from "../../template-form";
import { updateTemplateAction } from "../../actions";

export default async function EditarModeloPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireRole(Role.ADMIN);
  const { id } = await params;

  const template = await prisma.documentTemplate.findUnique({ where: { id } });
  if (!template) notFound();

  const boundAction = updateTemplateAction.bind(null, id);

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">
          Editar modelo — {template.name} (v{template.version})
        </h1>
      </div>
      <TemplateForm
        action={boundAction}
        submitLabel="Salvar como nova versão"
        versionNote={`Salvar aqui cria a versão ${template.version + 1}. Documentos já gerados continuam vinculados à versão ${template.version}.`}
        defaults={{
          name: template.name,
          category: template.category ?? undefined,
          content: template.content,
          headerNote: template.headerNote ?? undefined,
          footerNote: template.footerNote ?? undefined,
          fields: parseFieldsSchema(template.fieldsSchema),
        }}
      />
    </div>
  );
}
