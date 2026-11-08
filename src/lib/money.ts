// Valores digitados à brasileira. Sem dependências, para rodar também nos testes.

/** "950,00", "1.100,50", "R$ 1.500" ou "1100.50" viram "950.00", "1100.50", "1500", "1100.50". */
export function normalizeMoney(value: string) {
  const text = value.trim().replace(/[R$\s]/g, "");
  if (text.includes(",")) return text.replace(/\./g, "").replace(",", ".");
  if (/^\d{1,3}(\.\d{3})+$/.test(text)) return text.replace(/\./g, "");
  return text;
}

/** Número a partir do texto digitado; null se não for um valor válido. Aceita negativo. */
export function parseMoney(value: string | number | null | undefined) {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (!value) return null;
  const negative = value.trim().startsWith("-");
  const text = normalizeMoney(negative ? value.trim().slice(1) : value);
  if (!/^\d+(\.\d{1,2})?$/.test(text)) return null;
  return negative ? -Number(text) : Number(text);
}

/** Valor para aparecer dentro de um campo de formulário: "1100,50". */
export function moneyToInput(value: number | string | null | undefined) {
  if (value === null || value === undefined || value === "") return "";
  return Number(value).toFixed(2).replace(".", ",");
}
