import { test } from "node:test";
import assert from "node:assert/strict";
import {
  addMonths,
  budgetTone,
  compareStrategies,
  dayInMonth,
  debtRatioTone,
  invoiceMonthFor,
  reserveTone,
  savingsTone,
  simulatePayoff,
  splitInstallments,
  suggestedMonthly,
} from "./calc.ts";

test("meses: soma e dia ajustado ao tamanho do mês", () => {
  assert.equal(addMonths("2026-11", 2), "2027-01");
  assert.equal(addMonths("2026-01", -1), "2025-12");
  assert.equal(dayInMonth("2027-02", 31), "2027-02-28");
  assert.equal(dayInMonth("2028-02", 30), "2028-02-29");
});

test("fatura: compra antes e depois do fechamento", () => {
  // fecha dia 5, vence dia 15
  assert.equal(invoiceMonthFor("2026-11-03", 5, 15), "2026-11");
  assert.equal(invoiceMonthFor("2026-11-05", 5, 15), "2026-11");
  assert.equal(invoiceMonthFor("2026-11-06", 5, 15), "2026-12");
  // fecha dia 25, vence dia 5 do mês seguinte
  assert.equal(invoiceMonthFor("2026-11-20", 25, 5), "2026-12");
  assert.equal(invoiceMonthFor("2026-11-26", 25, 5), "2027-01");
  // fecha dia 31: em fevereiro fecha no último dia
  assert.equal(invoiceMonthFor("2027-02-28", 31, 10), "2027-03");
});

test("parcelas somam o total certinho", () => {
  const p = splitInstallments(100, 3);
  assert.deepEqual(p, [33.34, 33.33, 33.33]);
  assert.equal(Math.round(p.reduce((a, b) => a + b, 0) * 100) / 100, 100);
});

test("semáforos nos limites", () => {
  assert.equal(debtRatioTone(30), "green");
  assert.equal(debtRatioTone(30.1), "yellow");
  assert.equal(debtRatioTone(40), "yellow");
  assert.equal(debtRatioTone(40.1), "red");
  assert.equal(savingsTone(20), "green");
  assert.equal(savingsTone(10), "yellow");
  assert.equal(savingsTone(9.9), "red");
  assert.equal(reserveTone(6), "green");
  assert.equal(reserveTone(3), "yellow");
  assert.equal(reserveTone(2.9), "red");
  assert.equal(budgetTone(79, 100), "green");
  assert.equal(budgetTone(80, 100), "yellow");
  assert.equal(budgetTone(100, 100), "yellow");
  assert.equal(budgetTone(100.01, 100), "red");
});

test("valor sugerido por mês da meta", () => {
  assert.equal(suggestedMonthly(1200, 0, "2027-10-31", "2026-11-14"), 100);
  assert.equal(suggestedMonthly(1000, 1000, "2027-01-01", "2026-11-14"), 0);
  assert.equal(suggestedMonthly(1000, 0, null, "2026-11-14"), null);
});

test("dívida sem juros com parcela fixa acaba no prazo", () => {
  const r = simulatePayoff([{ id: "a", name: "A", balance: 1000, monthlyRate: 0, installment: 100 }], 0, "avalanche", "2026-11");
  assert.equal(r.paidOff, true);
  assert.equal(r.months, 10);
  assert.equal(r.freedomMonth, "2027-09");
  assert.equal(r.totalInterest, 0);
});

test("parcela menor que os juros: nunca quita", () => {
  const r = simulatePayoff([{ id: "a", name: "A", balance: 10000, monthlyRate: 10, installment: 100 }], 0, "avalanche", "2026-11");
  assert.equal(r.paidOff, false);
  assert.equal(r.freedomMonth, null);
});

test("avalanche paga menos juros; bola de neve quita a menor primeiro", () => {
  const debts = [
    { id: "cartao", name: "Cartão", balance: 5000, monthlyRate: 12, installment: 300 },
    { id: "familia", name: "Família", balance: 800, monthlyRate: 0, installment: 100 },
    { id: "consignado", name: "Consignado", balance: 8000, monthlyRate: 1.8, installment: 250 },
  ];
  const c = compareStrategies(debts, 500, "2026-11");
  assert.equal(c.avalanche.paidOff, true);
  assert.equal(c.bolaDeNeve.paidOff, true);
  assert.ok(c.avalanche.totalInterest <= c.bolaDeNeve.totalInterest);
  assert.ok(c.economiaJurosAvalanche >= 0);
  assert.equal(c.bolaDeNeve.order[0].id, "familia");
  const pos = (r: typeof c.avalanche, id: string) => r.order.findIndex((o) => o.id === id);
  assert.ok(pos(c.avalanche, "cartao") <= pos(c.bolaDeNeve, "cartao"));
  // com valor extra sai antes do que sem
  assert.ok(c.avalanche.months < c.semExtra.months || !c.semExtra.paidOff);
});
