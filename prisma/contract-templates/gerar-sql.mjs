// Confere os modelos de modelos.mjs e imprime o SQL que os insere no banco.
// Uso: node prisma/contract-templates/gerar-sql.mjs > trecho.sql
// Falha se algum modelo usar um campo que não existe ou deixar marcação solta.
import { MODELOS } from "./modelos.mjs";
import { AUTO_TOKEN_KEYS } from "../../src/lib/contract-auto-tokens.ts";
import { formatFieldValues, renderContract, tokensInContent } from "../../src/lib/contract-render.ts";

const problems = [];

for (const m of MODELOS) {
  const fieldKeys = new Set(m.fields.map((f) => f.key));
  const moneyKeys = m.fields.filter((f) => f.type === "money").map((f) => `${f.key}_extenso`);
  const known = new Set([...AUTO_TOKEN_KEYS, ...fieldKeys, ...moneyKeys]);
  for (const t of tokensInContent(m.content)) {
    if (!known.has(t)) problems.push(`${m.slug}: campo {{${t}}} não existe`);
  }
  for (const f of m.fields) {
    if (!m.content.includes(`{{${f.key}}}`) && !m.content.includes(`[[se ${f.key}]]`)) {
      problems.push(`${m.slug}: campo "${f.key}" não aparece no texto`);
    }
  }
  // Monta com valores de mentira para PF e PJ e procura marcação que sobrou.
  const fake = Object.fromEntries([...known].map((k) => [k, `<${k}>`]));
  const values = formatFieldValues(m.fields, Object.fromEntries(m.fields.map((f) => [f.key, f.type === "money" ? "100" : f.type === "boolean" ? "sim" : f.default ?? "x"])));
  for (const type of ["PF", "PJ"]) {
    const out = renderContract(m.content, { ...fake, ...values }, type);
    if (/\[\[|\]\]|\{\{/.test(out)) problems.push(`${m.slug} (${type}): sobrou marcação: ${out.match(/.{0,40}(\[\[|\]\]|\{\{).{0,40}/)[0]}`);
  }
}

if (problems.length) {
  console.error(problems.join("\n"));
  process.exit(1);
}

const q = (s) => (s === null || s === undefined ? "NULL" : `'${String(s).replace(/'/g, "''")}'`);
const tag = (s) => {
  if (s.includes("$modelo$")) throw new Error("texto contém $modelo$");
  return `$modelo$${s}$modelo$`;
};

console.log("-- Modelos de contrato da primeira versão do Jurídico (fonte: prisma/contract-templates/modelos.mjs)");
for (const m of MODELOS) {
  console.log(`INSERT INTO "contract_templates" ("id", "baseTemplateId", "slug", "name", "kind", "category", "description", "version", "active", "content", "fieldsSchema", "updatedAt")
VALUES (${q(m.id)}, ${q(m.id)}, ${q(m.slug)}, ${q(m.name)}, '${m.kind ?? "CONTRATO"}', ${q(m.category)}, ${q(m.description)}, 1, true,
${tag(m.content)},
${q(JSON.stringify(m.fields))}, CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO NOTHING;
`);
}
