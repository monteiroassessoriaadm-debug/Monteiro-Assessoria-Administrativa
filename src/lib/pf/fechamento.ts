import "server-only";
import { getMonthSummary } from "@/lib/pf/service";
import { monthLabelFull } from "@/lib/pf/calc";
import { formatCurrencyBRL } from "@/lib/utils";

const pct = (v: number | null) => (v === null ? "—" : `${v.toString().replace(".", ",")}%`);
const varText = (v: number | null) => (v === null ? "sem base" : `${v > 0 ? "+" : ""}${v.toString().replace(".", ",")}%`);
const word = { green: "bom", yellow: "atenção", red: "alerta", slate: "sem dados" } as const;

/** Linhas do fechamento do mês, usadas na tela e no PDF. */
export async function getClosing(month?: string) {
  const r = await getMonthSummary(month);
  const i = r.indicadores;
  return {
    summary: r,
    monthTitle: monthLabelFull(r.month),
    boxes: [
      { label: "Entradas", value: formatCurrencyBRL(r.entradas) },
      { label: "Saídas", value: formatCurrencyBRL(r.saidas) },
      { label: "Sobra", value: formatCurrencyBRL(r.sobra) },
      { label: "Guardado", value: formatCurrencyBRL(r.guardado) },
    ],
    indicators: [
      { label: "Renda comprometida com dívidas", value: pct(i.rendaComprometida.percent), hint: word[i.rendaComprometida.tone] },
      { label: "Taxa de poupança", value: pct(i.taxaPoupanca.percent), hint: word[i.taxaPoupanca.tone] },
      {
        label: "Meses de reserva",
        value: i.mesesReserva.meses === null ? "—" : `${i.mesesReserva.meses.toString().replace(".", ",")} meses`,
        hint: word[i.mesesReserva.tone],
      },
      { label: "Parcelas de dívidas no mês", value: formatCurrencyBRL(i.parcelasDividas) },
    ],
    comparison: [
      { label: "Entradas", value: `${formatCurrencyBRL(r.entradas)} (${varText(r.anterior.variacaoEntradas)})`, hint: `antes ${formatCurrencyBRL(r.anterior.entradas)}` },
      { label: "Saídas", value: `${formatCurrencyBRL(r.saidas)} (${varText(r.anterior.variacaoSaidas)})`, hint: `antes ${formatCurrencyBRL(r.anterior.saidas)}` },
      { label: "Gastos (sem o que foi guardado)", value: `${formatCurrencyBRL(r.gastos)} (${varText(r.anterior.variacaoGastos)})`, hint: `antes ${formatCurrencyBRL(r.anterior.gastos)}` },
      { label: "Sobra", value: formatCurrencyBRL(r.sobra), hint: `antes ${formatCurrencyBRL(r.anterior.sobra)}` },
    ],
    categories: r.porCategoria.map((c) => ({
      label: c.category,
      value: formatCurrencyBRL(c.value),
      hint: r.gastos > 0 ? `${Math.round((c.value / r.gastos) * 100)}%` : undefined,
    })),
  };
}
