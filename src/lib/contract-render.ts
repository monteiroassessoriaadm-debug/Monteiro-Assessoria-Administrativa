// Montagem do texto dos contratos do Jurídico. Sem dependências, para rodar
// também nos testes.
//
// Sintaxe dos modelos:
//   {{campo}}               valor do campo (dados da Monteiro, do cliente, do
//                           orçamento ou preenchidos na hora)
//   {{campo_extenso}}       para campos de dinheiro: o valor por extenso
//   [[PF]] ... [[/PF]]      só entra quando o cliente é pessoa física (CDC)
//   [[PJ]] ... [[/PJ]]      só entra quando o cliente é pessoa jurídica
//   [[se campo]] ... [[/se]] só entra quando o campo foi preenchido (e não é "não")
// Campos sem valor continuam visíveis como {{campo}} para ninguém assinar
// um contrato com lacuna sem perceber.

export type ContractFieldType = "text" | "textarea" | "number" | "money" | "date" | "boolean";

export type ContractFieldDef = {
  key: string;
  label: string;
  type: ContractFieldType;
  required: boolean;
  default?: string;
  hint?: string;
};

export const FIELD_TYPES: ContractFieldType[] = ["text", "textarea", "number", "money", "date", "boolean"];

const TOKEN_RE = /\{\{\s*([A-Za-z0-9_]+)\s*\}\}/g;

export function parseContractFields(raw: string): ContractFieldDef[] {
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((f) => f && typeof f.key === "string" && typeof f.label === "string")
      .map((f) => ({
        key: f.key,
        label: f.label,
        type: FIELD_TYPES.includes(f.type) ? f.type : "text",
        required: Boolean(f.required),
        ...(typeof f.default === "string" && f.default !== "" ? { default: f.default } : {}),
        ...(typeof f.hint === "string" && f.hint !== "" ? { hint: f.hint } : {}),
      }));
  } catch {
    return [];
  }
}

/** Chaves usadas no corpo do modelo, na ordem em que aparecem. */
export function tokensInContent(content: string): string[] {
  const keys: string[] = [];
  for (const m of content.matchAll(TOKEN_RE)) {
    if (!keys.includes(m[1])) keys.push(m[1]);
  }
  return keys;
}

// ---------- valores ----------

/** "300", "300,50", "1.300,50" ou "1300.5" → número; vazio ou inválido → null. */
export function parseMoneyText(value: string | null | undefined): number | null {
  const raw = (value ?? "").replace(/[R$\s]/g, "");
  if (!raw) return null;
  const normalized = raw.includes(",") ? raw.replace(/\./g, "").replace(",", ".") : raw;
  const num = Number(normalized);
  return Number.isFinite(num) && num >= 0 ? Math.round(num * 100) / 100 : null;
}

export function formatMoney(value: number) {
  // Espaço comum no lugar do não separável: o PDF e o WhatsApp mostram igual.
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value).replace(/ /g, " ");
}

const UNIDADES = ["", "um", "dois", "três", "quatro", "cinco", "seis", "sete", "oito", "nove", "dez", "onze", "doze", "treze", "quatorze", "quinze", "dezesseis", "dezessete", "dezoito", "dezenove"];
const DEZENAS = ["", "", "vinte", "trinta", "quarenta", "cinquenta", "sessenta", "setenta", "oitenta", "noventa"];
const CENTENAS = ["", "cento", "duzentos", "trezentos", "quatrocentos", "quinhentos", "seiscentos", "setecentos", "oitocentos", "novecentos"];

function ate999(n: number): string {
  if (n === 0) return "";
  if (n === 100) return "cem";
  const c = Math.floor(n / 100);
  const resto = n % 100;
  const partes: string[] = [];
  if (c) partes.push(CENTENAS[c]);
  if (resto < 20) {
    if (resto) partes.push(UNIDADES[resto]);
  } else {
    const d = Math.floor(resto / 10);
    const u = resto % 10;
    partes.push(u ? `${DEZENAS[d]} e ${UNIDADES[u]}` : DEZENAS[d]);
  }
  return partes.join(" e ");
}

function inteiroPorExtenso(n: number): string {
  if (n === 0) return "zero";
  const milhoes = Math.floor(n / 1_000_000);
  const milhares = Math.floor((n % 1_000_000) / 1000);
  const resto = n % 1000;
  const partes: string[] = [];
  if (milhoes) partes.push(milhoes === 1 ? "um milhão" : `${ate999(milhoes)} milhões`);
  if (milhares) partes.push(milhares === 1 ? "mil" : `${ate999(milhares)} mil`);
  if (resto) partes.push(ate999(resto));
  if (partes.length === 1) return partes[0];
  // "mil e quinhentos", "dois mil e trezentos e dez" → só usa "e" antes do último
  // grupo quando ele é menor que 100 ou uma centena redonda.
  const ultimo = partes.pop()!;
  const juntaComE = resto > 0 && (resto < 100 || resto % 100 === 0);
  return `${partes.join(" ")}${juntaComE ? " e " : " "}${ultimo}`;
}

/** 3 → "três", 30 → "trinta". */
export function numberInWords(n: number) {
  return inteiroPorExtenso(Math.floor(n));
}

/** 300 → "trezentos reais"; 1250.5 → "mil duzentos e cinquenta reais e cinquenta centavos". */
export function moneyInWords(value: number): string {
  const reais = Math.floor(value);
  const centavos = Math.round((value - reais) * 100);
  const partes: string[] = [];
  if (reais > 0 || centavos === 0) {
    const ext = inteiroPorExtenso(reais);
    const deReais = reais >= 1_000_000 && reais % 1_000_000 === 0 ? " de" : "";
    partes.push(`${ext}${deReais} ${reais === 1 ? "real" : "reais"}`);
  }
  if (centavos > 0) partes.push(`${inteiroPorExtenso(centavos)} ${centavos === 1 ? "centavo" : "centavos"}`);
  return partes.join(" e ");
}

const MESES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];

/** YYYY-MM-DD → dd/mm/aaaa (texto que não é data passa como veio). */
export function formatDayKey(value: string) {
  const m = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : value;
}

/** YYYY-MM-DD → "9 de novembro de 2026". */
export function dayKeyInWords(value: string) {
  const m = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return value;
  return `${Number(m[3])} de ${MESES[Number(m[2]) - 1]} de ${m[1]}`;
}

/** Valores digitados → texto que entra no contrato, conforme o tipo do campo. */
export function formatFieldValues(fields: ContractFieldDef[], values: Record<string, string>) {
  const out: Record<string, string> = {};
  for (const [key, raw] of Object.entries(values)) {
    const value = (raw ?? "").trim();
    if (!value) continue;
    const def = fields.find((f) => f.key === key);
    if (def?.type === "money") {
      const num = parseMoneyText(value);
      if (num === null) {
        out[key] = value;
      } else {
        out[key] = formatMoney(num);
        out[`${key}_extenso`] = moneyInWords(num);
      }
    } else if (def?.type === "date") {
      out[key] = formatDayKey(value);
    } else if (def?.type === "boolean") {
      out[key] = value === "sim" ? "sim" : "";
    } else {
      out[key] = value;
    }
  }
  return out;
}

// ---------- texto ----------

function isTruthy(value: string | undefined) {
  if (!value) return false;
  const v = value.trim().toLowerCase();
  return v !== "" && v !== "não" && v !== "nao" && v !== "false" && v !== "0";
}

/** Aplica os blocos condicionais e substitui os campos. */
export function renderContract(
  content: string,
  tokens: Record<string, string>,
  clientType: "PF" | "PJ",
) {
  let text = content.replace(/\r\n/g, "\n");
  const keep = (block: string, on: boolean) => (on ? block : "");
  text = text.replace(/\[\[PF\]\]([\s\S]*?)\[\[\/PF\]\]/g, (_m, b: string) => keep(b, clientType === "PF"));
  text = text.replace(/\[\[PJ\]\]([\s\S]*?)\[\[\/PJ\]\]/g, (_m, b: string) => keep(b, clientType === "PJ"));
  text = text.replace(/\[\[se\s+([A-Za-z0-9_]+)\]\]([\s\S]*?)\[\[\/se\]\]/g, (_m, key: string, b: string) =>
    keep(b, isTruthy(tokens[key])),
  );
  text = text.replace(TOKEN_RE, (match, key: string) => {
    const value = tokens[key] ?? tokens[key.toLowerCase()];
    return value !== undefined && value !== "" ? value : match;
  });
  // Bloco removido não pode deixar buraco de várias linhas em branco.
  return text.replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}

/** Campos {{...}} que continuaram sem valor depois de montar o texto. */
export function unresolvedTokens(rendered: string): string[] {
  return tokensInContent(rendered);
}

// ---------- numeração ----------

export function contractCode(kind: "CONTRATO" | "DOCUMENTO", year: number, sequence: number) {
  return `${kind === "CONTRATO" ? "MON" : "DOC"}-${year}-${String(sequence).padStart(3, "0")}`;
}

// ---------- PDF ----------

export type ContractBlock =
  | { type: "title"; text: string }
  | { type: "heading"; text: string }
  | { type: "paragraph"; text: string };

/** Primeira linha em maiúsculas vira título; "CLÁUSULA ..." vira subtítulo. */
export function splitContractBlocks(rendered: string): ContractBlock[] {
  const blocks: ContractBlock[] = [];
  const paragraphs = rendered.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
  paragraphs.forEach((p, idx) => {
    const [first, ...rest] = p.split("\n");
    const isUpper = first === first.toUpperCase() && /[A-ZÀ-Ú]/.test(first);
    if (idx === 0 && isUpper && rest.length === 0) {
      blocks.push({ type: "title", text: first });
    } else if (/^(CLÁUSULA|CLAUSULA|ANEXO|SEÇÃO)\b/i.test(first) && isUpper) {
      blocks.push({ type: "heading", text: first });
      if (rest.length) blocks.push({ type: "paragraph", text: rest.join("\n") });
    } else {
      blocks.push({ type: "paragraph", text: p });
    }
  });
  return blocks;
}
