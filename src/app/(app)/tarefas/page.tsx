import Link from "next/link";
import { Plus } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/permissions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatDateBR } from "@/lib/utils";
import { displayClientName } from "@/lib/client-display";
import { ToggleTaskButton } from "./toggle-task-button";

export default async function TarefasPage({
  searchParams,
}: {
  searchParams: Promise<{ assignedTo?: string }>;
}) {
  const session = await requireSession();
  const { assignedTo } = await searchParams;
  const isAdmin = session.role === "ADMIN" || session.role === "GESTOR";
  const targetUserId = isAdmin && assignedTo ? assignedTo : session.userId;

  const [tasks, users, targetUser] = await Promise.all([
    prisma.task.findMany({
      where: { assignedToId: targetUserId },
      include: { client: true },
      orderBy: [{ status: "asc" }, { dueDate: "asc" }],
    }),
    isAdmin
      ? prisma.user.findMany({
          where: { active: true },
          select: { id: true, name: true },
          orderBy: { name: "asc" },
        })
      : Promise.resolve([]),
    prisma.user.findUnique({ where: { id: targetUserId }, select: { name: true } }),
  ]);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const pending = tasks.filter((t) => t.status === "PENDENTE");
  const done = tasks.filter((t) => t.status === "CONCLUIDA");

  const overdue = pending.filter((t) => t.dueDate && t.dueDate < today);
  const dueToday = pending.filter((t) => t.dueDate && t.dueDate >= today && t.dueDate < tomorrow);
  const upcoming = pending.filter((t) => !t.dueDate || t.dueDate >= tomorrow);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">
            {targetUserId === session.userId ? "Minhas tarefas" : `Tarefas de ${targetUser?.name}`}
          </h1>
          <p className="text-sm text-slate-500">
            Organizadas por prazo — atrasadas, de hoje, próximas e concluídas.
          </p>
        </div>
        <Link href="/tarefas/novo">
          <Button>
            <Plus className="h-4 w-4" /> Nova tarefa
          </Button>
        </Link>
      </div>

      {isAdmin && users.length > 0 && (
        <form className="flex gap-3">
          <select
            name="assignedTo"
            defaultValue={targetUserId}
            className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm"
          >
            <option value={session.userId}>Minhas tarefas</option>
            {users
              .filter((u) => u.id !== session.userId)
              .map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
          </select>
          <Button type="submit" variant="outline">
            Ver
          </Button>
        </form>
      )}

      <TaskGroup title="🔴 Atrasadas" tasks={overdue} />
      <TaskGroup title="🟠 Hoje" tasks={dueToday} />
      <TaskGroup title="🟡 Próximas" tasks={upcoming} />
      <TaskGroup title="🟢 Concluídas" tasks={done} />
    </div>
  );
}

function TaskGroup({
  title,
  tasks,
}: {
  title: string;
  tasks: {
    id: string;
    title: string;
    description: string | null;
    dueDate: Date | null;
    status: string;
    client: { type: string; fullName: string | null; legalName: string | null; tradeName: string | null } | null;
  }[];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {title} ({tasks.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {tasks.length === 0 ? (
          <p className="text-sm text-slate-400">Nenhuma tarefa aqui.</p>
        ) : (
          tasks.map((task) => (
            <div
              key={task.id}
              className="flex items-start gap-3 rounded-lg border border-slate-100 px-3 py-2"
            >
              <div className="mt-0.5">
                <ToggleTaskButton taskId={task.id} done={task.status === "CONCLUIDA"} />
              </div>
              <div className="flex-1">
                <p className={task.status === "CONCLUIDA" ? "text-sm text-slate-400 line-through" : "text-sm text-slate-800"}>
                  {task.title}
                </p>
                <p className="text-xs text-slate-400">
                  {task.client && displayClientName(task.client)}
                  {task.client && task.dueDate && " · "}
                  {task.dueDate && `Prazo: ${formatDateBR(task.dueDate)}`}
                </p>
                {task.description && (
                  <p className="mt-1 text-xs text-slate-500">{task.description}</p>
                )}
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
