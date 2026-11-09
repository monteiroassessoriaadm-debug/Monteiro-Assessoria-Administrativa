"use client";

import { useOptimistic, useState, useTransition } from "react";
import { Check, Pencil, RotateCcw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { setEventStatusAction } from "./actions";

type Status = "PENDENTE" | "CONCLUIDO" | "NAO_REALIZADO";

/**
 * Concluir com um toque; tocar de novo desfaz. "round" é a caixinha da tabela,
 * "button" é o botão largo dos cartões do celular. Os dois têm 44px de toque.
 */
export function CompleteToggle({
  eventId,
  status,
  overdue = false,
  variant = "round",
}: {
  eventId: string;
  status: Status;
  overdue?: boolean;
  variant?: "round" | "button";
}) {
  const [pending, startTransition] = useTransition();
  const [shown, setShown] = useOptimistic(status);
  const next: Status = shown === "PENDENTE" ? "CONCLUIDO" : "PENDENTE";
  const label =
    shown === "PENDENTE" ? "Concluir" : shown === "CONCLUIDO" ? "Desfazer conclusão" : "Desfazer (voltar para pendente)";

  function toggle() {
    startTransition(async () => {
      setShown(next);
      await setEventStatusAction(eventId, next);
    });
  }

  if (variant === "button") {
    return shown === "PENDENTE" ? (
      <Button
        type="button"
        size="sm"
        onClick={toggle}
        disabled={pending}
        className="min-w-28 bg-emerald-600 text-white hover:bg-emerald-700"
      >
        <Check className="h-4 w-4" /> Concluir
      </Button>
    ) : (
      <Button type="button" size="sm" variant="outline" onClick={toggle} disabled={pending}>
        <RotateCcw className="h-4 w-4" /> Desfazer
      </Button>
    );
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={pending}
      aria-label={label}
      title={label}
      className="group inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full disabled:opacity-60"
    >
      <span
        className={cn(
          "flex h-7 w-7 items-center justify-center rounded-full border-2 transition-colors",
          shown === "CONCLUIDO" && "border-emerald-600 bg-emerald-600 text-white",
          shown === "NAO_REALIZADO" && "border-purple-500 bg-purple-500 text-white",
          shown === "PENDENTE" &&
            (overdue
              ? "border-red-400 text-transparent group-hover:text-red-400"
              : "border-slate-300 text-transparent group-hover:border-emerald-500 group-hover:text-emerald-500"),
        )}
      >
        {shown === "NAO_REALIZADO" ? <X className="h-4 w-4" /> : <Check className="h-4 w-4" />}
      </span>
    </button>
  );
}

export function NotDoneButton({ eventId }: { eventId: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="whitespace-nowrap"
      disabled={pending}
      onClick={() => startTransition(async () => void (await setEventStatusAction(eventId, "NAO_REALIZADO")))}
    >
      <X className="h-4 w-4" /> Não realizado
    </Button>
  );
}

/** Observação curta do resultado, só depois de concluído ou não realizado. */
export function EventResult({
  eventId,
  status,
  result,
  className,
}: {
  eventId: string;
  status: Status;
  result: string | null;
  className?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [pending, startTransition] = useTransition();
  if (status === "PENDENTE") return null;

  if (editing) {
    return (
      <form
        className={cn("flex w-full flex-wrap items-center gap-2", className)}
        action={(formData) =>
          startTransition(async () => {
            await setEventStatusAction(eventId, status, String(formData.get("result") ?? ""));
            setEditing(false);
          })
        }
      >
        <Input
          name="result"
          defaultValue={result ?? ""}
          maxLength={200}
          autoFocus
          placeholder="Ex.: mandei a mensagem, cliente respondeu, fechou"
          aria-label="Resultado"
          className="min-w-0 flex-1 basis-48"
        />
        <div className="flex gap-2">
          <Button type="submit" size="sm" disabled={pending}>
            {pending ? "Salvando..." : "Salvar"}
          </Button>
          <Button type="button" size="sm" variant="ghost" onClick={() => setEditing(false)}>
            Cancelar
          </Button>
        </div>
      </form>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      className={cn(
        "inline-flex min-h-11 max-w-full items-center gap-1.5 rounded-lg text-left text-sm md:min-h-0",
        result ? "text-slate-600 hover:text-slate-900" : "font-medium text-blue-700 hover:underline",
        className,
      )}
    >
      {result ? (
        <>
          <span className="min-w-0 break-words">Resultado: {result}</span>
          <Pencil className="h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden="true" />
        </>
      ) : (
        "+ Anotar resultado"
      )}
    </button>
  );
}
