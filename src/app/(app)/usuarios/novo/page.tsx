import { requireRole } from "@/lib/permissions";
import { Role } from "@/generated/prisma/enums";
import { UserForm } from "../user-form";
import { createUserAction } from "../actions";

export default async function NovoUsuarioPage() {
  await requireRole(Role.ADMIN);

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Novo usuário</h1>
      </div>
      <UserForm action={createUserAction} />
    </div>
  );
}
