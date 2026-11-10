import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/permissions";
import { Role } from "@/generated/prisma/enums";
import { parseContractFields } from "@/lib/contract-render";
import { TemplateForm } from "../../template-form";
import { updateTemplateAction } from "../../../actions";

export default async function EditarModeloPage({ params }: { params: Promise<{ id: string }> }) {
  await requireRole(Role.ADMIN);
  const { id } = await params;
  const t = await prisma.contractTemplate.findUnique({ where: { id } });
  if (!t) notFound();

  return (
    <div className="max-w-4xl space-y-6">
      <h1 className="text-xl font-bold text-slate-900">Editar modelo</h1>
      <TemplateForm
        action={updateTemplateAction.bind(null, t.id)}
        versionNote={`Você está editando a versão ${t.version}. Ao salvar, nasce a versão seguinte e ela passa a ser a ativa.`}
        defaults={{
          name: t.name,
          slug: t.slug ?? "",
          kind: t.kind,
          category: t.category ?? "",
          description: t.description ?? "",
          content: t.content,
          fields: parseContractFields(t.fieldsSchema),
        }}
      />
    </div>
  );
}
