import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/permissions";
import { Role } from "@/generated/prisma/enums";
import { WhatsAppTemplateForm } from "../../template-form";
import { updateWhatsAppTemplateAction } from "../../actions";

export default async function EditarModeloWhatsAppPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireRole(Role.ADMIN, Role.GESTOR);
  const { id } = await params;

  const template = await prisma.whatsAppTemplate.findUnique({ where: { id } });
  if (!template) notFound();

  const boundAction = updateWhatsAppTemplateAction.bind(null, id);

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Editar modelo</h1>
      </div>
      <WhatsAppTemplateForm
        action={boundAction}
        submitLabel="Salvar alterações"
        defaultValues={{
          name: template.name,
          category: template.category ?? undefined,
          content: template.content,
          active: template.active,
        }}
      />
    </div>
  );
}
