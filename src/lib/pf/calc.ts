// Regras de cálculo das Finanças Pessoais, sem banco de dados, para poderem ser testadas.

export const round2 = (v: number) => Math.round(v * 100) / 100;

export type Tone = "green" | "yellow" | "red" | "slate";

// ---------- Meses (AAAA-MM) ----------

export function monthOf(dayKey: string) {
  return dayKey.slice(0, 7);
}

export function addMonths(month: string, n: number) {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + n, 1));
  return d.toISOString().slice(0, 7);
}

export function monthsBetween(from: string, to: string) {
  const [y1, m1] = from.split("-").map(Number);
  const [y2, m2] = to.split("-").map(Number);
  return (y2 - y1) * 12 + (m2 - m1);
}

/** Dia do mês ajustado ao tamanho do mês: dia 31 em fevereiro vira 28/29. */
export function dayInMonth(month: string, day: number) {
  const [y, m] = month.split("-").map(Number);
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return `${month}-${String(Math.min(Math.max(day, 1), last)).padStart(2, "0")}`;
}

const MONTH_NAMES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
const MONTH_FULL = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];

/** "2026-11" → "nov/26". */
export function monthLabel(month: string) {
  const [y, m] = month.split("-").map(Number);
  return `${MONTH_NAMES[m - 1]}/${String(y).slice(2)}`;
}

/** "2026-11" → "novembro de 2026". */
export function monthLabelFull(month: string) {
  const [y, m] = month.split("-").map(Number);
  return `${MONTH_FULL[m - 1]} de ${y}`;
}

// ---------- Cartão de crédito ----------

/**
 * Mês (AAAA-MM) do vencimento da fatura em que cai uma compra.
 * Compra até o dia do fechamento entra na fatura que fecha naquele mês;
 * depois do fechamento, vai para a do mês seguinte. Se o vencimento é num dia
 * menor ou igual ao fechamento, a fatura vence no mês depois de fechar.
 */
export function invoiceMonthFor(dayKey: string, closingDay: number, dueDay: number) {
  const month = monthOf(dayKey);
  const day = Number(dayKey.slice(8, 10));
  const closingThisMonth = Number(dayInMonth(month, closingDay).slice(8, 10));
  const closingMonth = day <= closingThisMonth ? month : addMonths(month, 1);
  return dueDay > closingDay ? closingMonth : addMonths(closingMonth, 1);
}

/** Divide o total em parcelas com centavos certos: a diferença vai na primeira. */
export function splitInstallments(total: number, count: number) {
  const n = Math.max(1, Math.floor(count));
  const base = Math.floor((total * 100) / n) / 100;
  const first = round2(total - base * (n - 1));
  return Array.from({ length: n }, (_, i) => (i === 0 ? first : base));
}

// ---------- Semáforos ----------

/** Parcelas de dívidas ÷ renda: verde até 30%, amarelo até 40%, vermelho acima. */
export function debtRatioTone(percent: number | null): Tone {
  if (percent === null) return "slate";
  if (percent <= 30) return "green";
  if (percent <= 40) return "yellow";
  return "red";
}

/** Guardado ÷ renda: verde a partir de 20%, amarelo a partir de 10%. */
export function savingsTone(percent: number | null): Tone {
  if (percent === null) return "slate";
  if (percent >= 20) return "green";
  if (percent >= 10) return "yellow";
  return "red";
}

/** Meses de reserva: verde a partir de 6, amarelo a partir de 3. */
export function reserveTone(months: number | null): Tone {
  if (months === null) return "slate";
  if (months >= 6) return "green";
  if (months >= 3) return "yellow";
  return "red";
}

export function netWorthTone(value: number): Tone {
  return value >= 0 ? "green" : "red";
}

/** Orçamento: verde; amarelo a partir de 80% do limite; vermelho ao estourar. */
export function budgetTone(spent: number, limit: number): Tone {
  if (limit <= 0) return spent > 0 ? "red" : "slate";
  const p = (spent / limit) * 100;
  if (p > 100) return "red";
  if (p >= 80) return "yellow";
  return "green";
}

export function percent(part: number, whole: number) {
  if (whole <= 0) return null;
  return Math.round((part / whole) * 1000) / 10;
}

// ---------- Metas ----------

/** Quanto guardar por mês para chegar no alvo até o prazo (contando o mês atual). */
export function suggestedMonthly(target: number, current: number, deadlineKey: string | null, todayKey: string) {
  const missing = round2(target - current);
  if (missing <= 0) return 0;
  if (!deadlineKey) return null;
  const months = monthsBetween(monthOf(todayKey), monthOf(deadlineKey)) + 1;
  if (months <= 0) return missing;
  return Math.ceil((missing / months) * 100) / 100;
}

// ---------- Simulador de quitação ----------

export type DebtInput = {
  id: string;
  name: string;
  balance: number;
  monthlyRate: number; // % ao mês
  installment: number; // parcela mínima mensal
};

export type Strategy = "avalanche" | "bola_de_neve";

export type PayoffResult = {
  strategy: Strategy;
  paidOff: boolean; // false se nunca quita (parcela não cobre os juros)
  months: number; // meses até a última dívida acabar
  freedomMonth: string | null; // AAAA-MM
  totalInterest: number;
  totalPaid: number;
  order: { id: string; name: string; month: string }[]; // ordem em que cada dívida acaba
  balances: { month: string; total: number }[]; // saldo total no fim de cada mês
};

const MAX_MONTHS = 600;

/**
 * Mês a mês: cobra os juros, paga a parcela mínima de cada dívida e joga o
 * valor extra (mais as parcelas de dívidas já quitadas) na dívida da vez.
 * Avalanche = maior juro primeiro; Bola de neve = menor saldo primeiro.
 * O primeiro pagamento acontece no mês seguinte a `startMonth`.
 */
export function simulatePayoff(debts: DebtInput[], extraPerMonth: number, strategy: Strategy, startMonth: string): PayoffResult {
  const active = debts
    .filter((d) => d.balance > 0)
    .map((d) => ({ ...d, bal: d.balance }));
  const sorted = [...active].sort((a, b) =>
    strategy === "avalanche"
      ? b.monthlyRate - a.monthlyRate || a.balance - b.balance
      : a.balance - b.balance || b.monthlyRate - a.monthlyRate,
  );
  const monthlyBudget = active.reduce((s, d) => s + d.installment, 0) + Math.max(0, extraPerMonth);

  let totalInterest = 0;
  let totalPaid = 0;
  const order: PayoffResult["order"] = [];
  const balances: PayoffResult["balances"] = [];
  let month = 0;

  while (sorted.some((d) => d.bal > 0.005) && month < MAX_MONTHS) {
    month++;
    const label = addMonths(startMonth, month);
    for (const d of sorted) {
      if (d.bal <= 0.005) continue;
      const interest = (d.bal * d.monthlyRate) / 100;
      d.bal += interest;
      totalInterest += interest;
    }
    let budget = monthlyBudget;
    for (const d of sorted) {
      if (d.bal <= 0.005) continue;
      const pay = Math.min(d.installment, d.bal, budget);
      d.bal -= pay;
      budget -= pay;
      totalPaid += pay;
    }
    for (const d of sorted) {
      if (budget <= 0.005) break;
      if (d.bal <= 0.005) continue;
      const pay = Math.min(budget, d.bal);
      d.bal -= pay;
      budget -= pay;
      totalPaid += pay;
    }
    for (const d of sorted) {
      if (d.bal <= 0.005 && !order.some((o) => o.id === d.id)) {
        d.bal = 0;
        order.push({ id: d.id, name: d.name, month: label });
      }
    }
    balances.push({ month: label, total: round2(sorted.reduce((s, d) => s + Math.max(0, d.bal), 0)) });
  }

  const paidOff = !sorted.some((d) => d.bal > 0.005);
  return {
    strategy,
    paidOff,
    months: paidOff ? month : MAX_MONTHS,
    freedomMonth: paidOff ? (month === 0 ? startMonth : addMonths(startMonth, month)) : null,
    totalInterest: round2(totalInterest),
    totalPaid: round2(totalPaid),
    order,
    balances,
  };
}

/** As duas estratégias lado a lado, com a diferença de juros e de prazo. */
export function compareStrategies(debts: DebtInput[], extraPerMonth: number, startMonth: string) {
  const avalanche = simulatePayoff(debts, extraPerMonth, "avalanche", startMonth);
  const bolaDeNeve = simulatePayoff(debts, extraPerMonth, "bola_de_neve", startMonth);
  const semExtra = simulatePayoff(debts, 0, "avalanche", startMonth);
  return {
    avalanche,
    bolaDeNeve,
    semExtra,
    economiaJurosAvalanche: round2(bolaDeNeve.totalInterest - avalanche.totalInterest),
  };
}
