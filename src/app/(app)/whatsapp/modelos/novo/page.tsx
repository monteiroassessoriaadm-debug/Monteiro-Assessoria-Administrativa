import { requireRole } from "@/lib/permissions";
import { Role } from "@/generated/prisma/enums";
import { WhatsAppTemplateForm } from "../template-form";
import { createWhatsAppTemplateAction } from "../actions";

export default async function NovoModeloWhatsAppPage() {
  await requireRole(Role.ADMIN, Role.GESTOR);

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Novo modelo de mensagem</h1>
      </div>
      <WhatsAppTemplateForm action={createWhatsAppTemplateAction} />
    </div>
  );
}
