import { prisma } from "@/lib/prisma";
import { displayClientName } from "@/lib/client-display";
import { EventForm } from "../event-form";
import { createCalendarEventAction } from "../actions";

export default async function NovoEventoPage() {
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
        <h1 className="text-xl font-bold text-slate-900">Novo evento</h1>
      </div>
      <EventForm
        action={createCalendarEventAction}
        users={users}
        clients={clients.map((c) => ({ id: c.id, label: displayClientName(c) }))}
      />
    </div>
  );
}
