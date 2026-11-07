import "server-only";
import { prisma } from "@/lib/prisma";
import { addDaysKey, brDayKey, keyToUtc, mondayKey, monthEndKey, monthStartKey, parseDayKey, queryRange } from "@/lib/br-time";
import { distributeMonth, meiStatus, progressRow } from "@/lib/goals-calc";
import { OperationError, type Actor } from "@/lib/crm-operations";
import { logMcpAction } from "@/lib/mcp/audit";

const NO_LINE = "Sem linha definida";

/** Salário mínimo e teto do ano. Sem cadastro, usa o último ano conhecido e avisa. */
export async function getYearConfig(year: number) {
  const exact = await prisma.yearlyConfig.findUnique({ where: { year } });
  if (exact) {
    return { year, minimumWage: Number(exact.minimumWage), meiAnnualLimit: Number(exact.meiAnnualLimit), fallbackFrom: null as number | null };
  }
  const previous = await prisma.yearlyConfig.findFirst({ where: { year: { lt: year } }, orderBy: { year: "desc" } });
  if (!previous) throw new OperationError(`Não há salário mínimo cadastrado para ${year}. Cadastre em Metas.`);
  return { year, minimumWage: Number(previous.minimumWage), meiAnnualLimit: Number(previous.meiAnnualLimit), fallbackFrom: previous.year };
}

/**
 * Faturamento por dia: tudo que entrou no caixa, de qualquer linha, menos os
 * estornos de entrada na data do estorno (fechamento antigo não muda). Estorno
 * de saída é só devolução de despesa e não conta.
 */
async function loadMoney(fromKey: string, toKey: string) {
  const range = queryRange(fromKey, toKey);
  const [received, reversals, pending] = await Promise.all([
    prisma.receivable.findMany({
      where: { status: "RECEBIDO", reversesPayableId: null, receivedAt: range },
      select: { amount: true, receivedAt: true, businessLine: true },
    }),
    prisma.payable.findMany({
      where: { status: "PAGO", reversesReceivableId: { not: null }, paidAt: range },
      select: { amount: true, paidAt: true, reversesReceivableId: true },
    }),
    prisma.receivable.findMany({
      where: { status: "PENDENTE", dueDate: range },
      select: { amount: true, dueDate: true },
    }),
  ]);

  const byDay: Record<string, number> = {};
  const add = (key: string, value: number) => {
    if (key >= fromKey && key <= toKey) byDay[key] = (byDay[key] ?? 0) + value;
  };
  for (const r of received) add(brDayKey(r.receivedAt as Date), Number(r.amount));
  for (const p of reversals) add(brDayKey(p.paidAt as Date), -Number(p.amount));

  const pendingByDay: Record<string, number> = {};
  for (const r of pending) {
    const key = brDayKey(r.dueDate as Date);
    if (key >= fromKey && key <= toKey) pendingByDay[key] = (pendingByDay[key] ?? 0) + Number(r.amount);
  }

  // Linha de negócio, só para consulta: o estorno abate da linha da entrada original.
  const lineOf = new Map<string, string>();
  const originalIds = reversals.map((r) => r.reversesReceivableId as string);
  if (originalIds.length > 0) {
    const originals = await prisma.receivable.findMany({ where: { id: { in: originalIds } }, select: { id: true, businessLine: true } });
    for (const o of originals) lineOf.set(o.id, o.businessLine ?? NO_LINE);
  }
  const lineEntries = [
    ...received.map((r) => ({ line: r.businessLine ?? NO_LINE, day: brDayKey(r.receivedAt as Date), amount: Number(r.amount) })),
    ...reversals.map((p) => ({ line: lineOf.get(p.reversesReceivableId as string) ?? NO_LINE, day: brDayKey(p.paidAt as Date), amount: -Number(p.amount) })),
  ].filter((e) => e.day >= fromKey && e.day <= toKey);

  return { byDay, pendingByDay, lineEntries };
}

const sumRange = (map: Record<string, number>, from: string, to: string) =>
  Object.entries(map).reduce((total, [day, value]) => (day >= from && day <= to ? total + value : total), 0);

async function monthlyGoalFor(dayKey: string) {
  const first = monthStartKey(dayKey);
  const row = await prisma.goal.findUnique({ where: { type_periodStart: { type: "MENSAL", periodStart: keyToUtc(first) } } });
  if (row && !row.automatic && row.amount !== null) return { amount: Number(row.amount), automatic: false };
  const config = await getYearConfig(Number(dayKey.slice(0, 4)));
  return { amount: config.minimumWage, automatic: true };
}

/** Meta de uma semana somando os trechos de cada mês que ela cruza. */
async function weekGoal(monday: string, today: string, receivedByDay: Record<string, number>) {
  const manual = await prisma.goal.findUnique({ where: { type_periodStart: { type: "SEMANAL", periodStart: keyToUtc(monday) } } });
  if (manual && !manual.automatic && manual.amount !== null) {
    const amount = Number(manual.amount);
    return { original: amount, adjusted: amount, automatic: false };
  }
  const sunday = addDaysKey(monday, 6);
  const months = monthStartKey(monday) === monthStartKey(sunday) ? [monday] : [monday, sunday];
  let original = 0;
  let adjusted = 0;
  for (const day of months) {
    const { amount } = await monthlyGoalFor(day);
    const segment = distributeMonth({ anyDayOfMonth: day, today, monthlyGoal: amount, receivedByDay }).find((s) => s.weekStart === monday);
    original += segment?.original ?? 0;
    adjusted += segment?.adjusted ?? 0;
  }
  return { original: Math.round(original * 100) / 100, adjusted: Math.round(adjusted * 100) / 100, automatic: true };
}

export async function getGoalsProgress(now: Date = new Date()) {
  const today = brDayKey(new Date(now.getTime() + 1)); // +1 ms: "agora" é sempre um instante, nunca só o dia
  const year = today.slice(0, 4);
  const monday = mondayKey(today);
  const sunday = addDaysKey(monday, 6);
  const monthStart = monthStartKey(today);
  const monthEnd = monthEndKey(today);
  const yearStart = `${year}-01-01`;
  const eightWeeksStart = addDaysKey(monday, -49);

  // Do início mais antigo necessário até o fim do período mais longo.
  const from = [yearStart, eightWeeksStart, monday, addDaysKey(monday, -31)].sort()[0];
  const to = [sunday, monthEnd].sort()[1];
  const { byDay, pendingByDay, lineEntries } = await loadMoney(from, to);

  const config = await getYearConfig(Number(year));
  const monthly = await monthlyGoalFor(today);
  const week = await weekGoal(monday, today, byDay);

  const weekRow = progressRow(week.adjusted, sumRange(byDay, monday, sunday), sumRange(pendingByDay, monday, sunday));
  const monthRow = progressRow(monthly.amount, sumRange(byDay, monthStart, monthEnd), sumRange(pendingByDay, monthStart, monthEnd));
  const receivedYear = sumRange(byDay, yearStart, `${year}-12-31`);

  const last8Weeks = [];
  for (let i = 7; i >= 0; i--) {
    const start = addDaysKey(monday, -7 * i);
    const goal = await weekGoal(start, today, byDay);
    last8Weeks.push({
      weekStart: start,
      label: `${start.slice(8, 10)}/${start.slice(5, 7)}`,
      meta: goal.original,
      recebido: Math.round(sumRange(byDay, start, addDaysKey(start, 6)) * 100) / 100,
    });
  }

  const lines = new Map<string, { semana: number; mes: number; ano: number }>();
  for (const e of lineEntries) {
    const row = lines.get(e.line) ?? { semana: 0, mes: 0, ano: 0 };
    if (e.day >= monday && e.day <= sunday) row.semana += e.amount;
    if (e.day >= monthStart && e.day <= monthEnd) row.mes += e.amount;
    if (e.day >= yearStart) row.ano += e.amount;
    lines.set(e.line, row);
  }

  return {
    today,
    monthWeeks: distributeMonth({ anyDayOfMonth: today, today, monthlyGoal: monthly.amount, receivedByDay: byDay }),
    weekPeriod: { start: monday, end: sunday },
    monthPeriod: { start: monthStart, end: monthEnd },
    week: { ...weekRow, metaOriginal: week.original, metaAjustada: week.adjusted, automatica: week.automatic },
    month: { ...monthRow, automatica: monthly.automatic },
    year: { recebido: Math.round(receivedYear * 100) / 100 },
    mei: meiStatus(receivedYear, config.meiAnnualLimit),
    config,
    last8Weeks,
    byLine: [...lines.entries()]
      .map(([linha, v]) => ({ linha, semana: Math.round(v.semana * 100) / 100, mes: Math.round(v.mes * 100) / 100, ano: Math.round(v.ano * 100) / 100 }))
      .sort((a, b) => b.ano - a.ano),
  };
}

export type GoalsProgress = Awaited<ReturnType<typeof getGoalsProgress>>;

/** Define (ou devolve ao automático) a meta do mês ou da semana que contém a data. */
export async function setGoal(
  params: { type: "MENSAL" | "SEMANAL"; date: string; amount?: number; automatic?: boolean; notes?: string },
  actor: Actor,
) {
  if (!parseDayKey(params.date)) throw new OperationError(`Data inválida: "${params.date}". Use AAAA-MM-DD.`);
  if (!params.automatic && (params.amount === undefined || !(params.amount > 0))) {
    throw new OperationError("Informe um valor maior que zero, ou peça o cálculo automático.");
  }

  const start = params.type === "MENSAL" ? monthStartKey(params.date) : mondayKey(params.date);
  const end = params.type === "MENSAL" ? monthEndKey(params.date) : addDaysKey(start, 6);
  const key = { type: params.type, periodStart: keyToUtc(start) };
  const before = await prisma.goal.findUnique({ where: { type_periodStart: key } });
  const data = {
    periodEnd: keyToUtc(end),
    amount: params.automatic ? null : (params.amount as number).toFixed(2),
    automatic: Boolean(params.automatic),
    notes: params.notes ?? null,
  };
  const goal = await prisma.goal.upsert({ where: { type_periodStart: key }, update: data, create: { ...key, ...data } });

  await logMcpAction({
    tool: actor.tool,
    summary: `Meta ${params.type === "MENSAL" ? "mensal" : "semanal"} de ${start} ${params.automatic ? "voltou ao cálculo automático" : "definida"}`,
    userId: actor.userId,
    source: actor.source,
    entity: "Goal",
    entityId: goal.id,
    oldValue: before ? { amount: before.amount, automatic: before.automatic } : { automatic: true },
    newValue: { amount: data.amount, automatic: data.automatic },
  });
  return { tipo: params.type, inicio: start, fim: end, valor: data.amount === null ? null : Number(data.amount), automatica: data.automatic };
}

export async function setYearConfig(
  params: { year: number; minimumWage: number; meiAnnualLimit: number },
  actor: Actor,
) {
  if (!Number.isInteger(params.year) || params.year < 2020 || params.year > 2100) throw new OperationError("Ano inválido.");
  if (!(params.minimumWage > 0)) throw new OperationError("O salário mínimo precisa ser maior que zero.");
  if (!(params.meiAnnualLimit > 0)) throw new OperationError("O limite do MEI precisa ser maior que zero.");

  const before = await prisma.yearlyConfig.findUnique({ where: { year: params.year } });
  const data = { minimumWage: params.minimumWage.toFixed(2), meiAnnualLimit: params.meiAnnualLimit.toFixed(2) };
  const row = await prisma.yearlyConfig.upsert({ where: { year: params.year }, update: data, create: { year: params.year, ...data } });
  await logMcpAction({
    tool: actor.tool,
    summary: `Configuração de ${params.year} alterada`,
    userId: actor.userId,
    source: actor.source,
    entity: "YearlyConfig",
    entityId: row.id,
    oldValue: before ? { minimumWage: before.minimumWage, meiAnnualLimit: before.meiAnnualLimit } : null,
    newValue: data,
  });
}
