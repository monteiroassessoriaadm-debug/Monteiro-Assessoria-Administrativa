"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/permissions";
import { taskSchema } from "@/lib/validations";
import { TaskStatus } from "@/generated/prisma/enums";

export type TaskFormState = {
  error?: string;
  fieldErrors?: Record<string, string>;
};

export async function createTaskAction(
  _prevState: TaskFormState,
  formData: FormData,
): Promise<TaskFormState> {
  const session = await requireSession();

  const parsed = taskSchema.safeParse({
    title: formData.get("title") || "",
    description: formData.get("description") || undefined,
    assignedToId: formData.get("assignedToId") || undefined,
    dueDate: formData.get("dueDate") || undefined,
    clientId: formData.get("clientId") || undefined,
  });

  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      fieldErrors[String(issue.path[0])] = issue.message;
    }
    return { error: "Verifique os campos destacados.", fieldErrors };
  }

  const data = parsed.data;
  await prisma.task.create({
    data: {
      title: data.title,
      description: data.description || null,
      assignedToId: data.assignedToId || null,
      dueDate: data.dueDate ? new Date(data.dueDate) : null,
      clientId: data.clientId || null,
      createdById: session.userId,
    },
  });

  revalidatePath("/tarefas");
  redirect("/tarefas");
}

export async function toggleTaskDoneAction(taskId: string) {
  await requireSession();
  const task = await prisma.task.findUnique({ where: { id: taskId } });
  if (!task) return;

  const done = task.status === TaskStatus.CONCLUIDA;
  await prisma.task.update({
    where: { id: taskId },
    data: {
      status: done ? TaskStatus.PENDENTE : TaskStatus.CONCLUIDA,
      completedAt: done ? null : new Date(),
    },
  });

  revalidatePath("/tarefas");
}
