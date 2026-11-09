import Link from "next/link";
import { notFound } from "next/navigation";
import { Pencil } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { displayClientName } from "@/lib/client-display";
import { cn, formatInstantBR, formatWallDateTime } from "@/lib/utils";
import { isEventOverdue } from "@/lib/agenda";
import { calendarEventStatusLabels, calendarEventStatusTone, calendarEventTypeLabels } from "@/lib/lead-labels";
import { DeleteEventButton } from "../delete-event-button";
import { CompleteToggle, EventResult, NotDoneButton } from "../event-status";

export default async function EventoDetalhePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const event = await prisma.calendarEvent.findUnique({
    where: { id },
    include: { client: true, responsible: true, mediaContent: true },
  });
  if (!event) notFound();
  const overdue = isEventOverdue(event);

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1
            className={cn(
              "break-words text-xl font-bold",
              event.status === "CONCLUIDO" ? "text-slate-400 line-through" : "text-slate-900",
            )}
          >
            {event.title}
          </h1>
          <p className={cn("text-sm", overdue ? "font-medium text-red-700" : "text-slate-500")}>
            {formatWallDateTime(event.startAt)}
            {overdue && " · Atrasado"}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link href={`/agenda/${event.id}/editar`}>
            <Button variant="outline">
              <Pencil className="h-4 w-4" /> Editar
            </Button>
          </Link>
          <DeleteEventButton eventId={event.id} />
        </div>
      </div>
      <Card className={cn(overdue && "border-red-300", event.status === "NAO_REALIZADO" && "border-purple-200")}>
        <CardContent className="space-y-3 pt-5 text-sm">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={overdue ? "red" : calendarEventStatusTone[event.status]}>
              {overdue ? "Atrasado" : calendarEventStatusLabels[event.status]}
            </Badge>
            {event.completedAt && (
              <span className="text-slate-500">
                {event.status === "CONCLUIDO" ? "Concluído" : "Marcado"} em {formatInstantBR(event.completedAt)}
              </span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <CompleteToggle eventId={event.id} status={event.status} variant="button" />
            {event.status === "PENDENTE" && <NotDoneButton eventId={event.id} />}
          </div>
          <EventResult eventId={event.id} status={event.status} result={event.result} />
          {event.type === "PUBLICACAO" && event.mediaContent && (
            <p className="text-slate-500">
              Ligado ao conteúdo{" "}
              <Link href={`/midia/${event.mediaContent.id}`} className="text-blue-700 hover:underline">
                #{event.mediaContent.number} {event.mediaContent.title}
              </Link>
              . Concluir aqui marca o conteúdo como publicado.
            </p>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardContent className="grid grid-cols-1 gap-x-6 gap-y-3 pt-5 text-sm sm:grid-cols-2">
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-400">Tipo</p>
            <Badge tone="blue">{calendarEventTypeLabels[event.type]}</Badge>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-400">Término</p>
            <p className="text-slate-800">{event.endAt ? formatWallDateTime(event.endAt) : "-"}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-400">Cliente</p>
            {event.client ? (
              <Link href={`/clientes/${event.client.id}`} className="text-blue-700 hover:underline">
                {displayClientName(event.client)}
              </Link>
            ) : (
              <p className="text-slate-800">-</p>
            )}
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-400">Responsável</p>
            <p className="text-slate-800">{event.responsible?.name ?? "-"}</p>
          </div>
          <div className="sm:col-span-2">
            <p className="text-xs uppercase tracking-wide text-slate-400">Observações</p>
            <p className="whitespace-pre-wrap text-slate-800">{event.notes || "-"}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
