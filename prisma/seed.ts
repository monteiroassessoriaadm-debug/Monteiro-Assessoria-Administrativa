import { randomUUID } from "crypto";
import bcrypt from "bcryptjs";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("DATABASE_URL não configurada (string de conexão do Postgres).");
}
const adapter = new PrismaPg({ connectionString: databaseUrl });
const prisma = new PrismaClient({ adapter });

const DEFAULT_TEMPLATES = [
  {
    name: "Contrato de Prestação de Serviços",
    category: "Prestação de serviços",
    fieldsSchema: [
      { key: "SERVICO", label: "Serviço contratado", type: "text", required: true },
      { key: "VALOR", label: "Valor", type: "number", required: true },
      { key: "FORMA_PAGAMENTO", label: "Forma de pagamento", type: "text", required: true },
      { key: "PRAZO", label: "Prazo", type: "text", required: true },
      { key: "DATA_INICIO", label: "Data de início", type: "date", required: true },
      { key: "DATA_ENTREGA", label: "Data de entrega", type: "date", required: false },
      { key: "CONDICOES", label: "Condições específicas", type: "textarea", required: false },
      { key: "OBSERVACOES", label: "Observações", type: "textarea", required: false },
    ],
    content: `CONTRATO DE PRESTAÇÃO DE SERVIÇOS

CONTRATANTE: {{NOME_CLIENTE}}, portador(a) de {{DOCUMENTO_CLIENTE}}, com endereço em {{ENDERECO_CLIENTE}}, {{CIDADE_CLIENTE}}.

CONTRATADA: Monteiro Assessoria Administrativa.

OBJETO: {{SERVICO}}

VALOR: R$ {{VALOR}}
FORMA DE PAGAMENTO: {{FORMA_PAGAMENTO}}
PRAZO: {{PRAZO}}
DATA DE INÍCIO: {{DATA_INICIO}}
DATA DE ENTREGA: {{DATA_ENTREGA}}

CONDIÇÕES ESPECÍFICAS:
{{CONDICOES}}

[Cláusulas contratuais a serem definidas pela administração da Monteiro — edite este modelo em Configurações → Modelos de documentos antes de utilizá-lo.]

OBSERVAÇÕES:
{{OBSERVACOES}}

{{CIDADE_CLIENTE}}, {{DATA_ATUAL}}.`,
  },
  {
    name: "Contrato de Compra e Venda",
    category: "Compra e venda",
    fieldsSchema: [
      { key: "VENDEDOR_NOME", label: "Nome do vendedor", type: "text", required: true },
      { key: "VENDEDOR_DOCUMENTO", label: "CPF/CNPJ do vendedor", type: "text", required: true },
      { key: "VENDEDOR_ENDERECO", label: "Endereço do vendedor", type: "text", required: false },
      { key: "COMPRADOR_NOME", label: "Nome do comprador", type: "text", required: true },
      { key: "COMPRADOR_DOCUMENTO", label: "CPF/CNPJ do comprador", type: "text", required: true },
      { key: "COMPRADOR_ENDERECO", label: "Endereço do comprador", type: "text", required: false },
      { key: "OBJETO_DESCRICAO", label: "Descrição do bem", type: "textarea", required: true },
      { key: "OBJETO_MARCA", label: "Marca", type: "text", required: false },
      { key: "OBJETO_MODELO", label: "Modelo", type: "text", required: false },
      { key: "OBJETO_ANO", label: "Ano", type: "text", required: false },
      { key: "ESTADO_CONSERVACAO", label: "Estado de conservação", type: "text", required: false },
      { key: "VALOR_TOTAL", label: "Valor total", type: "number", required: true },
      { key: "FORMA_PAGAMENTO", label: "Forma de pagamento", type: "text", required: true },
      { key: "ENTRADA", label: "Entrada", type: "text", required: false },
      { key: "PARCELAS", label: "Parcelas", type: "text", required: false },
      { key: "DATA_ENTREGA", label: "Data da entrega", type: "date", required: false },
      { key: "CONDICOES", label: "Condições", type: "textarea", required: false },
    ],
    content: `CONTRATO DE COMPRA E VENDA

VENDEDOR: {{VENDEDOR_NOME}}, {{VENDEDOR_DOCUMENTO}}, {{VENDEDOR_ENDERECO}}.

COMPRADOR: {{COMPRADOR_NOME}}, {{COMPRADOR_DOCUMENTO}}, {{COMPRADOR_ENDERECO}}.

OBJETO DA VENDA:
{{OBJETO_DESCRICAO}}
Marca: {{OBJETO_MARCA}} | Modelo: {{OBJETO_MODELO}} | Ano: {{OBJETO_ANO}}
Estado de conservação: {{ESTADO_CONSERVACAO}}

NEGOCIAÇÃO:
Valor total: R$ {{VALOR_TOTAL}}
Forma de pagamento: {{FORMA_PAGAMENTO}}
Entrada: {{ENTRADA}}
Parcelas: {{PARCELAS}}
Data da entrega: {{DATA_ENTREGA}}

CONDIÇÕES:
{{CONDICOES}}

[Cláusulas contratuais a serem definidas pela administração da Monteiro — edite este modelo em Configurações → Modelos de documentos antes de utilizá-lo.]

{{CIDADE_CLIENTE}}, {{DATA_ATUAL}}.`,
  },
];

const DEFAULT_SERVICES = [
  { name: "Apoio para abertura de MEI", category: "Administrativo" },
  { name: "Elaboração de contratos", category: "Documentos" },
  { name: "Documentos administrativos", category: "Documentos" },
  { name: "Currículos", category: "Documentos" },
  { name: "Serviços digitais", category: "Digital" },
  { name: "Slides e apresentações", category: "Digital" },
  { name: "Edição de vídeos", category: "Digital" },
  { name: "Impressões", category: "Administrativo" },
  { name: "Consultoria / assessoria administrativa", category: "Consultoria" },
  { name: "Assessoria de mídia", category: "Mídia" },
];

async function main() {
  const adminEmail = "monteiroassessoriaadm@gmail.com";
  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      name: "Administrador Monteiro",
      email: adminEmail,
      passwordHash: await bcrypt.hash("Monteiro@123", 10),
      role: "ADMIN",
      active: true,
    },
  });
  console.log(`Usuário administrador pronto: ${admin.email}`);

  await prisma.companySettings.upsert({
    where: { id: "singleton" },
    update: {},
    create: {
      id: "singleton",
      name: "Monteiro Assessoria Administrativa",
      slogan: "A Monteiro Resolve.",
    },
  });

  for (const service of DEFAULT_SERVICES) {
    const existing = await prisma.service.findFirst({
      where: { name: service.name },
    });
    if (!existing) {
      await prisma.service.create({ data: service });
    }
  }
  console.log("Catálogo de serviços inicial criado (preços a definir pelo administrador).");

  for (const template of DEFAULT_TEMPLATES) {
    const existing = await prisma.documentTemplate.findFirst({
      where: { name: template.name },
    });
    if (!existing) {
      const id = randomUUID();
      await prisma.documentTemplate.create({
        data: {
          id,
          baseTemplateId: id,
          name: template.name,
          category: template.category,
          content: template.content,
          fieldsSchema: JSON.stringify(template.fieldsSchema),
        },
      });
    }
  }
  console.log(
    "Modelos de documentos iniciais criados (cláusulas contratuais a definir pelo administrador).",
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
