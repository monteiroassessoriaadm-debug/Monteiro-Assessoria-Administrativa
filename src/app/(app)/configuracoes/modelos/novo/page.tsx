import { requireRole } from "@/lib/permissions";
import { Role } from "@/generated/prisma/enums";
import { TemplateForm } from "../template-form";
import { createTemplateAction } from "../actions";

export default async function NovoModeloPage() {
  await requireRole(Role.ADMIN);

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Novo modelo de documento</h1>
      </div>
      <TemplateForm action={createTemplateAction} />
    </div>
  );
}
