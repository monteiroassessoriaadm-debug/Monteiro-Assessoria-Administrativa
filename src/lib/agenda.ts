// Regras da agenda sem banco de dados, usadas pelas telas e pelo conector e testadas à parte.
//
// A agenda guarda o horário digitado (Brasília) como se fosse UTC. Para comparar
// com "agora", o agora também vira horário de parede.
import { isDateOnly } from "./br-time.ts";

const DAY_MS = 24 * 60 * 60 * 1000;

const partsFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/Sao_Paulo",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

/** Agora em Brasília, no mesmo formato de parede dos compromissos. */
export function wallNow(now: Date = new Date()) {
  const p = Object.fromEntries(partsFormatter.formatToParts(now).map((x) => [x.type, x.value]));
  return new Date(Date.UTC(Number(p.year), Number(p.month) - 1, Number(p.day), Number(p.hour), Number(p.minute)));
}

/** Dia (YYYY-MM-DD) de um horário de parede. */
export function wallDayKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

type EventLike = { status: string; startAt: Date; endAt?: Date | null };

/**
 * Pendente cujo horário já passou. Compromisso de dia inteiro só atrasa no dia
 * seguinte; com término, conta o término (uma reunião em andamento não está atrasada).
 */
export function isEventOverdue(event: EventLike, now: Date = wallNow()) {
  if (event.status !== "PENDENTE") return false;
  if (!event.endAt && isDateOnly(event.startAt)) return event.startAt.getTime() + DAY_MS <= now.getTime();
  return (event.endAt ?? event.startAt).getTime() < now.getTime();
}

/** "X de Y concluídos" de um dia. Não realizado conta no total, mas não como concluído. */
export function dayProgress(events: { status: string }[]) {
  const total = events.length;
  const concluidos = events.filter((e) => e.status === "CONCLUIDO").length;
  return { concluidos, total, texto: `${concluidos} de ${total} concluído${total === 1 ? "" : "s"}` };
}

/** Agrupa por dia mantendo a ordem em que os compromissos vieram. */
export function groupByWallDay<T extends { startAt: Date }>(events: T[]) {
  const groups: { day: string; events: T[] }[] = [];
  for (const e of events) {
    const day = wallDayKey(e.startAt);
    const last = groups[groups.length - 1];
    if (last && last.day === day) last.events.push(e);
    else groups.push({ day, events: [e] });
  }
  return groups;
}
