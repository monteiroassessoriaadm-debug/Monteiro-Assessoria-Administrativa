import { test } from "node:test";
import assert from "node:assert/strict";
import {
  contractCode,
  dayKeyInWords,
  formatFieldValues,
  moneyInWords,
  parseMoneyText,
  renderContract,
  splitContractBlocks,
  unresolvedTokens,
} from "./contract-render.ts";

test("valor por extenso", () => {
  assert.equal(moneyInWords(300), "trezentos reais");
  assert.equal(moneyInWords(100), "cem reais");
  assert.equal(moneyInWords(1), "um real");
  assert.equal(moneyInWords(150), "cento e cinquenta reais");
  assert.equal(moneyInWords(1500), "mil e quinhentos reais");
  assert.equal(moneyInWords(1250.5), "mil duzentos e cinquenta reais e cinquenta centavos");
  assert.equal(moneyInWords(2300), "dois mil e trezentos reais");
  assert.equal(moneyInWords(0.99), "noventa e nove centavos");
  assert.equal(moneyInWords(21), "vinte e um reais");
});

test("valor digitado de vários jeitos", () => {
  assert.equal(parseMoneyText("300"), 300);
  assert.equal(parseMoneyText("R$ 1.300,50"), 1300.5);
  assert.equal(parseMoneyText("1300.5"), 1300.5);
  assert.equal(parseMoneyText(""), null);
  assert.equal(parseMoneyText("abc"), null);
});

test("datas", () => {
  assert.equal(dayKeyInWords("2026-11-09"), "9 de novembro de 2026");
});

test("campos de dinheiro ganham o extenso e datas viram dd/mm/aaaa", () => {
  const out = formatFieldValues(
    [
      { key: "valor", label: "Valor", type: "money", required: true },
      { key: "data_inicio", label: "Início", type: "date", required: true },
    ],
    { valor: "300", data_inicio: "2026-11-10", livre: " texto " },
  );
  assert.deepEqual(out, {
    valor: "R$ 300,00",
    valor_extenso: "trezentos reais",
    data_inicio: "10/11/2026",
    livre: "texto",
  });
});

test("blocos de pessoa física, jurídica e condicionais", () => {
  const modelo = "A {{cliente_nome}}.\n\n[[PF]]Direito de arrependimento.[[/PF]]\n\n[[PJ]]Limitação de valor.[[/PJ]]\n\n[[se oab]]Provimento 205.[[/se]]\n\nFim.";
  const pf = renderContract(modelo, { cliente_nome: "Maria", oab: "não" }, "PF");
  assert.equal(pf, "A Maria.\n\nDireito de arrependimento.\n\nFim.");
  const pj = renderContract(modelo, { cliente_nome: "Loja X", oab: "sim" }, "PJ");
  assert.equal(pj, "A Loja X.\n\nLimitação de valor.\n\nProvimento 205.\n\nFim.");
});

test("campo sem valor continua visível para ninguém assinar com lacuna", () => {
  const out = renderContract("CPF {{cpf_cnpj}}, valor {{valor}}", { valor: "R$ 10,00", cpf_cnpj: "" }, "PF");
  assert.equal(out, "CPF {{cpf_cnpj}}, valor R$ 10,00");
  assert.deepEqual(unresolvedTokens(out), ["cpf_cnpj"]);
});

test("modelos antigos com {{NOME_CLIENTE}} continuam funcionando", () => {
  assert.equal(renderContract("{{NOME_CLIENTE}}", { NOME_CLIENTE: "Ana" }, "PF"), "Ana");
});

test("número do contrato", () => {
  assert.equal(contractCode("CONTRATO", 2026, 1), "MON-2026-001");
  assert.equal(contractCode("DOCUMENTO", 2026, 12), "DOC-2026-012");
});

test("título e cláusulas viram blocos do PDF", () => {
  const blocks = splitContractBlocks("CONTRATO DE CRIAÇÃO DE SITE\n\nCLÁUSULA 1ª — DO OBJETO\n1.1. Texto.\n\nOutro parágrafo.");
  assert.deepEqual(blocks, [
    { type: "title", text: "CONTRATO DE CRIAÇÃO DE SITE" },
    { type: "heading", text: "CLÁUSULA 1ª — DO OBJETO" },
    { type: "paragraph", text: "1.1. Texto." },
    { type: "paragraph", text: "Outro parágrafo." },
  ]);
});
