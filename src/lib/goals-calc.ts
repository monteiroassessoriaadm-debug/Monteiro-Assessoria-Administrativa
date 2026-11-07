// Regras de cálculo das metas, sem banco de dados, para poderem ser testadas.
import {
  addDaysKey,
  daysBetween,
  mondayKey,
  monthEndKey,
  monthStartKey,
} from "./br-time.ts";

const round2 = (v: number) => Math.round(v * 100) / 100;

export type MonthSegment = {
  weekStart: string; // segunda-feira da semana
  start: string; // primeiro dia da semana dentro do mês
  end: string; // último dia da semana dentro do mês
  days: number;
  original: number;
  adjusted: number;
  received: number;
};

/** Trechos segunda a domingo de um mês; semanas na virada ficam só com os dias deste mês. */
export function monthSegments(anyDayOfMonth: string) {
  const first = monthStartKey(anyDayOfMonth);
  const last = monthEndKey(anyDayOfMonth);
  const segments: { weekStart: string; start: string; end: string; days: number }[] = [];
  let start = first;
  while (start <= last) {
    const weekStart = mondayKey(start);
    const sunday = addDaysKey(weekStart, 6);
    const end = sunday < last ? sunday : last;
    segments.push({ weekStart, start, end, days: daysBetween(start, end) + 1 });
    start = addDaysKey(end, 1);
  }
  return segments;
}

/** Reparte em centavos sem perder nenhum: a soma das partes é exatamente o total. */
function splitExact(total: number, weights: number[]) {
  const totalCents = Math.round(total * 100);
  const sum = weights.reduce((a, b) => a + b, 0);
  if (sum === 0) return weights.map(() => 0);
  const exact = weights.map((w) => (totalCents * w) / sum);
  const cents = exact.map(Math.floor);
  let missing = totalCents - cents.reduce((a, b) => a + b, 0);
  const order = exact
    .map((v, i) => ({ i, frac: v - Math.floor(v) }))
    .sort((a, b) => b.frac - a.frac || a.i - b.i);
  for (let k = 0; missing > 0; k = (k + 1) % order.length, missing--) cents[order[k].i]++;
  return cents.map((c) => c / 100);
}

/**
 * Meta de cada semana do mês. A original é proporcional aos dias. A ajustada
 * redistribui o que faltou nas semanas já fechadas pelos dias restantes; nunca
 * fica abaixo da original, então semana boa não reduz a meta das próximas.
 */
export function distributeMonth(params: {
  anyDayOfMonth: string;
  today: string;
  monthlyGoal: number;
  receivedByDay: Record<string, number>;
}): MonthSegment[] {
  const { anyDayOfMonth, today, monthlyGoal, receivedByDay } = params;
  const segments = monthSegments(anyDayOfMonth);
  const originals = splitExact(monthlyGoal, segments.map((s) => s.days));
  const monthEnd = monthEndKey(anyDayOfMonth);

  const sumRange = (from: string, to: string) => {
    let total = 0;
    for (const [day, value] of Object.entries(receivedByDay)) {
      if (day >= from && day <= to) total += value;
    }
    return total;
  };

  const current = segments.find((s) => s.start <= today && today <= s.end);

  return segments.map((s, i) => {
    // Semana fechada mostra a meta como estava quando começou. Semana atual e
    // futuras olham para o que entrou até o início da semana atual.
    const asOf = s.end < today || !current ? s.start : current.start;
    const before = asOf > monthStartKey(anyDayOfMonth) ? sumRange(monthStartKey(anyDayOfMonth), addDaysKey(asOf, -1)) : 0;
    const remainingDays = daysBetween(asOf, monthEnd) + 1;
    const needed = Math.max(0, monthlyGoal - before);
    const share = remainingDays > 0 ? (needed * s.days) / remainingDays : 0;
    return {
      ...s,
      original: originals[i],
      adjusted: round2(Math.max(originals[i], share)),
      received: round2(sumRange(s.start, s.end)),
    };
  });
}

export function progressRow(goal: number, received: number, toReceive: number) {
  return {
    meta: round2(goal),
    recebido: round2(received),
    aReceber: round2(toReceive),
    falta: round2(Math.max(0, goal - received)),
    percentual: goal > 0 ? Math.round((received / goal) * 1000) / 10 : 0,
  };
}

export function meiStatus(receivedInYear: number, limit: number) {
  const percentual = limit > 0 ? Math.round((receivedInYear / limit) * 1000) / 10 : 0;
  return {
    recebidoNoAno: round2(receivedInYear),
    limite: round2(limit),
    restante: round2(Math.max(0, limit - receivedInYear)),
    percentual,
    alerta: limit > 0 && receivedInYear >= limit * 0.8, // compara o valor real, não o percentual arredondado
    ultrapassou: receivedInYear > limit,
  };
}
