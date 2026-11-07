import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { TaskForm } from "../../task-form";
import { updateTaskAction } from "../../actions";

export default async function EditarTarefaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [task, users] = await Promise.all([
    prisma.task.findUnique({ where: { id } }),
    prisma.user.findMany({
      where: { active: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);
  if (!task) notFound();

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Editar tarefa</h1>
      </div>
      <TaskForm
        action={updateTaskAction.bind(null, task.id)}
        users={users}
        defaultAssignedToId={task.assignedToId ?? ""}
        submitLabel="Salvar alterações"
        defaults={{
          title: task.title,
          description: task.description ?? "",
          dueDate: task.dueDate ? task.dueDate.toISOString().slice(0, 10) : "",
        }}
      />
    </div>
  );
}
