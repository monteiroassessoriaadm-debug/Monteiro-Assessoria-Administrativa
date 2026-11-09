import { test } from "node:test";
import assert from "node:assert/strict";
import { dayProgress, groupByWallDay, isEventOverdue, wallNow } from "./agenda.ts";

const wall = (iso: string) => new Date(`${iso}Z`);

test("agora de parede é o horário de Brasília guardado como UTC", () => {
  // 17:30 UTC = 14:30 em Brasília
  assert.equal(wallNow(new Date("2026-11-09T17:30:00Z")).toISOString(), "2026-11-09T14:30:00.000Z");
  // 01:00 UTC ainda é o dia anterior em Brasília
  assert.equal(wallNow(new Date("2026-11-10T01:00:00Z")).toISOString(), "2026-11-09T22:00:00.000Z");
});

test("pendente com horário passado fica atrasado; concluído nunca", () => {
  const now = wall("2026-11-09T14:30:00");
  assert.equal(isEventOverdue({ status: "PENDENTE", startAt: wall("2026-11-09T10:00:00") }, now), true);
  assert.equal(isEventOverdue({ status: "PENDENTE", startAt: wall("2026-11-09T15:00:00") }, now), false);
  assert.equal(isEventOverdue({ status: "CONCLUIDO", startAt: wall("2026-11-09T10:00:00") }, now), false);
  assert.equal(isEventOverdue({ status: "NAO_REALIZADO", startAt: wall("2026-11-09T10:00:00") }, now), false);
});

test("reunião em andamento não está atrasada; depois do término sim", () => {
  const ev = { status: "PENDENTE", startAt: wall("2026-11-09T14:00:00"), endAt: wall("2026-11-09T15:00:00") };
  assert.equal(isEventOverdue(ev, wall("2026-11-09T14:30:00")), false);
  assert.equal(isEventOverdue(ev, wall("2026-11-09T15:01:00")), true);
});

test("dia inteiro só atrasa no dia seguinte", () => {
  const ev = { status: "PENDENTE", startAt: wall("2026-11-09T00:00:00") };
  assert.equal(isEventOverdue(ev, wall("2026-11-09T23:59:00")), false);
  assert.equal(isEventOverdue(ev, wall("2026-11-10T00:00:00")), true);
});

test("progresso do dia", () => {
  assert.equal(dayProgress([{ status: "CONCLUIDO" }, { status: "PENDENTE" }, { status: "NAO_REALIZADO" }]).texto, "1 de 3 concluídos");
  assert.equal(dayProgress([{ status: "CONCLUIDO" }]).texto, "1 de 1 concluído");
});

test("agrupa por dia de parede", () => {
  const groups = groupByWallDay([
    { startAt: wall("2026-11-09T09:00:00") },
    { startAt: wall("2026-11-09T23:00:00") },
    { startAt: wall("2026-11-10T08:00:00") },
  ]);
  assert.deepEqual(groups.map((g) => [g.day, g.events.length]), [["2026-11-09", 2], ["2026-11-10", 1]]);
});
