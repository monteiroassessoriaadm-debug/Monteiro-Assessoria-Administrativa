import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/permissions";
import { Role } from "@/generated/prisma/enums";
import { UserForm } from "../../user-form";
import { updateUserAction } from "../../actions";

export default async function EditarUsuarioPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireRole(Role.ADMIN);
  const { id } = await params;
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) notFound();

  const boundAction = updateUserAction.bind(null, id);

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Editar usuário</h1>
      </div>
      <UserForm
        action={boundAction}
        isEdit
        submitLabel="Salvar alterações"
        defaults={{
          name: user.name,
          email: user.email,
          role: user.role,
          active: user.active,
        }}
      />
    </div>
  );
}
