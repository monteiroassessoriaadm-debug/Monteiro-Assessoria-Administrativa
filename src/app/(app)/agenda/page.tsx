import Link from "next/link";
import { Plus } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDateTimeBR } from "@/lib/utils";
import { displayClientName } from "@/lib/client-display";
import { calendarEventTypeLabels } from "@/lib/lead-labels";
import { DeleteEventButton } from "./delete-event-button";

export default async function AgendaPage({
  searchParams,
}: {
  searchParams: Promise<{ show?: string }>;
}) {
  const { show } = await searchParams;
  const showPast = show === "passados";

  const now = new Date();

  const events = await prisma.calendarEvent.findMany({
    where: showPast ? { startAt: { lt: now } } : { startAt: { gte: now } },
    include: { client: true, responsible: true },
    orderBy: { startAt: showPast ? "desc" : "asc" },
    take: 100,
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Agenda</h1>
          <p className="text-sm text-slate-500">
            Atendimentos, reuniões, prazos, entregas e demais compromissos da Monteiro.
          </p>
        </div>
        <Link href="/agenda/novo">
          <Button>
            <Plus className="h-4 w-4" /> Novo evento
          </Button>
        </Link>
      </div>

      <div className="flex gap-2">
        <Link href="/agenda">
          <Button variant={showPast ? "outline" : "primary"} size="sm">
            Próximos
          </Button>
        </Link>
        <Link href="/agenda?show=passados">
          <Button variant={showPast ? "primary" : "outline"} size="sm">
            Passados
          </Button>
        </Link>
      </div>

      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Data/hora</th>
              <th className="px-4 py-3">Título</th>
              <th className="px-4 py-3">Tipo</th>
              <th className="px-4 py-3">Cliente</th>
              <th className="px-4 py-3">Responsável</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {events.map((e) => (
              <tr key={e.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 text-slate-600">{formatDateTimeBR(e.startAt)}</td>
                <td className="px-4 py-3 font-medium text-slate-900">{e.title}</td>
                <td className="px-4 py-3">
                  <Badge tone="blue">{calendarEventTypeLabels[e.type]}</Badge>
                </td>
                <td className="px-4 py-3 text-slate-600">
                  {e.client ? displayClientName(e.client) : "-"}
                </td>
                <td className="px-4 py-3 text-slate-600">{e.responsible?.name ?? "-"}</td>
                <td className="px-4 py-3 text-right">
                  <DeleteEventButton eventId={e.id} />
                </td>
              </tr>
            ))}
            {events.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-slate-400">
                  Nenhum evento {showPast ? "passado" : "agendado"}.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
