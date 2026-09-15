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

CONTRATANTE: {{NOME_CLIENTE}}, portador(a) de {{DOCUMENTO_CLIENTE}}, residente/sediado em {{ENDERECO_CLIENTE}}, {{CIDADE_CLIENTE}}/{{ESTADO_CLIENTE}}, CEP {{CEP_CLIENTE}}, telefone/WhatsApp {{WHATSAPP_CLIENTE}}, e-mail {{EMAIL_CLIENTE}}.

CONTRATADA: Monteiro Assessoria Administrativa, [RAZÃO SOCIAL COMPLETA], inscrita no CNPJ nº [PREENCHER CNPJ], com sede em [PREENCHER ENDEREÇO COMPLETO DA MONTEIRO].

As partes acima identificadas têm, entre si, justo e acertado o presente Contrato de Prestação de Serviços, que se regerá pelas cláusulas seguintes.

CLÁUSULA 1ª — DO OBJETO
O presente contrato tem por objeto a prestação, pela CONTRATADA à CONTRATANTE, do seguinte serviço: {{SERVICO}}.

CLÁUSULA 2ª — DAS OBRIGAÇÕES DA CONTRATADA
2.1. Executar o serviço descrito na Cláusula 1ª com zelo, diligência e dentro dos padrões técnicos e prazos acordados.
2.2. Manter a CONTRATANTE informada sobre o andamento do serviço.
2.3. Zelar pelo sigilo de todas as informações e documentos fornecidos pela CONTRATANTE, nos termos da Cláusula 6ª.

CLÁUSULA 3ª — DAS OBRIGAÇÕES DA CONTRATANTE
3.1. Fornecer, em tempo hábil, todas as informações, documentos e materiais necessários à execução do serviço.
3.2. Efetuar o pagamento na forma, valor e prazos estabelecidos na Cláusula 4ª.
3.3. Comunicar à CONTRATADA, por escrito, qualquer alteração relevante que possa impactar a execução do serviço.

CLÁUSULA 4ª — DO VALOR E DA FORMA DE PAGAMENTO
4.1. Pelo serviço prestado, a CONTRATANTE pagará à CONTRATADA o valor de R$ {{VALOR}} ({{VALOR}} reais).
4.2. Forma de pagamento: {{FORMA_PAGAMENTO}}.
4.3. Em caso de atraso no pagamento, incidirão multa de 2% (dois por cento) sobre o valor em aberto, juros de mora de 1% (um por cento) ao mês e correção monetária, sem prejuízo das demais medidas cabíveis.

CLÁUSULA 5ª — DO PRAZO E DA VIGÊNCIA
5.1. Prazo de execução: {{PRAZO}}.
5.2. Data de início: {{DATA_INICIO}}.
5.3. Data prevista de entrega/conclusão: {{DATA_ENTREGA}}.
5.4. Prazos poderão ser prorrogados mediante acordo escrito entre as partes, especialmente em caso de atraso no fornecimento de informações ou documentos pela CONTRATANTE.

CLÁUSULA 6ª — DA CONFIDENCIALIDADE E DA PROTEÇÃO DE DADOS (LGPD)
6.1. As partes comprometem-se a manter sigilo sobre todas as informações confidenciais a que tiverem acesso em razão deste contrato, não as divulgando a terceiros sem autorização prévia e por escrito.
6.2. O tratamento de dados pessoais realizado no âmbito deste contrato observará o disposto na Lei nº 13.709/2018 (Lei Geral de Proteção de Dados — LGPD), sendo os dados da CONTRATANTE utilizados exclusivamente para a execução do objeto contratado.

CLÁUSULA 7ª — DA RESCISÃO
7.1. O presente contrato poderá ser rescindido por qualquer das partes, mediante aviso prévio por escrito com antecedência mínima de [PREENCHER — ex.: 15 (quinze) dias].
7.2. Em caso de rescisão, será devido à CONTRATADA o pagamento proporcional aos serviços já executados até a data da rescisão.
7.3. O descumprimento de qualquer cláusula deste contrato por uma das partes autoriza a outra a rescindi-lo de imediato, sem prejuízo das perdas e danos cabíveis.

CLÁUSULA 8ª — DAS CONDIÇÕES ESPECÍFICAS
{{CONDICOES}}

CLÁUSULA 9ª — DISPOSIÇÕES GERAIS
9.1. Este contrato não gera vínculo empregatício, societário ou de representação entre as partes.
9.2. Alterações a este contrato somente serão válidas se feitas por escrito e assinadas por ambas as partes.
9.3. Situações não previstas neste contrato serão resolvidas de comum acordo entre as partes, à luz da legislação civil aplicável.

CLÁUSULA 10ª — DO FORO
Fica eleito o foro da comarca de {{CIDADE_CLIENTE}}/{{ESTADO_CLIENTE}} para dirimir quaisquer dúvidas ou controvérsias oriundas deste contrato, com renúncia expressa a qualquer outro, por mais privilegiado que seja.

OBSERVAÇÕES ADICIONAIS:
{{OBSERVACOES}}

E, por estarem assim justas e contratadas, as partes firmam o presente instrumento.

{{CIDADE_CLIENTE}}, {{DATA_ATUAL}}.


_______________________________________
CONTRATANTE: {{NOME_CLIENTE}}


_______________________________________
CONTRATADA: Monteiro Assessoria Administrativa`,
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
