import { test } from "node:test";
import assert from "node:assert/strict";
import { brDayKey, mondayKey, parseDayKey } from "./br-time.ts";
import { distributeMonth, meiStatus, monthSegments, progressRow } from "./goals-calc.ts";

const META = 1621;
const sum = (values: number[]) => Math.round(values.reduce((a, b) => a + b, 0) * 100) / 100;

test("novembro/2026 tem 6 trechos: 1 dia, 4 semanas cheias e 1 dia", () => {
  const seg = monthSegments("2026-11-15");
  assert.deepEqual(seg.map((s) => s.days), [1, 7, 7, 7, 7, 1]);
  assert.equal(seg[0].weekStart, "2026-10-26");
  assert.equal(seg[5].start, "2026-11-30");
});

test("a soma das metas originais é exatamente a meta do mês, em todos os meses", () => {
  for (let year = 2026; year <= 2028; year++) {
    for (let month = 1; month <= 12; month++) {
      const day = `${year}-${String(month).padStart(2, "0")}-10`;
      const seg = distributeMonth({ anyDayOfMonth: day, today: "2020-01-01", monthlyGoal: META, receivedByDay: {} });
      assert.equal(sum(seg.map((s) => s.original)), META, day);
      assert.equal(seg.reduce((a, s) => a + s.days, 0), new Date(Date.UTC(year, month, 0)).getUTCDate(), day);
    }
  }
});

test("nada recebido no dia 1: a diferença já passa para a semana seguinte", () => {
  const seg = distributeMonth({ anyDayOfMonth: "2026-11-07", today: "2026-11-07", monthlyGoal: META, receivedByDay: {} });
  const week = seg.find((s) => s.weekStart === "2026-11-02")!;
  assert.ok(Math.abs(week.original - (META * 7) / 30) <= 0.01); // rateio em centavos
  assert.ok(week.adjusted > week.original);
});

test("semana abaixo da meta redistribui a diferença nas restantes", () => {
  const seg = distributeMonth({
    anyDayOfMonth: "2026-11-20",
    today: "2026-11-20",
    monthlyGoal: META,
    receivedByDay: { "2026-11-01": 54.03, "2026-11-03": 100, "2026-11-10": 378.23 },
  });
  const current = seg.find((s) => s.weekStart === "2026-11-16")!;
  // Até o dia 15 entraram 532,26; faltam 1088,74 em 15 dias, e esta semana tem 7.
  assert.equal(current.adjusted, Math.round(((META - 532.26) * 7 * 100) / 15) / 100);
  assert.ok(current.adjusted > current.original);
});

test("semana boa não reduz a meta das próximas", () => {
  const seg = distributeMonth({
    anyDayOfMonth: "2026-11-20",
    today: "2026-11-20",
    monthlyGoal: META,
    receivedByDay: { "2026-11-03": 1500 },
  });
  for (const s of seg.filter((x) => x.end >= "2026-11-20")) assert.equal(s.adjusted, s.original);
});

test("mês batido mantém a original e não gera meta negativa", () => {
  const seg = distributeMonth({
    anyDayOfMonth: "2026-11-20",
    today: "2026-11-20",
    monthlyGoal: META,
    receivedByDay: { "2026-11-03": 5000 },
  });
  assert.ok(seg.every((s) => s.adjusted >= s.original));
});

test("recebimento às 22h de Brasília fica no próprio dia; data só com dia não muda", () => {
  assert.equal(brDayKey(new Date("2026-11-08T01:00:00.000Z")), "2026-11-07");
  assert.equal(brDayKey(new Date("2026-11-08T00:00:00.000Z")), "2026-11-08");
});

test("segunda-feira e validação de data", () => {
  assert.equal(mondayKey("2026-11-08"), "2026-11-02"); // domingo
  assert.equal(mondayKey("2026-11-02"), "2026-11-02");
  assert.equal(parseDayKey("2026-02-31"), null);
  assert.equal(parseDayKey("15/12/2026"), null);
  assert.ok(parseDayKey("2026-12-15"));
});

test("progresso não mostra falta negativa", () => {
  assert.deepEqual(progressRow(100, 150, 20), { meta: 100, recebido: 150, aReceber: 20, falta: 0, percentual: 150 });
  assert.equal(progressRow(0, 10, 0).percentual, 0);
});

test("alerta do MEI a partir de 80%", () => {
  assert.equal(meiStatus(64799, 81000).alerta, false);
  assert.equal(meiStatus(64800, 81000).alerta, true);
  assert.equal(meiStatus(81001, 81000).ultrapassou, true);
});
