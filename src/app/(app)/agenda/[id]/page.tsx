import Link from "next/link";
import { notFound } from "next/navigation";
import { Pencil } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { displayClientName } from "@/lib/client-display";
import { formatWallDateTime } from "@/lib/utils";
import { calendarEventTypeLabels } from "@/lib/lead-labels";
import { DeleteEventButton } from "../delete-event-button";

export default async function EventoDetalhePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const event = await prisma.calendarEvent.findUnique({
    where: { id },
    include: { client: true, responsible: true },
  });
  if (!event) notFound();

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl font-bold text-slate-900">{event.title}</h1>
          <p className="text-sm text-slate-500">{formatWallDateTime(event.startAt)}</p>
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
