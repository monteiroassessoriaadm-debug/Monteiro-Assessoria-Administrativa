import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/permissions";
import { displayClientName } from "@/lib/client-display";
import { TaskForm } from "../task-form";
import { createTaskAction } from "../actions";

export default async function NovaTarefaPage() {
  const session = await requireSession();

  const [users, clients] = await Promise.all([
    prisma.user.findMany({
      where: { active: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.client.findMany({
      where: { status: "ATIVO" },
      select: { id: true, type: true, fullName: true, legalName: true, tradeName: true },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Nova tarefa</h1>
      </div>
      <TaskForm
        action={createTaskAction}
        users={users}
        clients={clients.map((c) => ({ id: c.id, label: displayClientName(c) }))}
        defaultAssignedToId={session.userId}
      />
    </div>
  );
}
