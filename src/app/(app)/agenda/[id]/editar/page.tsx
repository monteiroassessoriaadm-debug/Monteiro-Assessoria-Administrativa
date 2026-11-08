import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { displayClientName } from "@/lib/client-display";
import { EventForm } from "../../event-form";
import { updateCalendarEventAction } from "../../actions";

// O campo datetime-local usa o mesmo horário "de parede" que a agenda guarda.
const toLocalInput = (date: Date | null) => (date ? date.toISOString().slice(0, 16) : "");

export default async function EditarEventoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [event, users, clients] = await Promise.all([
    prisma.calendarEvent.findUnique({ where: { id } }),
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
  if (!event) notFound();

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Editar evento</h1>
      </div>
      <EventForm
        action={updateCalendarEventAction.bind(null, event.id)}
        users={users}
        clients={clients.map((c) => ({ id: c.id, label: displayClientName(c) }))}
        submitLabel="Salvar alterações"
        defaults={{
          title: event.title,
          type: event.type,
          responsibleId: event.responsibleId ?? "",
          startAt: toLocalInput(event.startAt),
          endAt: toLocalInput(event.endAt),
          clientId: event.clientId ?? "",
          notes: event.notes ?? "",
        }}
      />
    </div>
  );
}
