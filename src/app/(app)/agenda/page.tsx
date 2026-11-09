import Link from "next/link";
import { Plus } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TableCard, TableCardList, TableCardEmpty } from "@/components/ui/table-card";
import { cn, formatWallTime } from "@/lib/utils";
import { brTodayRange } from "@/lib/br-time";
import { dayProgress, groupByWallDay, isEventOverdue, wallDayKey, wallNow } from "@/lib/agenda";
import { displayClientName } from "@/lib/client-display";
import { calendarEventStatusLabels, calendarEventTypeLabels } from "@/lib/lead-labels";
import { DeleteEventButton } from "./delete-event-button";
import { CompleteToggle, EventResult, NotDoneButton } from "./event-status";

const FILTERS = [
  { value: "todos", label: "Todos" },
  { value: "pendentes", label: "Pendentes" },
  { value: "concluidos", label: "Concluídos" },
] as const;

function dayTitle(day: string) {
  const d = new Date(`${day}T00:00:00.000Z`);
  const weekday = new Intl.DateTimeFormat("pt-BR", { weekday: "long", timeZone: "UTC" }).format(d);
  const date = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", timeZone: "UTC" }).format(d);
  return `${weekday.charAt(0).toUpperCase()}${weekday.slice(1)}, ${date}`;
}

export default async function AgendaPage({
  searchParams,
}: {
  searchParams: Promise<{ show?: string; status?: string }>;
}) {
  const { show, status } = await searchParams;
  const showPast = show === "passados";
  const filter = FILTERS.some((f) => f.value === status) ? status! : "todos";

  // A agenda guarda o horário digitado como se fosse UTC; o dia inteiro de hoje continua em "próximos".
  const { start: today } = brTodayRange();
  const now = wallNow();
  const todayKey = wallDayKey(now);

  // Busca o período inteiro: o progresso do dia conta todos, mesmo com filtro.
  const events = await prisma.calendarEvent.findMany({
    where: showPast ? { startAt: { lt: today } } : { startAt: { gte: today } },
    include: { client: true, responsible: true },
    orderBy: { startAt: showPast ? "desc" : "asc" },
    take: 150,
  });

  const days = groupByWallDay(events)
    .map((g) => ({
      ...g,
      progress: dayProgress(g.events),
      overdue: g.events.filter((e) => isEventOverdue(e, now)).length,
      shown: g.events.filter((e) =>
        filter === "pendentes" ? e.status === "PENDENTE" : filter === "concluidos" ? e.status === "CONCLUIDO" : true,
      ),
    }))
    .filter((g) => g.shown.length > 0);

  const href = (params: { show?: string; status?: string }) => {
    const q = new URLSearchParams();
    if (params.show) q.set("show", params.show);
    if (params.status && params.status !== "todos") q.set("status", params.status);
    const s = q.toString();
    return s ? `/agenda?${s}` : "/agenda";
  };
  const showParam = showPast ? "passados" : undefined;
  const emptyText =
    filter === "pendentes"
      ? "Nenhum compromisso pendente."
      : filter === "concluidos"
        ? "Nenhum compromisso concluído."
        : `Nenhum evento ${showPast ? "passado" : "agendado"}.`;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
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

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <div className="flex flex-wrap gap-2">
          <Link href={href({ status: filter })}>
            <Button variant={showPast ? "outline" : "primary"} size="sm">
              Próximos
            </Button>
          </Link>
          <Link href={href({ show: "passados", status: filter })}>
            <Button variant={showPast ? "primary" : "outline"} size="sm">
              Passados
            </Button>
          </Link>
        </div>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filtrar por situação">
          {FILTERS.map((f) => (
            <Link key={f.value} href={href({ show: showParam, status: f.value })}>
              <Button variant={filter === f.value ? "secondary" : "ghost"} size="sm">
                {f.label}
              </Button>
            </Link>
          ))}
        </div>
      </div>

      {days.length === 0 && (
        <>
          <Card className="hidden px-4 py-10 text-center text-sm text-slate-400 md:block">{emptyText}</Card>
          <TableCardList>
            <TableCardEmpty>{emptyText}</TableCardEmpty>
          </TableCardList>
        </>
      )}

      {days.map((day) => (
        <section key={day.day} aria-labelledby={`dia-${day.day}`} className="space-y-3">
          <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
            <h2 id={`dia-${day.day}`} className="flex items-center gap-2 text-base font-semibold text-slate-900">
              {dayTitle(day.day)}
              {day.day === todayKey && <Badge tone="blue">Hoje</Badge>}
            </h2>
            <div className="flex w-full items-center gap-3 sm:w-auto">
              {day.overdue > 0 && (
                <Badge tone="red" className="shrink-0 whitespace-nowrap">
                  {day.overdue} atrasado{day.overdue === 1 ? "" : "s"}
                </Badge>
              )}
              <span className="shrink-0 text-sm font-medium text-slate-700">{day.progress.texto}</span>
              <div
                className="h-2 min-w-16 flex-1 overflow-hidden rounded-full bg-slate-200 sm:w-24 sm:flex-none"
                role="progressbar"
                aria-label={`${day.progress.texto} em ${dayTitle(day.day)}`}
                aria-valuemin={0}
                aria-valuemax={day.progress.total}
                aria-valuenow={day.progress.concluidos}
              >
                <div
                  className="h-full rounded-full bg-emerald-500"
                  style={{ width: `${(day.progress.concluidos / day.progress.total) * 100}%` }}
                />
              </div>
            </div>
          </div>

          <Card className="table-scroll hidden overflow-x-auto md:block">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
                <tr>
                  <th className="w-14 px-2 py-3">
                    <span className="sr-only">Concluir</span>
                  </th>
                  <th className="px-4 py-3">Hora</th>
                  <th className="px-4 py-3">Título</th>
                  <th className="px-4 py-3">Tipo</th>
                  <th className="px-4 py-3">Cliente</th>
                  <th className="px-4 py-3">Responsável</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {day.shown.map((e) => {
                  const overdue = isEventOverdue(e, now);
                  const done = e.status === "CONCLUIDO";
                  const notDone = e.status === "NAO_REALIZADO";
                  return (
                    <tr
                      key={e.id}
                      className={cn(
                        "hover:bg-slate-50",
                        overdue && "bg-red-50/60 hover:bg-red-50",
                        notDone && "bg-purple-50/50 hover:bg-purple-50",
                      )}
                    >
                      <td className="px-2 py-1.5 align-top">
                        <CompleteToggle eventId={e.id} status={e.status} overdue={overdue} />
                      </td>
                      <td
                        className={cn(
                          "whitespace-nowrap px-4 py-3 align-top",
                          overdue ? "font-medium text-red-700" : "text-slate-600",
                          (done || notDone) && "text-slate-400",
                        )}
                      >
                        {formatWallTime(e.startAt)}
                      </td>
                      <td className="px-4 py-3 align-top">
                        <div className="flex flex-wrap items-center gap-2">
                          <Link
                            href={`/agenda/${e.id}`}
                            className={cn(
                              "font-medium hover:underline",
                              done ? "text-slate-400 line-through" : notDone ? "text-purple-900" : "text-slate-900",
                            )}
                          >
                            {e.title}
                          </Link>
                          {overdue && <Badge tone="red">Atrasado</Badge>}
                          {notDone && <Badge tone="purple">{calendarEventStatusLabels[e.status]}</Badge>}
                        </div>
                        <EventResult eventId={e.id} status={e.status} result={e.result} className="mt-1" />
                      </td>
                      <td className={cn("px-4 py-3 align-top", done && "opacity-50")}>
                        <Badge tone="blue">{calendarEventTypeLabels[e.type]}</Badge>
                      </td>
                      <td className={cn("px-4 py-3 align-top text-slate-600", done && "opacity-50")}>
                        {e.client ? displayClientName(e.client) : "-"}
                      </td>
                      <td className={cn("px-4 py-3 align-top text-slate-600", done && "opacity-50")}>
                        {e.responsible?.name ?? "-"}
                      </td>
                      <td className="px-4 py-3 text-right align-top">
                        <div className="flex items-center justify-end gap-1">
                          {e.status === "PENDENTE" && <NotDoneButton eventId={e.id} />}
                          <DeleteEventButton eventId={e.id} />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Card>

          <TableCardList>
            {day.shown.map((e) => {
              const overdue = isEventOverdue(e, now);
              const done = e.status === "CONCLUIDO";
              const notDone = e.status === "NAO_REALIZADO";
              return (
                <TableCard
                  key={e.id}
                  href={`/agenda/${e.id}`}
                  className={cn(overdue && "border-red-300", notDone && "border-purple-200")}
                  title={
                    <span className={cn(done && "text-slate-400 line-through", notDone && "text-purple-900")}>
                      {e.title}
                    </span>
                  }
                  subtitle={
                    <span className="flex flex-wrap items-center gap-2">
                      <span className={cn(overdue && "font-medium text-red-700")}>{formatWallTime(e.startAt)}</span>
                      {overdue && <Badge tone="red">Atrasado</Badge>}
                      {done && <Badge tone="green">{calendarEventStatusLabels[e.status]}</Badge>}
                      {notDone && <Badge tone="purple">{calendarEventStatusLabels[e.status]}</Badge>}
                    </span>
                  }
                  fields={[
                    { label: "Tipo", value: <Badge tone="blue">{calendarEventTypeLabels[e.type]}</Badge> },
                    { label: "Cliente", value: e.client ? displayClientName(e.client) : "-" },
                    { label: "Responsável", value: e.responsible?.name ?? "-" },
                  ]}
                  actions={
                    <>
                      <CompleteToggle eventId={e.id} status={e.status} variant="button" />
                      {e.status === "PENDENTE" && <NotDoneButton eventId={e.id} />}
                      <div className="ml-auto">
                        <DeleteEventButton eventId={e.id} />
                      </div>
                      <EventResult eventId={e.id} status={e.status} result={e.result} className="basis-full" />
                    </>
                  }
                />
              );
            })}
          </TableCardList>
        </section>
      ))}
    </div>
  );
}
