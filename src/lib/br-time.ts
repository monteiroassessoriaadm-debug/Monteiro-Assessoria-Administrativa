// Calendário no fuso de Brasília. Sem dependências, para rodar também nos testes.
//
// O banco guarda dois tipos de data: "só o dia" (meia-noite UTC, vinda de um
// campo YYYY-MM-DD) e instantes reais (new Date()). Só o dia já é o dia certo;
// um instante precisa ser convertido, senão um recebimento às 22h de Brasília
// cairia no dia seguinte.

const TZ = "America/Sao_Paulo";
const DAY_MS = 24 * 60 * 60 * 1000;

const keyFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

export function isDateOnly(date: Date) {
  return date.getTime() % DAY_MS === 0;
}

/** Dia (YYYY-MM-DD) a que a data pertence no calendário de Brasília. */
export function brDayKey(date: Date) {
  if (isDateOnly(date)) return date.toISOString().slice(0, 10);
  return keyFormatter.format(date);
}

export function keyToUtc(key: string) {
  return new Date(`${key}T00:00:00.000Z`);
}

export function addDaysKey(key: string, days: number) {
  return new Date(keyToUtc(key).getTime() + days * DAY_MS).toISOString().slice(0, 10);
}

/** Segunda-feira da semana do dia informado. */
export function mondayKey(key: string) {
  const weekday = keyToUtc(key).getUTCDay(); // 0 = domingo
  return addDaysKey(key, weekday === 0 ? -6 : 1 - weekday);
}

export function monthStartKey(key: string) {
  return `${key.slice(0, 7)}-01`;
}

export function monthEndKey(key: string) {
  const [y, m] = key.split("-").map(Number);
  return new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10);
}

export function daysBetween(fromKey: string, toKey: string) {
  return Math.round((keyToUtc(toKey).getTime() - keyToUtc(fromKey).getTime()) / DAY_MS);
}

/** Hoje em Brasília, nos dois limites usados para comparar campos "só o dia". */
export function brTodayRange(now: Date = new Date()) {
  const start = keyToUtc(keyFormatter.format(now));
  return { start, end: new Date(start.getTime() + DAY_MS - 1) };
}

/** Limites de consulta que cobrem os dois tipos de data; filtre depois com brDayKey. */
export function queryRange(fromKey: string, toKey: string) {
  return {
    gte: keyToUtc(fromKey),
    lt: new Date(keyToUtc(toKey).getTime() + DAY_MS + 3 * 60 * 60 * 1000),
  };
}

/** Valida YYYY-MM-DD de verdade: 31/02 não vira 03/03. */
export function parseDayKey(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = keyToUtc(value);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) return null;
  return date;
}
