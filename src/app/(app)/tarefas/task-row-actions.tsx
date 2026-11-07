"use client";

import { useTransition } from "react";
import Link from "next/link";
import { Pencil, Trash2 } from "lucide-react";
import { deleteTaskAction } from "./actions";

const ICON_BUTTON =
  "inline-flex h-11 w-11 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 disabled:opacity-50 md:h-8 md:w-8";

export function TaskRowActions({ taskId }: { taskId: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex shrink-0 items-center">
      <Link href={`/tarefas/${taskId}/editar`} aria-label="Editar tarefa" className={ICON_BUTTON}>
        <Pencil className="h-4 w-4" />
      </Link>
      <button
        type="button"
        aria-label="Excluir tarefa"
        disabled={pending}
        className={ICON_BUTTON}
        onClick={() => {
          if (!window.confirm("Excluir esta tarefa? Uma cópia fica guardada no Histórico.")) return;
          startTransition(() => deleteTaskAction(taskId));
        }}
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );
}
