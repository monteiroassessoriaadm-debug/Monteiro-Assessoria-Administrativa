-- Jurídico: contratos, modelos, versões, histórico de status e orientações.
-- Só acrescenta. Os registros da parte antiga (document_templates e
-- generated_documents) são COPIADOS para a estrutura nova no fim deste arquivo;
-- as tabelas antigas continuam no banco até a conferência.

-- CreateEnum
CREATE TYPE "ContractStatus" AS ENUM ('RASCUNHO', 'ENVIADO', 'ASSINADO', 'VIGENTE', 'ENCERRADO', 'RESCINDIDO');

-- CreateEnum
CREATE TYPE "ContractKind" AS ENUM ('CONTRATO', 'DOCUMENTO');

-- AlterTable
ALTER TABLE "company_settings" ADD COLUMN     "address" TEXT,
ADD COLUMN     "cnpj" TEXT,
ADD COLUMN     "forum" TEXT,
ADD COLUMN     "legalName" TEXT,
ADD COLUMN     "representativeName" TEXT,
ADD COLUMN     "signatureCity" TEXT;

-- AlterTable
ALTER TABLE "receivables" ADD COLUMN     "contractId" TEXT;


-- CreateTable
CREATE TABLE "contract_templates" (
    "id" TEXT NOT NULL,
    "baseTemplateId" TEXT NOT NULL,
    "slug" TEXT,
    "name" TEXT NOT NULL,
    "kind" "ContractKind" NOT NULL DEFAULT 'CONTRATO',
    "category" TEXT,
    "description" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "content" TEXT NOT NULL,
    "fieldsSchema" TEXT NOT NULL,
    "legacyDocumentTemplateId" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contract_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contracts" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "kind" "ContractKind" NOT NULL DEFAULT 'CONTRATO',
    "year" INTEGER NOT NULL,
    "sequence" INTEGER NOT NULL,
    "templateId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "quoteId" TEXT,
    "serviceId" TEXT,
    "serviceInstanceId" TEXT,
    "title" TEXT NOT NULL,
    "status" "ContractStatus" NOT NULL DEFAULT 'RASCUNHO',
    "totalValue" DECIMAL(65,30),
    "monthlyValue" DECIMAL(65,30),
    "paymentTerms" TEXT,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "renewalDate" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "signedAt" TIMESTAMP(3),
    "signatureMethod" TEXT,
    "endedAt" TIMESTAMP(3),
    "endReason" TEXT,
    "fieldValues" TEXT NOT NULL,
    "renderedContent" TEXT NOT NULL,
    "currentVersion" INTEGER NOT NULL DEFAULT 1,
    "notes" TEXT,
    "legacyDocumentId" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contracts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contract_versions" (
    "id" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "templateVersion" INTEGER NOT NULL,
    "fieldValues" TEXT NOT NULL,
    "renderedContent" TEXT NOT NULL,
    "reason" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contract_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contract_status_changes" (
    "id" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "fromStatus" "ContractStatus",
    "toStatus" "ContractStatus" NOT NULL,
    "note" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contract_status_changes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "legal_consultations" (
    "id" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "guidance" TEXT NOT NULL,
    "needsLawyer" BOOLEAN NOT NULL DEFAULT false,
    "clientId" TEXT,
    "contractId" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "legal_consultations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "contract_templates_legacyDocumentTemplateId_key" ON "contract_templates"("legacyDocumentTemplateId");

-- CreateIndex
CREATE INDEX "contract_templates_baseTemplateId_idx" ON "contract_templates"("baseTemplateId");

-- CreateIndex
CREATE INDEX "contract_templates_slug_idx" ON "contract_templates"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "contracts_code_key" ON "contracts"("code");

-- CreateIndex
CREATE UNIQUE INDEX "contracts_legacyDocumentId_key" ON "contracts"("legacyDocumentId");

-- CreateIndex
CREATE INDEX "contracts_clientId_idx" ON "contracts"("clientId");

-- CreateIndex
CREATE INDEX "contracts_status_idx" ON "contracts"("status");

-- CreateIndex
CREATE INDEX "contracts_quoteId_idx" ON "contracts"("quoteId");

-- CreateIndex
CREATE UNIQUE INDEX "contracts_kind_year_sequence_key" ON "contracts"("kind", "year", "sequence");

-- CreateIndex
CREATE UNIQUE INDEX "contract_versions_contractId_version_key" ON "contract_versions"("contractId", "version");

-- CreateIndex
CREATE INDEX "contract_status_changes_contractId_idx" ON "contract_status_changes"("contractId");

-- CreateIndex
CREATE INDEX "legal_consultations_createdAt_idx" ON "legal_consultations"("createdAt");

-- CreateIndex
CREATE INDEX "receivables_contractId_idx" ON "receivables"("contractId");

-- AddForeignKey
ALTER TABLE "receivables" ADD CONSTRAINT "receivables_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "contracts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contract_templates" ADD CONSTRAINT "contract_templates_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "contract_templates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "quotes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "services"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_serviceInstanceId_fkey" FOREIGN KEY ("serviceInstanceId") REFERENCES "service_instances"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contract_versions" ADD CONSTRAINT "contract_versions_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "contracts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contract_versions" ADD CONSTRAINT "contract_versions_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contract_status_changes" ADD CONSTRAINT "contract_status_changes_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "contracts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contract_status_changes" ADD CONSTRAINT "contract_status_changes_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "legal_consultations" ADD CONSTRAINT "legal_consultations_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "legal_consultations" ADD CONSTRAINT "legal_consultations_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "contracts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "legal_consultations" ADD CONSTRAINT "legal_consultations_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- ============================================================
-- Dados da Monteiro para a qualificação da CONTRATADA.
-- Só preenche o que estiver vazio; depois o admin edita em Configurações.
-- ============================================================
UPDATE "company_settings" SET
  "cnpj"               = COALESCE("cnpj", '68.566.006/0001-64'),
  "address"            = COALESCE("address", 'Av. Maria de Sá, s/n, Centro, Pau D''Arco-PA'),
  "representativeName" = COALESCE("representativeName", 'João Vitor Monteiro'),
  "forum"              = COALESCE("forum", 'Comarca de Redenção-PA'),
  "signatureCity"      = COALESCE("signatureCity", 'Pau D''Arco-PA'),
  "whatsapp"           = COALESCE("whatsapp", '(94) 99236-2433');

-- ============================================================
-- Migração da parte antiga (Documentos). Nada é apagado aqui.
-- ============================================================

-- Modelos antigos → contract_templates. O briefing continua em uso (como
-- DOCUMENTO); os dois modelos de contrato antigos entram inativos, porque
-- foram substituídos pelos modelos novos abaixo.
INSERT INTO "contract_templates" (
  "id", "baseTemplateId", "slug", "name", "kind", "category", "description", "version", "active",
  "content", "fieldsSchema", "legacyDocumentTemplateId", "createdById", "createdAt", "updatedAt"
)
SELECT
  'ctpl-legado-' || t."id",
  'ctpl-legado-' || t."baseTemplateId",
  CASE WHEN t."id" = 'tpl-briefing-criacao-site-2026' THEN 'briefing-site' ELSE NULL END,
  CASE WHEN t."id" = 'tpl-briefing-criacao-site-2026' THEN t."name" ELSE t."name" || ' (modelo antigo)' END,
  CASE WHEN t."id" = 'tpl-briefing-criacao-site-2026' THEN 'DOCUMENTO'::"ContractKind" ELSE 'CONTRATO'::"ContractKind" END,
  t."category",
  CASE WHEN t."id" = 'tpl-briefing-criacao-site-2026'
    THEN 'Questionário para o cliente responder antes da criação do site.'
    ELSE 'Modelo do sistema antigo, mantido só para consulta dos contratos já gerados.' END,
  t."version",
  CASE WHEN t."id" = 'tpl-briefing-criacao-site-2026' THEN t."active" ELSE false END,
  t."content",
  t."fieldsSchema",
  t."id",
  t."createdById",
  t."createdAt",
  CURRENT_TIMESTAMP
FROM "document_templates" t
ON CONFLICT ("id") DO NOTHING;

-- Documentos gerados → contracts, numerados por ano na ordem de criação
-- (MON-2026-001, MON-2026-002...). O texto gerado na época é preservado.
INSERT INTO "contracts" (
  "id", "code", "kind", "year", "sequence", "templateId", "clientId", "title", "status",
  "totalValue", "paymentTerms", "startDate", "endedAt", "endReason",
  "fieldValues", "renderedContent", "currentVersion", "notes", "legacyDocumentId",
  "createdById", "createdAt", "updatedAt"
)
SELECT
  'ctr-legado-' || d."id",
  CASE WHEN t."kind" = 'DOCUMENTO' THEN 'DOC-' ELSE 'MON-' END
    || d.ano || '-' || LPAD(d.seq::text, 3, '0'),
  t."kind",
  d.ano,
  d.seq,
  t."id",
  d."clientId",
  d."title",
  CASE d."status"
    WHEN 'RASCUNHO' THEN 'RASCUNHO'
    WHEN 'GERADO' THEN 'RASCUNHO'
    WHEN 'ENVIADO' THEN 'ENVIADO'
    WHEN 'AGUARDANDO_ASSINATURA' THEN 'ENVIADO'
    WHEN 'ASSINADO' THEN 'ASSINADO'
    WHEN 'CANCELADO' THEN 'ENCERRADO'
  END::"ContractStatus",
  CASE WHEN (d."fieldValues"::jsonb ->> 'VALOR') ~ '^[0-9]+([.,][0-9]{1,2})?$'
    THEN REPLACE(d."fieldValues"::jsonb ->> 'VALOR', ',', '.')::decimal END,
  NULLIF(d."fieldValues"::jsonb ->> 'FORMA_PAGAMENTO', ''),
  CASE WHEN (d."fieldValues"::jsonb ->> 'DATA_INICIO') ~ '^\d{4}-\d{2}-\d{2}$'
    THEN (d."fieldValues"::jsonb ->> 'DATA_INICIO')::timestamp END,
  CASE WHEN d."status" = 'CANCELADO' THEN d."updatedAt" END,
  CASE WHEN d."status" = 'CANCELADO' THEN 'Cancelado no sistema antigo (Documentos).' END,
  d."fieldValues",
  d."renderedContent",
  1,
  'Migrado do sistema antigo: documento #' || d."number" || ', status "' || d."status" || '".',
  d."id",
  d."createdById",
  d."createdAt",
  CURRENT_TIMESTAMP
FROM (
  SELECT g.*,
    EXTRACT(YEAR FROM (g."createdAt" AT TIME ZONE 'UTC' AT TIME ZONE 'America/Sao_Paulo'))::int AS ano,
    ROW_NUMBER() OVER (
      PARTITION BY EXTRACT(YEAR FROM (g."createdAt" AT TIME ZONE 'UTC' AT TIME ZONE 'America/Sao_Paulo')),
        (g."templateId" = 'tpl-briefing-criacao-site-2026')
      ORDER BY g."createdAt", g."number"
    )::int AS seq
  FROM "generated_documents" g
) d
JOIN "contract_templates" t ON t."legacyDocumentTemplateId" = d."templateId"
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "contract_versions" ("id", "contractId", "version", "templateVersion", "fieldValues", "renderedContent", "reason", "createdById", "createdAt")
SELECT 'cver-legado-' || c."legacyDocumentId", c."id", 1, t."version", c."fieldValues", c."renderedContent",
  'Versão gerada no sistema antigo (Documentos).', c."createdById", c."createdAt"
FROM "contracts" c
JOIN "contract_templates" t ON t."id" = c."templateId"
WHERE c."legacyDocumentId" IS NOT NULL
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "contract_status_changes" ("id", "contractId", "fromStatus", "toStatus", "note", "createdById", "createdAt")
SELECT 'csc-legado-' || c."legacyDocumentId", c."id", NULL, c."status", c."notes", NULL, CURRENT_TIMESTAMP
FROM "contracts" c
WHERE c."legacyDocumentId" IS NOT NULL
ON CONFLICT ("id") DO NOTHING;

-- Modelos de contrato da primeira versão do Jurídico (fonte: prisma/contract-templates/modelos.mjs)
INSERT INTO "contract_templates" ("id", "baseTemplateId", "slug", "name", "kind", "category", "description", "version", "active", "content", "fieldsSchema", "updatedAt")
VALUES ('ctpl-criacao-site-v1', 'ctpl-criacao-site-v1', 'criacao-site', 'Contrato de Criação de Site ou CRM', 'CONTRATO', 'Sites e sistemas', 'Criação de site, página ou sistema (CRM, agenda, cadastro) sem manutenção mensal.', 1, true,
$modelo$CONTRATO DE CRIAÇÃO DE SITE OU SISTEMA

Contrato nº {{contrato_numero}}

CONTRATADA: {{contratada_nome}}, empresa individual registrada como Microempreendedor Individual (MEI), inscrita no CNPJ nº {{contratada_cnpj}}, com sede na {{contratada_endereco}}, neste ato representada por seu titular, {{contratada_representante}}, WhatsApp {{contratada_whatsapp}}.

CONTRATANTE: {{cliente_qualificacao}}.

As partes têm entre si justo e acertado este Contrato de Criação de Site ou Sistema, que se rege pelas cláusulas a seguir.

CLÁUSULA 1ª — DO OBJETO
1.1. A CONTRATADA criará para o CONTRATANTE: {{servico_descricao}}
1.2. O projeto é feito sob medida, com design próprio para o negócio do CONTRATANTE, e pensado para funcionar bem no celular.
1.3. NÃO estão incluídos neste contrato: {{nao_incluso}} Esses itens, se desejados, serão orçados à parte.
[[se cliente_advogado]]Por ser o CONTRATANTE advogado ou sociedade de advogados, o site e seus textos seguirão o Código de Ética e Disciplina da OAB e o Provimento nº 205/2021, com conteúdo informativo e sóbrio, sem promessa de resultado, sem menção a valores de honorários, sem captação de clientela e sem uso de casos ou clientes sem autorização. A aprovação final do conteúdo e a responsabilidade ética perante a OAB são do CONTRATANTE.[[/se]]

CLÁUSULA 2ª — DO PRAZO E DO QUE DEPENDE DO CONTRATANTE
2.1. O prazo de entrega da primeira versão é de {{prazo}}, contado a partir do pagamento da entrada e do recebimento de todo o material necessário.
2.2. Cabe ao CONTRATANTE enviar, pelo WhatsApp ou e-mail, os textos, fotos, logotipo, contatos, horários, acessos e demais informações pedidas pela CONTRATADA, e responder às dúvidas durante o projeto.
2.3. O prazo fica suspenso enquanto a CONTRATADA aguarda material, resposta ou aprovação do CONTRATANTE. Se o CONTRATANTE ficar mais de 30 (trinta) dias sem enviar o necessário, a CONTRATADA poderá entregar o projeto com o material que tiver ou encerrar o contrato conforme a Cláusula 9ª.
2.4. O CONTRATANTE garante que tem direito de usar os textos, fotos, marcas e demais materiais que enviar, e responde por eles perante terceiros.

CLÁUSULA 3ª — DO VALOR E DO PAGAMENTO
3.1. Pelo serviço, o CONTRATANTE pagará {{valor}} ({{valor_extenso}}).
3.2. Forma de pagamento: {{forma_pagamento}}
3.3. Os pagamentos podem ser feitos por Pix, cartão de débito ou de crédito. Eventuais taxas de parcelamento no cartão são informadas antes do pagamento.
3.4. Em caso de atraso, o valor em aberto será acrescido de multa de 2% (dois por cento), juros de mora de 1% (um por cento) ao mês, calculados por dia de atraso, e correção monetária pelo IPCA.
3.5. A publicação definitiva e a entrega dos arquivos ocorrem após a quitação do valor total.

CLÁUSULA 4ª — DAS REVISÕES E ALTERAÇÕES EXTRAS
4.1. Estão incluídas {{revisoes_incluidas}}. Cada rodada reúne, de uma vez, todos os ajustes pedidos naquele momento.
4.2. Considera-se ajuste a correção ou mudança dentro do que foi combinado na Cláusula 1ª. Novas páginas, novas funcionalidades ou mudança de escopo são alterações extras, orçadas à parte e feitas só depois da aprovação do orçamento pelo CONTRATANTE.
4.3. Se o CONTRATANTE não pedir ajustes em até 5 (cinco) dias após a entrega de cada versão, ela será considerada aprovada.

CLÁUSULA 5ª — DA PROPRIEDADE INTELECTUAL, DO DOMÍNIO E DAS CONTAS
5.1. Após a quitação integral, o CONTRATANTE passa a ter o direito de usar, por prazo indeterminado, o site ou sistema entregue, com seu layout, textos e imagens.
5.2. Os materiais enviados pelo CONTRATANTE (marca, fotos, textos, dados de clientes) continuam sendo dele.
5.3. Os componentes, trechos de código, modelos e ferramentas internas que a CONTRATADA já possuía ou reutiliza em outros projetos continuam sendo dela, com licença de uso não exclusiva e por prazo indeterminado ao CONTRATANTE, apenas para o projeto contratado.
5.4. O domínio (endereço do site) fica registrado em nome {{dominio_titular}}. Domínio registrado em nome da CONTRATADA a pedido do CONTRATANTE será transferido a ele, sem custo adicional, em até 10 (dez) dias após pedido por escrito, desde que não haja valores em aberto.
5.5. A CONTRATADA hospeda o projeto, sem custo, por {{hospedagem_cortesia}} após a entrega. Depois desse período, a hospedagem e as atualizações dependem do contrato de manutenção mensal; sem ele, a CONTRATADA entrega os arquivos do site ao CONTRATANTE, em até 10 (dez) dias após o pedido, para que ele hospede onde preferir.
5.6. Senhas e acessos de contas do CONTRATANTE (domínio, redes sociais, Google, gov.br) usados no projeto pertencem a ele. Ao final, o CONTRATANTE deve trocá-las, e a CONTRATADA não as guardará além do necessário.

CLÁUSULA 6ª — DA LIMITAÇÃO DE RESPONSABILIDADE
6.1. O site ou sistema depende de serviços de terceiros, como hospedagem, registro de domínio, WhatsApp, Google e provedores de internet. A CONTRATADA não responde por falhas, mudanças de regras, bloqueios ou indisponibilidade desses serviços, mas ajudará o CONTRATANTE a resolver o que estiver ao seu alcance.
6.2. A CONTRATADA não garante número de visitas, posição no Google ou volume de vendas, que dependem de fatores fora do seu controle.
6.3. Erros de funcionamento causados pelo trabalho da CONTRATADA e informados em até 30 (trinta) dias da entrega serão corrigidos sem custo.
[[PJ]]6.4. Exceto em caso de dolo, a responsabilidade total da CONTRATADA por danos ligados a este contrato fica limitada ao valor efetivamente pago pelo CONTRATANTE.[[/PJ]]

CLÁUSULA 7ª — DA PROTEÇÃO DE DADOS (LGPD)
7.1. As partes tratarão os dados pessoais envolvidos neste contrato de acordo com a Lei nº 13.709/2018 (Lei Geral de Proteção de Dados).
7.2. Os dados do CONTRATANTE (nome, documento, endereço e contatos) são usados pela CONTRATADA apenas para executar este contrato, emitir cobranças e cumprir obrigações legais, e não são vendidos nem repassados a terceiros sem necessidade.
7.3. Quando a CONTRATADA tiver acesso a dados de clientes, alunos, pacientes ou contatos do CONTRATANTE, ela atuará como operadora: tratará esses dados somente conforme as instruções do CONTRATANTE e para a finalidade deste contrato, manterá medidas razoáveis de segurança, não os usará para outros fins e os apagará ou devolverá ao fim do contrato, salvo obrigação legal de guarda.
7.4. O CONTRATANTE é responsável por ter base legal (como o consentimento) para os dados que coleta de seus próprios clientes e que entrega à CONTRATADA.
7.5. Qualquer incidente de segurança que envolva esses dados será comunicado à outra parte em até 2 (dois) dias úteis da descoberta.

CLÁUSULA 8ª — DA CONFIDENCIALIDADE
8.1. As partes manterão em sigilo as informações não públicas a que tiverem acesso por causa deste contrato, como senhas, dados financeiros, estratégias e listas de clientes, durante o contrato e por 2 (dois) anos após o seu término.
8.2. Não se considera quebra de sigilo a divulgação exigida por lei ou ordem judicial, nem o uso, no portfólio da CONTRATADA, de trabalhos já publicados, salvo pedido do CONTRATANTE em contrário.

CLÁUSULA 9ª — DA RESCISÃO
9.1. O CONTRATANTE pode desistir do projeto a qualquer momento, avisando por escrito. Nesse caso, pagará apenas o trabalho já realizado, proporcional às etapas concluídas, limitado ao valor da entrada; o que tiver sido pago a mais será devolvido em até 10 (dez) dias.
9.2. A CONTRATADA pode encerrar o contrato se o CONTRATANTE descumprir suas obrigações e não corrigir em até 5 (cinco) dias úteis após aviso por escrito, inclusive nos casos da Cláusula 2.3.
[[PF]]9.3. Por se tratar de contratação feita à distância (internet, WhatsApp ou telefone), o CONTRATANTE pode desistir deste contrato em até 7 (sete) dias contados da assinatura, com devolução integral dos valores pagos, conforme o art. 49 do Código de Defesa do Consumidor.[[/PF]]

CLÁUSULA 10 — DAS COMUNICAÇÕES E DA ASSINATURA
10.1. As comunicações entre as partes podem ser feitas por WhatsApp ou e-mail informados neste contrato e valem como aviso por escrito.
10.2. As partes reconhecem a validade da assinatura eletrônica deste contrato, inclusive pela assinatura gratuita do gov.br, nos termos da Lei nº 14.063/2020 e da Medida Provisória nº 2.200-2/2001.
10.3. Este contrato não cria vínculo de emprego, sociedade ou representação entre as partes.
10.4. Alterações deste contrato só valem se feitas por escrito e aceitas pelas duas partes.

CLÁUSULA 11 — DO FORO
11.1. Fica eleito o foro da {{foro}} para resolver qualquer questão deste contrato[[PF]], sem prejuízo do direito do CONTRATANTE, como consumidor, de propor ação no foro do seu domicílio (art. 101, I, do Código de Defesa do Consumidor)[[/PF]].

E, por estarem de acordo, as partes assinam este contrato eletronicamente.

{{cidade_assinatura}}, {{data_extenso}}.$modelo$,
'[{"key":"servico_descricao","label":"Descrição do serviço","type":"textarea","required":true,"hint":"Ex.: site institucional com página inicial, sobre, serviços, galeria e contato pelo WhatsApp."},{"key":"valor","label":"Valor total","type":"money","required":true,"hint":"Vem do orçamento aceito."},{"key":"forma_pagamento","label":"Forma de pagamento","type":"textarea","required":true,"default":"50% (cinquenta por cento) no fechamento, por Pix, débito ou crédito, e o restante na entrega. O valor do site pode ser parcelado em até 3 (três) vezes no cartão de crédito."},{"key":"prazo","label":"Prazo de entrega","type":"text","required":true,"default":"3 (três) dias úteis"},{"key":"revisoes_incluidas","label":"Revisões incluídas","type":"text","required":true,"default":"2 (duas) rodadas de ajustes após a primeira entrega"},{"key":"nao_incluso","label":"O que NÃO está incluso","type":"textarea","required":true,"default":"registro e renovação do domínio; e-mail profissional; produção de fotos, vídeos e textos de venda; tráfego pago; ferramentas, plugins ou integrações pagas de terceiros; manutenção mensal e hospedagem após o período de cortesia (que têm contrato próprio)."},{"key":"dominio_titular","label":"Em nome de quem fica o domínio","type":"text","required":true,"default":"do CONTRATANTE"},{"key":"hospedagem_cortesia","label":"Hospedagem de cortesia após a entrega","type":"text","required":true,"default":"30 (trinta) dias"},{"key":"cliente_advogado","label":"O cliente é advogado ou escritório de advocacia?","type":"boolean","required":false,"hint":"Inclui as regras de publicidade da OAB (Provimento 205/2021)."}]', CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "contract_templates" ("id", "baseTemplateId", "slug", "name", "kind", "category", "description", "version", "active", "content", "fieldsSchema", "updatedAt")
VALUES ('ctpl-manutencao-site-v1', 'ctpl-manutencao-site-v1', 'manutencao-site', 'Contrato de Manutenção Mensal de Site', 'CONTRATO', 'Sites e sistemas', 'Hospedagem e manutenção mensal de um site ou sistema que já existe.', 1, true,
$modelo$CONTRATO DE MANUTENÇÃO MENSAL DE SITE

Contrato nº {{contrato_numero}}

CONTRATADA: {{contratada_nome}}, empresa individual registrada como Microempreendedor Individual (MEI), inscrita no CNPJ nº {{contratada_cnpj}}, com sede na {{contratada_endereco}}, neste ato representada por seu titular, {{contratada_representante}}, WhatsApp {{contratada_whatsapp}}.

CONTRATANTE: {{cliente_qualificacao}}.

As partes têm entre si justo e acertado este Contrato de Manutenção Mensal, que se rege pelas cláusulas a seguir.

CLÁUSULA 1ª — DO OBJETO
1.1. A CONTRATADA prestará, todo mês, os serviços de hospedagem e manutenção de: {{site_endereco}}.
1.2. Estão incluídos: {{incluso}}
1.3. NÃO estão incluídos: {{nao_incluso}}
1.4. A CONTRATADA avaliará cada pedido e, se ele for um projeto novo, enviará orçamento separado, que só será feito após aprovação do CONTRATANTE.
[[se cliente_advogado]]Por ser o CONTRATANTE advogado ou sociedade de advogados, o site e seus textos seguirão o Código de Ética e Disciplina da OAB e o Provimento nº 205/2021, com conteúdo informativo e sóbrio, sem promessa de resultado, sem menção a valores de honorários, sem captação de clientela e sem uso de casos ou clientes sem autorização. A aprovação final do conteúdo e a responsabilidade ética perante a OAB são do CONTRATANTE.[[/se]]

CLÁUSULA 2ª — DO ATENDIMENTO E DO QUE DEPENDE DO CONTRATANTE
2.1. Os pedidos são feitos pelo WhatsApp e atendidos em {{prazo_atendimento}}, contado do recebimento de todo o material necessário (fotos, textos, informações).
2.2. O CONTRATANTE deve enviar o material e as informações completas e responder às dúvidas da CONTRATADA; enquanto isso não acontece, o prazo fica suspenso.
2.3. O CONTRATANTE garante que tem direito de usar o material que enviar e responde por ele perante terceiros.

CLÁUSULA 3ª — DO VALOR E DO PAGAMENTO
3.1. O CONTRATANTE pagará a mensalidade de {{valor_mensal}} ({{valor_mensal_extenso}}), com vencimento todo dia {{dia_vencimento}}, por Pix, débito ou crédito. A mensalidade não é parcelada.
3.2. A primeira mensalidade vence no primeiro dia {{dia_vencimento}} depois do início do contrato, em {{data_inicio}}.
3.3. Em caso de atraso, o valor em aberto será acrescido de multa de 2% (dois por cento), juros de mora de 1% (um por cento) ao mês, calculados por dia de atraso, e correção monetária pelo IPCA.

CLÁUSULA 4ª — DO REAJUSTE
4.1. A mensalidade será reajustada a cada 12 (doze) meses, contados de {{data_inicio}}, pela variação acumulada do IPCA no período, ou por outro índice oficial que o substitua.
4.2. A CONTRATADA avisará o novo valor com pelo menos 30 (trinta) dias de antecedência. Se o CONTRATANTE não concordar, pode encerrar o contrato sem multa antes da data do reajuste.

CLÁUSULA 5ª — DA SUSPENSÃO POR FALTA DE PAGAMENTO
5.1. Se a mensalidade ficar em atraso por mais de 10 (dez) dias, a CONTRATADA enviará aviso por escrito ao CONTRATANTE. Persistindo o atraso por mais 5 (cinco) dias úteis após o aviso, a CONTRATADA poderá suspender o serviço de manutenção e a hospedagem do site até a regularização.
5.2. Pago o valor em aberto, com os acréscimos da cláusula de pagamento, o serviço será reativado em até 2 (dois) dias úteis.
5.3. Atraso superior a 60 (sessenta) dias permite à CONTRATADA encerrar o contrato, sem prejuízo da cobrança do que estiver em aberto.

CLÁUSULA 6ª — DA PROPRIEDADE, DO DOMÍNIO E DAS CONTAS
6.1. O site, seus textos, imagens e dados continuam sendo do CONTRATANTE. Os componentes e ferramentas internas da CONTRATADA reutilizados em outros projetos continuam sendo dela, com licença de uso ao CONTRATANTE para este site.
6.2. A hospedagem é feita em conta de serviço de terceiros administrada pela CONTRATADA enquanto este contrato estiver em vigor.
6.3. Ao fim do contrato, quitados os valores em aberto, a CONTRATADA entregará os arquivos do site e transferirá ao CONTRATANTE o domínio que estiver em nome dela, em até 10 (dez) dias após o pedido.
6.4. Senhas e acessos de contas do CONTRATANTE pertencem a ele e devem ser trocados ao fim do contrato.

CLÁUSULA 7ª — DA LIMITAÇÃO DE RESPONSABILIDADE
7.1. O site depende de serviços de terceiros (hospedagem, domínio, WhatsApp, Google, provedores). A CONTRATADA não responde por falhas, bloqueios ou mudanças de regras desses serviços, mas atuará para restabelecer o site o quanto antes.
7.2. A CONTRATADA não garante número de visitas, posição no Google ou volume de vendas.
[[PJ]]7.3. Exceto em caso de dolo, a responsabilidade total da CONTRATADA por danos ligados a este contrato fica limitada ao valor das 3 (três) últimas mensalidades pagas.[[/PJ]]

CLÁUSULA 8ª — DA PROTEÇÃO DE DADOS (LGPD)
8.1. As partes tratarão os dados pessoais envolvidos neste contrato de acordo com a Lei nº 13.709/2018 (Lei Geral de Proteção de Dados).
8.2. Os dados do CONTRATANTE (nome, documento, endereço e contatos) são usados pela CONTRATADA apenas para executar este contrato, emitir cobranças e cumprir obrigações legais, e não são vendidos nem repassados a terceiros sem necessidade.
8.3. Quando a CONTRATADA tiver acesso a dados de clientes, alunos, pacientes ou contatos do CONTRATANTE, ela atuará como operadora: tratará esses dados somente conforme as instruções do CONTRATANTE e para a finalidade deste contrato, manterá medidas razoáveis de segurança, não os usará para outros fins e os apagará ou devolverá ao fim do contrato, salvo obrigação legal de guarda.
8.4. O CONTRATANTE é responsável por ter base legal (como o consentimento) para os dados que coleta de seus próprios clientes e que entrega à CONTRATADA.
8.5. Qualquer incidente de segurança que envolva esses dados será comunicado à outra parte em até 2 (dois) dias úteis da descoberta.

CLÁUSULA 9ª — DA CONFIDENCIALIDADE
9.1. As partes manterão em sigilo as informações não públicas a que tiverem acesso por causa deste contrato, como senhas, dados financeiros, estratégias e listas de clientes, durante o contrato e por 2 (dois) anos após o seu término.
9.2. Não se considera quebra de sigilo a divulgação exigida por lei ou ordem judicial, nem o uso, no portfólio da CONTRATADA, de trabalhos já publicados, salvo pedido do CONTRATANTE em contrário.

CLÁUSULA 10 — DO PRAZO, DA RESCISÃO E DO AVISO PRÉVIO
10.1. Este contrato vale por prazo indeterminado a partir de {{data_inicio}}.
10.2. Qualquer das partes pode encerrá-lo a qualquer momento, sem multa, avisando a outra por escrito com 30 (trinta) dias de antecedência. Durante o aviso, os serviços e a mensalidade continuam normalmente.
10.3. O contrato pode ser rescindido de imediato, sem aviso prévio, em caso de descumprimento grave de cláusula que não seja corrigido em até 5 (cinco) dias úteis após aviso por escrito.
10.4. Encerrado o contrato, a CONTRATADA mantém o site no ar até o último dia do período já pago e cumpre o disposto na Cláusula 6.3.
[[PF]]10.5. Por se tratar de contratação feita à distância (internet, WhatsApp ou telefone), o CONTRATANTE pode desistir deste contrato em até 7 (sete) dias contados da assinatura, com devolução integral dos valores pagos, conforme o art. 49 do Código de Defesa do Consumidor.[[/PF]]

CLÁUSULA 11 — DAS COMUNICAÇÕES E DA ASSINATURA
11.1. As comunicações entre as partes podem ser feitas por WhatsApp ou e-mail informados neste contrato e valem como aviso por escrito.
11.2. As partes reconhecem a validade da assinatura eletrônica deste contrato, inclusive pela assinatura gratuita do gov.br, nos termos da Lei nº 14.063/2020 e da Medida Provisória nº 2.200-2/2001.
11.3. Este contrato não cria vínculo de emprego, sociedade ou representação entre as partes.
11.4. Alterações deste contrato só valem se feitas por escrito e aceitas pelas duas partes.

CLÁUSULA 12 — DO FORO
12.1. Fica eleito o foro da {{foro}} para resolver qualquer questão deste contrato[[PF]], sem prejuízo do direito do CONTRATANTE, como consumidor, de propor ação no foro do seu domicílio (art. 101, I, do Código de Defesa do Consumidor)[[/PF]].

E, por estarem de acordo, as partes assinam este contrato eletronicamente.

{{cidade_assinatura}}, {{data_extenso}}.$modelo$,
'[{"key":"site_endereco","label":"Endereço do site ou nome do sistema","type":"text","required":true,"hint":"Ex.: www.lojadamaria.com.br"},{"key":"valor_mensal","label":"Mensalidade","type":"money","required":true,"default":"100"},{"key":"dia_vencimento","label":"Dia do vencimento da mensalidade","type":"number","required":true,"hint":"Ex.: 10"},{"key":"data_inicio","label":"Início do contrato","type":"date","required":true},{"key":"incluso","label":"O que está incluso","type":"textarea","required":true,"default":"hospedagem do site; atualizações de segurança; troca de fotos e do portfólio; atualização de contatos, endereço, horários e preços; pequenas alterações de texto e layout; e inclusão de novas funcionalidades de pequeno e médio porte."},{"key":"nao_incluso","label":"O que NÃO está incluso","type":"textarea","required":true,"default":"registro e renovação do domínio; e-mail profissional; produção de fotos, vídeos e textos; tráfego pago; e pedidos que equivalham a um projeto novo, como loja virtual, área de membros ou sistema novo, que são orçados à parte."},{"key":"prazo_atendimento","label":"Prazo de atendimento dos pedidos","type":"text","required":true,"default":"até 3 (três) dias úteis por pedido"},{"key":"cliente_advogado","label":"O cliente é advogado ou escritório de advocacia?","type":"boolean","required":false,"hint":"Inclui as regras de publicidade da OAB (Provimento 205/2021)."}]', CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "contract_templates" ("id", "baseTemplateId", "slug", "name", "kind", "category", "description", "version", "active", "content", "fieldsSchema", "updatedAt")
VALUES ('ctpl-site-combo-v1', 'ctpl-site-combo-v1', 'site-combo', 'Contrato de Criação de Site + Manutenção Mensal (Combo)', 'CONTRATO', 'Sites e sistemas', 'Criação do site ou sistema já com a manutenção mensal contratada.', 1, true,
$modelo$CONTRATO DE CRIAÇÃO DE SITE E MANUTENÇÃO MENSAL

Contrato nº {{contrato_numero}}

CONTRATADA: {{contratada_nome}}, empresa individual registrada como Microempreendedor Individual (MEI), inscrita no CNPJ nº {{contratada_cnpj}}, com sede na {{contratada_endereco}}, neste ato representada por seu titular, {{contratada_representante}}, WhatsApp {{contratada_whatsapp}}.

CONTRATANTE: {{cliente_qualificacao}}.

As partes têm entre si justo e acertado este Contrato de Criação de Site e Manutenção Mensal, que se rege pelas cláusulas a seguir.

CLÁUSULA 1ª — DO OBJETO
1.1. Criação: a CONTRATADA criará para o CONTRATANTE: {{servico_descricao}}
1.2. Manutenção: depois da entrega, a CONTRATADA prestará, todo mês, os serviços de hospedagem e manutenção do projeto, que incluem: {{incluso}}
1.3. NÃO estão incluídos: {{nao_incluso}} Pedidos que equivalham a um projeto novo (loja virtual, área de membros, sistema novo) são orçados à parte.
[[se cliente_advogado]]Por ser o CONTRATANTE advogado ou sociedade de advogados, o site e seus textos seguirão o Código de Ética e Disciplina da OAB e o Provimento nº 205/2021, com conteúdo informativo e sóbrio, sem promessa de resultado, sem menção a valores de honorários, sem captação de clientela e sem uso de casos ou clientes sem autorização. A aprovação final do conteúdo e a responsabilidade ética perante a OAB são do CONTRATANTE.[[/se]]

CLÁUSULA 2ª — DO PRAZO E DO QUE DEPENDE DO CONTRATANTE
2.1. A primeira versão do projeto será entregue em {{prazo}}, contados do pagamento da entrada e do recebimento de todo o material necessário.
2.2. Cabe ao CONTRATANTE enviar textos, fotos, logotipo, contatos, horários, acessos e demais informações pedidas, e responder às dúvidas. Enquanto a CONTRATADA aguarda material, resposta ou aprovação, os prazos ficam suspensos.
2.3. Na manutenção, os pedidos são feitos pelo WhatsApp e atendidos em até 3 (três) dias úteis, contados do recebimento do material.
2.4. O CONTRATANTE garante que tem direito de usar o material que enviar e responde por ele perante terceiros.

CLÁUSULA 3ª — DO VALOR E DO PAGAMENTO
3.1. Criação: {{valor}} ({{valor_extenso}}). Forma de pagamento: {{forma_pagamento}}
3.2. Manutenção: mensalidade de {{valor_mensal}} ({{valor_mensal_extenso}}), com vencimento todo dia {{dia_vencimento}}, a partir do mês seguinte à entrega do site. A mensalidade não é parcelada.
3.3. Os pagamentos podem ser feitos por Pix, débito ou crédito.
3.4. Em caso de atraso, o valor em aberto será acrescido de multa de 2% (dois por cento), juros de mora de 1% (um por cento) ao mês, calculados por dia de atraso, e correção monetária pelo IPCA.

CLÁUSULA 4ª — DAS REVISÕES E ALTERAÇÕES EXTRAS
4.1. Na criação estão incluídas {{revisoes_incluidas}}. Mudanças de escopo são orçadas à parte e só feitas após aprovação.
4.2. Se o CONTRATANTE não pedir ajustes em até 5 (cinco) dias após a entrega de cada versão, ela será considerada aprovada.

CLÁUSULA 5ª — DO REAJUSTE
5.1. A mensalidade será reajustada a cada 12 (doze) meses, contados de {{data_inicio}}, pela variação acumulada do IPCA no período, ou por outro índice oficial que o substitua.
5.2. A CONTRATADA avisará o novo valor com pelo menos 30 (trinta) dias de antecedência. Se o CONTRATANTE não concordar, pode encerrar o contrato sem multa antes da data do reajuste.

CLÁUSULA 6ª — DA SUSPENSÃO POR FALTA DE PAGAMENTO
6.1. Se a mensalidade ficar em atraso por mais de 10 (dez) dias, a CONTRATADA enviará aviso por escrito ao CONTRATANTE. Persistindo o atraso por mais 5 (cinco) dias úteis após o aviso, a CONTRATADA poderá suspender o serviço de manutenção e a hospedagem do site até a regularização.
6.2. Pago o valor em aberto, com os acréscimos da cláusula de pagamento, o serviço será reativado em até 2 (dois) dias úteis.
6.3. Atraso superior a 60 (sessenta) dias permite à CONTRATADA encerrar o contrato, sem prejuízo da cobrança do que estiver em aberto.

CLÁUSULA 7ª — DA PROPRIEDADE INTELECTUAL, DO DOMÍNIO E DAS CONTAS
7.1. Após a quitação do valor da criação, o CONTRATANTE passa a ter o direito de usar, por prazo indeterminado, o site entregue, com seu layout, textos e imagens. Os materiais enviados por ele continuam sendo dele.
7.2. Os componentes e ferramentas internas da CONTRATADA reutilizados em outros projetos continuam sendo dela, com licença de uso ao CONTRATANTE para este projeto.
7.3. O domínio fica registrado em nome {{dominio_titular}}. A hospedagem é feita em conta de serviço de terceiros administrada pela CONTRATADA enquanto durar a manutenção.
7.4. Ao fim do contrato, quitados os valores em aberto, a CONTRATADA entregará os arquivos do site e transferirá ao CONTRATANTE o domínio que estiver em nome dela, em até 10 (dez) dias após o pedido.
7.5. Senhas e acessos de contas do CONTRATANTE pertencem a ele e devem ser trocados ao fim do contrato.

CLÁUSULA 8ª — DA LIMITAÇÃO DE RESPONSABILIDADE
8.1. O site depende de serviços de terceiros (hospedagem, domínio, WhatsApp, Google, provedores). A CONTRATADA não responde por falhas, bloqueios ou mudanças de regras desses serviços, mas atuará para restabelecer o site o quanto antes.
8.2. A CONTRATADA não garante número de visitas, posição no Google ou volume de vendas.
[[PJ]]8.3. Exceto em caso de dolo, a responsabilidade total da CONTRATADA por danos ligados a este contrato fica limitada ao valor efetivamente pago pelo CONTRATANTE nos últimos 12 (doze) meses.[[/PJ]]

CLÁUSULA 9ª — DA PROTEÇÃO DE DADOS (LGPD)
9.1. As partes tratarão os dados pessoais envolvidos neste contrato de acordo com a Lei nº 13.709/2018 (Lei Geral de Proteção de Dados).
9.2. Os dados do CONTRATANTE (nome, documento, endereço e contatos) são usados pela CONTRATADA apenas para executar este contrato, emitir cobranças e cumprir obrigações legais, e não são vendidos nem repassados a terceiros sem necessidade.
9.3. Quando a CONTRATADA tiver acesso a dados de clientes, alunos, pacientes ou contatos do CONTRATANTE, ela atuará como operadora: tratará esses dados somente conforme as instruções do CONTRATANTE e para a finalidade deste contrato, manterá medidas razoáveis de segurança, não os usará para outros fins e os apagará ou devolverá ao fim do contrato, salvo obrigação legal de guarda.
9.4. O CONTRATANTE é responsável por ter base legal (como o consentimento) para os dados que coleta de seus próprios clientes e que entrega à CONTRATADA.
9.5. Qualquer incidente de segurança que envolva esses dados será comunicado à outra parte em até 2 (dois) dias úteis da descoberta.

CLÁUSULA 10 — DA CONFIDENCIALIDADE
10.1. As partes manterão em sigilo as informações não públicas a que tiverem acesso por causa deste contrato, como senhas, dados financeiros, estratégias e listas de clientes, durante o contrato e por 2 (dois) anos após o seu término.
10.2. Não se considera quebra de sigilo a divulgação exigida por lei ou ordem judicial, nem o uso, no portfólio da CONTRATADA, de trabalhos já publicados, salvo pedido do CONTRATANTE em contrário.

CLÁUSULA 11 — DO PRAZO, DA RESCISÃO E DO AVISO PRÉVIO
11.1. Este contrato começa em {{data_inicio}} e vale por prazo indeterminado.
11.2. Antes da entrega do site, o CONTRATANTE pode desistir avisando por escrito, pagando apenas o trabalho já realizado, limitado ao valor da entrada; o que tiver sido pago a mais será devolvido em até 10 (dez) dias.
11.3. Depois da entrega, qualquer das partes pode encerrar a manutenção a qualquer momento, sem multa, com aviso por escrito de 30 (trinta) dias. O encerramento da manutenção não muda o valor da criação já combinado.
11.4. Descumprimento grave não corrigido em até 5 (cinco) dias úteis após aviso por escrito permite a rescisão imediata.
[[PF]]11.5. Por se tratar de contratação feita à distância (internet, WhatsApp ou telefone), o CONTRATANTE pode desistir deste contrato em até 7 (sete) dias contados da assinatura, com devolução integral dos valores pagos, conforme o art. 49 do Código de Defesa do Consumidor.[[/PF]]

CLÁUSULA 12 — DAS COMUNICAÇÕES E DA ASSINATURA
12.1. As comunicações entre as partes podem ser feitas por WhatsApp ou e-mail informados neste contrato e valem como aviso por escrito.
12.2. As partes reconhecem a validade da assinatura eletrônica deste contrato, inclusive pela assinatura gratuita do gov.br, nos termos da Lei nº 14.063/2020 e da Medida Provisória nº 2.200-2/2001.
12.3. Este contrato não cria vínculo de emprego, sociedade ou representação entre as partes.
12.4. Alterações deste contrato só valem se feitas por escrito e aceitas pelas duas partes.

CLÁUSULA 13 — DO FORO
13.1. Fica eleito o foro da {{foro}} para resolver qualquer questão deste contrato[[PF]], sem prejuízo do direito do CONTRATANTE, como consumidor, de propor ação no foro do seu domicílio (art. 101, I, do Código de Defesa do Consumidor)[[/PF]].

E, por estarem de acordo, as partes assinam este contrato eletronicamente.

{{cidade_assinatura}}, {{data_extenso}}.$modelo$,
'[{"key":"servico_descricao","label":"Descrição do serviço","type":"textarea","required":true,"hint":"Ex.: site institucional com página inicial, serviços, galeria e contato pelo WhatsApp."},{"key":"valor","label":"Valor total","type":"money","required":true,"hint":"Vem do orçamento aceito."},{"key":"forma_pagamento","label":"Forma de pagamento","type":"textarea","required":true,"default":"50% (cinquenta por cento) no fechamento, por Pix, débito ou crédito, e o restante na entrega. O valor do site pode ser parcelado em até 3 (três) vezes no cartão de crédito."},{"key":"prazo","label":"Prazo de entrega","type":"text","required":true,"default":"3 (três) dias úteis"},{"key":"revisoes_incluidas","label":"Revisões incluídas","type":"text","required":true,"default":"2 (duas) rodadas de ajustes após a primeira entrega"},{"key":"nao_incluso","label":"O que NÃO está incluso","type":"textarea","required":true,"default":"registro e renovação do domínio; e-mail profissional; produção de fotos, vídeos e textos de venda; tráfego pago; ferramentas ou integrações pagas de terceiros."},{"key":"dominio_titular","label":"Em nome de quem fica o domínio","type":"text","required":true,"default":"do CONTRATANTE"},{"key":"valor_mensal","label":"Mensalidade","type":"money","required":true,"default":"100"},{"key":"dia_vencimento","label":"Dia do vencimento da mensalidade","type":"number","required":true,"hint":"Ex.: 10"},{"key":"data_inicio","label":"Data de início (assinatura)","type":"date","required":true},{"key":"incluso","label":"O que a manutenção inclui","type":"textarea","required":true,"default":"hospedagem do site; atualizações de segurança; troca de fotos e do portfólio; atualização de contatos, endereço, horários e preços; pequenas alterações de texto e layout; e inclusão de novas funcionalidades de pequeno e médio porte."},{"key":"cliente_advogado","label":"O cliente é advogado ou escritório de advocacia?","type":"boolean","required":false,"hint":"Inclui as regras de publicidade da OAB (Provimento 205/2021)."}]', CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "contract_templates" ("id", "baseTemplateId", "slug", "name", "kind", "category", "description", "version", "active", "content", "fieldsSchema", "updatedAt")
VALUES ('ctpl-assessoria-avulso-v1', 'ctpl-assessoria-avulso-v1', 'assessoria-avulso', 'Contrato de Assessoria Administrativa / Serviço Avulso', 'CONTRATO', 'Assessoria administrativa', 'Serviços pontuais: abertura ou baixa de MEI, emissão de documentos, currículo, declarações, cadastros.', 1, true,
$modelo$CONTRATO DE PRESTAÇÃO DE SERVIÇO DE ASSESSORIA ADMINISTRATIVA

Contrato nº {{contrato_numero}}

CONTRATADA: {{contratada_nome}}, empresa individual registrada como Microempreendedor Individual (MEI), inscrita no CNPJ nº {{contratada_cnpj}}, com sede na {{contratada_endereco}}, neste ato representada por seu titular, {{contratada_representante}}, WhatsApp {{contratada_whatsapp}}.

CONTRATANTE: {{cliente_qualificacao}}.

As partes têm entre si justo e acertado este Contrato de Prestação de Serviço, que se rege pelas cláusulas a seguir.

CLÁUSULA 1ª — DO OBJETO
1.1. A CONTRATADA prestará ao CONTRATANTE o seguinte serviço: {{servico_descricao}}
1.2. NÃO estão incluídos: {{nao_incluso}}
1.3. A CONTRATADA presta serviço administrativo, de apoio e organização. Ela não é escritório de contabilidade nem de advocacia, e não presta consultoria jurídica.

CLÁUSULA 2ª — DO PRAZO E DO QUE DEPENDE DO CONTRATANTE
2.1. O serviço será feito em {{prazo}}, contados do pagamento e do recebimento de todos os documentos e informações.
2.2. O CONTRATANTE deve enviar: {{documentos_necessarios}}
2.3. O prazo fica suspenso enquanto a CONTRATADA aguarda documentos, respostas, códigos de acesso ou a análise de órgãos públicos, cujos prazos não dependem dela.
2.4. O CONTRATANTE é responsável pela veracidade das informações e documentos que fornecer. A CONTRATADA não responde por indeferimentos, multas ou exigências decorrentes de informações incorretas ou de decisões dos órgãos.

CLÁUSULA 3ª — DO VALOR E DO PAGAMENTO
3.1. Pelo serviço, o CONTRATANTE pagará {{valor}} ({{valor_extenso}}).
3.2. Forma de pagamento: {{forma_pagamento}}
3.3. Em caso de atraso, o valor em aberto será acrescido de multa de 2% (dois por cento), juros de mora de 1% (um por cento) ao mês, calculados por dia de atraso, e correção monetária pelo IPCA.

CLÁUSULA 4ª — DAS CORREÇÕES E DOS SERVIÇOS EXTRAS
4.1. Erros cometidos pela CONTRATADA serão corrigidos sem custo.
4.2. Pedidos diferentes do serviço descrito na Cláusula 1ª, ou refazer o serviço por mudança de informação do CONTRATANTE, serão orçados à parte e feitos após aprovação.

CLÁUSULA 5ª — DOS ACESSOS E SENHAS
5.1. Quando o serviço exigir acesso a contas do CONTRATANTE (como gov.br, Receita Federal ou prefeitura), o acesso será usado apenas para o serviço contratado, durante o tempo necessário.
5.2. A CONTRATADA não guardará senhas depois da conclusão. O CONTRATANTE deve trocar a senha ao final do serviço.
5.3. Os documentos produzidos são do CONTRATANTE e serão entregues a ele em PDF ou pelo meio combinado.

CLÁUSULA 6ª — DA LIMITAÇÃO DE RESPONSABILIDADE
6.1. A CONTRATADA se compromete a realizar o serviço com cuidado e dentro das regras vigentes, mas não garante resultados que dependem de órgãos públicos, bancos ou terceiros, como aprovação de crédito, deferimento de pedidos ou contratação em vaga de emprego.
6.2. Instabilidades e mudanças de sistemas públicos (gov.br, Receita, prefeituras) podem atrasar o serviço sem culpa da CONTRATADA.
[[PJ]]6.3. Exceto em caso de dolo, a responsabilidade total da CONTRATADA por danos ligados a este contrato fica limitada ao valor pago pelo serviço.[[/PJ]]

CLÁUSULA 7ª — DA PROTEÇÃO DE DADOS (LGPD)
7.1. As partes tratarão os dados pessoais envolvidos neste contrato de acordo com a Lei nº 13.709/2018 (Lei Geral de Proteção de Dados).
7.2. Os dados do CONTRATANTE (nome, documento, endereço e contatos) são usados pela CONTRATADA apenas para executar este contrato, emitir cobranças e cumprir obrigações legais, e não são vendidos nem repassados a terceiros sem necessidade.
7.3. Quando a CONTRATADA tiver acesso a dados de clientes, alunos, pacientes ou contatos do CONTRATANTE, ela atuará como operadora: tratará esses dados somente conforme as instruções do CONTRATANTE e para a finalidade deste contrato, manterá medidas razoáveis de segurança, não os usará para outros fins e os apagará ou devolverá ao fim do contrato, salvo obrigação legal de guarda.
7.4. O CONTRATANTE é responsável por ter base legal (como o consentimento) para os dados que coleta de seus próprios clientes e que entrega à CONTRATADA.
7.5. Qualquer incidente de segurança que envolva esses dados será comunicado à outra parte em até 2 (dois) dias úteis da descoberta.

CLÁUSULA 8ª — DA CONFIDENCIALIDADE
8.1. As partes manterão em sigilo as informações não públicas a que tiverem acesso por causa deste contrato, como senhas, dados financeiros, estratégias e listas de clientes, durante o contrato e por 2 (dois) anos após o seu término.
8.2. Não se considera quebra de sigilo a divulgação exigida por lei ou ordem judicial, nem o uso, no portfólio da CONTRATADA, de trabalhos já publicados, salvo pedido do CONTRATANTE em contrário.

CLÁUSULA 9ª — DA RESCISÃO
9.1. O CONTRATANTE pode desistir do serviço antes de sua conclusão, avisando por escrito. Nesse caso, pagará apenas a parte já realizada; o que tiver sido pago a mais será devolvido em até 10 (dez) dias.
9.2. A CONTRATADA pode encerrar o contrato se o CONTRATANTE não enviar o necessário em até 30 (trinta) dias, ou se descumprir este contrato e não corrigir em até 5 (cinco) dias úteis após aviso.
[[PF]]9.3. Por se tratar de contratação feita à distância (internet, WhatsApp ou telefone), o CONTRATANTE pode desistir deste contrato em até 7 (sete) dias contados da assinatura, com devolução integral dos valores pagos, conforme o art. 49 do Código de Defesa do Consumidor.[[/PF]]

CLÁUSULA 10 — DAS COMUNICAÇÕES E DA ASSINATURA
10.1. As comunicações entre as partes podem ser feitas por WhatsApp ou e-mail informados neste contrato e valem como aviso por escrito.
10.2. As partes reconhecem a validade da assinatura eletrônica deste contrato, inclusive pela assinatura gratuita do gov.br, nos termos da Lei nº 14.063/2020 e da Medida Provisória nº 2.200-2/2001.
10.3. Este contrato não cria vínculo de emprego, sociedade ou representação entre as partes.
10.4. Alterações deste contrato só valem se feitas por escrito e aceitas pelas duas partes.

CLÁUSULA 11 — DO FORO
11.1. Fica eleito o foro da {{foro}} para resolver qualquer questão deste contrato[[PF]], sem prejuízo do direito do CONTRATANTE, como consumidor, de propor ação no foro do seu domicílio (art. 101, I, do Código de Defesa do Consumidor)[[/PF]].

E, por estarem de acordo, as partes assinam este contrato eletronicamente.

{{cidade_assinatura}}, {{data_extenso}}.$modelo$,
'[{"key":"servico_descricao","label":"Descrição do serviço","type":"textarea","required":true,"hint":"Ex.: abertura de MEI no portal gov.br, com emissão do CCMEI e orientação sobre a guia DAS."},{"key":"valor","label":"Valor total","type":"money","required":true,"hint":"Vem do orçamento aceito."},{"key":"forma_pagamento","label":"Forma de pagamento","type":"textarea","required":true,"default":"à vista, por Pix, débito ou crédito, no fechamento do serviço."},{"key":"prazo","label":"Prazo de entrega","type":"text","required":true,"default":"até 5 (cinco) dias úteis"},{"key":"documentos_necessarios","label":"Documentos e informações que o cliente precisa enviar","type":"textarea","required":true,"default":"documento de identidade com CPF, comprovante de endereço, e-mail e telefone, além das informações pedidas pela CONTRATADA para o serviço."},{"key":"nao_incluso","label":"O que NÃO está incluso","type":"textarea","required":true,"default":"taxas, guias e emolumentos cobrados por órgãos públicos, cartórios ou bancos, que são pagos diretamente pelo CONTRATANTE; serviços de contabilidade; e qualquer orientação ou representação jurídica, que são exclusivas de advogado."}]', CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "contract_templates" ("id", "baseTemplateId", "slug", "name", "kind", "category", "description", "version", "active", "content", "fieldsSchema", "updatedAt")
VALUES ('ctpl-social-media-v1', 'ctpl-social-media-v1', 'social-media', 'Contrato de Social Media, Design e Vídeo', 'CONTRATO', 'Social media', 'Gestão de redes sociais, artes, carrosséis, Reels e legendas, com mensalidade.', 1, true,
$modelo$CONTRATO DE PRESTAÇÃO DE SERVIÇOS DE SOCIAL MEDIA, DESIGN E VÍDEO

Contrato nº {{contrato_numero}}

CONTRATADA: {{contratada_nome}}, empresa individual registrada como Microempreendedor Individual (MEI), inscrita no CNPJ nº {{contratada_cnpj}}, com sede na {{contratada_endereco}}, neste ato representada por seu titular, {{contratada_representante}}, WhatsApp {{contratada_whatsapp}}.

CONTRATANTE: {{cliente_qualificacao}}.

As partes têm entre si justo e acertado este Contrato de Prestação de Serviços de Social Media, que se rege pelas cláusulas a seguir.

CLÁUSULA 1ª — DO OBJETO
1.1. A CONTRATADA fará o planejamento, a criação e a publicação de conteúdo para: {{redes}}, com as seguintes entregas por mês: {{escopo_mensal}}
1.2. NÃO estão incluídos: {{nao_incluso}} Esses itens podem ser orçados à parte.
1.3. Entregas não usadas em um mês por falta de material ou aprovação do CONTRATANTE não se acumulam para o mês seguinte.
[[se cliente_advogado]]1.4. Por ser o CONTRATANTE advogado ou sociedade de advogados, o conteúdo seguirá o Código de Ética e Disciplina da OAB e o Provimento nº 205/2021: caráter informativo, linguagem sóbria, sem promessa de resultado, sem menção a honorários, sem captação de clientela e sem exposição de casos ou clientes. A aprovação final e a responsabilidade ética perante a OAB são do CONTRATANTE.[[/se]]

CLÁUSULA 2ª — DO CALENDÁRIO, DA APROVAÇÃO E DO QUE DEPENDE DO CONTRATANTE
2.1. A CONTRATADA envia o calendário do mês, e o CONTRATANTE tem {{prazo_aprovacao}} para aprovar ou pedir ajustes. Sem resposta nesse prazo, o conteúdo será considerado aprovado.
2.2. O CONTRATANTE deve enviar fotos, vídeos, informações de produtos, preços e promoções, e dar o acesso necessário às contas.
2.3. Atrasos no envio de material ou na aprovação adiam as publicações, sem desconto na mensalidade.

CLÁUSULA 3ª — DO VALOR E DO PAGAMENTO
3.1. O CONTRATANTE pagará a mensalidade de {{valor_mensal}} ({{valor_mensal_extenso}}), com vencimento todo dia {{dia_vencimento}}, por Pix, débito ou crédito. A mensalidade não é parcelada.
3.2. Em caso de atraso, o valor em aberto será acrescido de multa de 2% (dois por cento), juros de mora de 1% (um por cento) ao mês, calculados por dia de atraso, e correção monetária pelo IPCA.

CLÁUSULA 4ª — DAS REVISÕES E DOS EXTRAS
4.1. Estão incluídas {{revisoes_incluidas}}. Pedidos de peças além do combinado, ou refazer peças já aprovadas, são cobrados à parte, mediante orçamento aprovado.

CLÁUSULA 5ª — DO REAJUSTE
5.1. A mensalidade será reajustada a cada 12 (doze) meses, contados de {{data_inicio}}, pela variação acumulada do IPCA no período, ou por outro índice oficial que o substitua.
5.2. A CONTRATADA avisará o novo valor com pelo menos 30 (trinta) dias de antecedência. Se o CONTRATANTE não concordar, pode encerrar o contrato sem multa antes da data do reajuste.

CLÁUSULA 6ª — DA SUSPENSÃO POR FALTA DE PAGAMENTO
6.1. Se a mensalidade ficar em atraso por mais de 10 (dez) dias, a CONTRATADA enviará aviso por escrito ao CONTRATANTE. Persistindo o atraso por mais 5 (cinco) dias úteis após o aviso, a CONTRATADA poderá suspender o serviço de criação e publicação até a regularização.
6.2. Pago o valor em aberto, com os acréscimos da cláusula de pagamento, o serviço será reativado em até 2 (dois) dias úteis.
6.3. Atraso superior a 60 (sessenta) dias permite à CONTRATADA encerrar o contrato, sem prejuízo da cobrança do que estiver em aberto.

CLÁUSULA 7ª — DA PROPRIEDADE INTELECTUAL E DO USO DE IMAGEM
7.1. As artes, vídeos e legendas aprovados e pagos podem ser usados pelo CONTRATANTE por prazo indeterminado em suas redes e materiais. Os arquivos editáveis (abertos) continuam com a CONTRATADA, salvo acordo por escrito.
7.2. O CONTRATANTE garante que tem autorização das pessoas que aparecem nas fotos e vídeos que enviar e direito de uso das músicas, marcas e imagens fornecidas, e responde por isso perante terceiros.
7.3. A CONTRATADA usa músicas e imagens de bancos licenciados ou liberados pelas próprias plataformas, e pode citar os trabalhos publicados em seu portfólio, salvo pedido do CONTRATANTE em contrário.
7.4. As contas e perfis são do CONTRATANTE. Ao fim do contrato, a CONTRATADA deixa de acessá-las, e o CONTRATANTE deve trocar as senhas.

CLÁUSULA 8ª — DA LIMITAÇÃO DE RESPONSABILIDADE
8.1. A CONTRATADA trabalha para melhorar a presença do CONTRATANTE nas redes, mas não garante número de seguidores, alcance, curtidas ou vendas, que dependem dos algoritmos das plataformas, do mercado e da oferta do CONTRATANTE.
8.2. A CONTRATADA não responde por bloqueios, quedas ou mudanças de regras das plataformas, nem pelo atendimento dos clientes do CONTRATANTE.
[[PJ]]8.3. Exceto em caso de dolo, a responsabilidade total da CONTRATADA por danos ligados a este contrato fica limitada ao valor das 3 (três) últimas mensalidades pagas.[[/PJ]]

CLÁUSULA 9ª — DA PROTEÇÃO DE DADOS (LGPD)
9.1. As partes tratarão os dados pessoais envolvidos neste contrato de acordo com a Lei nº 13.709/2018 (Lei Geral de Proteção de Dados).
9.2. Os dados do CONTRATANTE (nome, documento, endereço e contatos) são usados pela CONTRATADA apenas para executar este contrato, emitir cobranças e cumprir obrigações legais, e não são vendidos nem repassados a terceiros sem necessidade.
9.3. Quando a CONTRATADA tiver acesso a dados de clientes, alunos, pacientes ou contatos do CONTRATANTE, ela atuará como operadora: tratará esses dados somente conforme as instruções do CONTRATANTE e para a finalidade deste contrato, manterá medidas razoáveis de segurança, não os usará para outros fins e os apagará ou devolverá ao fim do contrato, salvo obrigação legal de guarda.
9.4. O CONTRATANTE é responsável por ter base legal (como o consentimento) para os dados que coleta de seus próprios clientes e que entrega à CONTRATADA.
9.5. Qualquer incidente de segurança que envolva esses dados será comunicado à outra parte em até 2 (dois) dias úteis da descoberta.

CLÁUSULA 10 — DA CONFIDENCIALIDADE
10.1. As partes manterão em sigilo as informações não públicas a que tiverem acesso por causa deste contrato, como senhas, dados financeiros, estratégias e listas de clientes, durante o contrato e por 2 (dois) anos após o seu término.
10.2. Não se considera quebra de sigilo a divulgação exigida por lei ou ordem judicial, nem o uso, no portfólio da CONTRATADA, de trabalhos já publicados, salvo pedido do CONTRATANTE em contrário.

CLÁUSULA 11 — DO PRAZO, DA RESCISÃO E DO AVISO PRÉVIO
11.1. Este contrato vale por prazo indeterminado a partir de {{data_inicio}}.
11.2. Qualquer das partes pode encerrá-lo a qualquer momento, sem multa, avisando a outra por escrito com 30 (trinta) dias de antecedência. Durante o aviso, os serviços e a mensalidade continuam normalmente.
11.3. O contrato pode ser rescindido de imediato, sem aviso prévio, em caso de descumprimento grave de cláusula que não seja corrigido em até 5 (cinco) dias úteis após aviso por escrito.
11.4. Encerrado o contrato, a CONTRATADA entrega o que já estiver pago e aprovado e para de publicar no último dia do período pago.
[[PF]]11.5. Por se tratar de contratação feita à distância (internet, WhatsApp ou telefone), o CONTRATANTE pode desistir deste contrato em até 7 (sete) dias contados da assinatura, com devolução integral dos valores pagos, conforme o art. 49 do Código de Defesa do Consumidor.[[/PF]]

CLÁUSULA 12 — DAS COMUNICAÇÕES E DA ASSINATURA
12.1. As comunicações entre as partes podem ser feitas por WhatsApp ou e-mail informados neste contrato e valem como aviso por escrito.
12.2. As partes reconhecem a validade da assinatura eletrônica deste contrato, inclusive pela assinatura gratuita do gov.br, nos termos da Lei nº 14.063/2020 e da Medida Provisória nº 2.200-2/2001.
12.3. Este contrato não cria vínculo de emprego, sociedade ou representação entre as partes.
12.4. Alterações deste contrato só valem se feitas por escrito e aceitas pelas duas partes.

CLÁUSULA 13 — DO FORO
13.1. Fica eleito o foro da {{foro}} para resolver qualquer questão deste contrato[[PF]], sem prejuízo do direito do CONTRATANTE, como consumidor, de propor ação no foro do seu domicílio (art. 101, I, do Código de Defesa do Consumidor)[[/PF]].

E, por estarem de acordo, as partes assinam este contrato eletronicamente.

{{cidade_assinatura}}, {{data_extenso}}.$modelo$,
'[{"key":"escopo_mensal","label":"Entregas por mês","type":"textarea","required":true,"hint":"Ex.: 12 posts (artes e carrosséis), 4 Reels editados e legendas, com publicação no Instagram."},{"key":"redes","label":"Redes sociais atendidas","type":"text","required":true,"default":"Instagram"},{"key":"valor_mensal","label":"Mensalidade","type":"money","required":true},{"key":"dia_vencimento","label":"Dia do vencimento da mensalidade","type":"number","required":true,"hint":"Ex.: 10"},{"key":"data_inicio","label":"Início do contrato","type":"date","required":true},{"key":"revisoes_incluidas","label":"Revisões incluídas","type":"text","required":true,"default":"1 (uma) rodada de ajustes por peça"},{"key":"prazo_aprovacao","label":"Prazo para o cliente aprovar o calendário","type":"text","required":true,"default":"2 (dois) dias úteis"},{"key":"nao_incluso","label":"O que NÃO está incluso","type":"textarea","required":true,"default":"verba de impulsionamento ou anúncios; gravação presencial, fotos e vídeos profissionais; atendimento de mensagens e comentários; criação de logotipo ou identidade visual completa; e entrega de arquivos editáveis (abertos)."},{"key":"cliente_advogado","label":"O cliente é advogado ou escritório de advocacia?","type":"boolean","required":false,"hint":"Inclui as regras de publicidade da OAB (Provimento 205/2021)."}]', CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "contract_templates" ("id", "baseTemplateId", "slug", "name", "kind", "category", "description", "version", "active", "content", "fieldsSchema", "updatedAt")
VALUES ('ctpl-trafego-pago-v1', 'ctpl-trafego-pago-v1', 'trafego-pago', 'Contrato de Gestão de Tráfego Pago', 'CONTRATO', 'Tráfego pago', 'Planejamento, criação e acompanhamento de anúncios (Meta), com mensalidade de gestão.', 1, true,
$modelo$CONTRATO DE PRESTAÇÃO DE SERVIÇOS DE GESTÃO DE TRÁFEGO PAGO

Contrato nº {{contrato_numero}}

CONTRATADA: {{contratada_nome}}, empresa individual registrada como Microempreendedor Individual (MEI), inscrita no CNPJ nº {{contratada_cnpj}}, com sede na {{contratada_endereco}}, neste ato representada por seu titular, {{contratada_representante}}, WhatsApp {{contratada_whatsapp}}.

CONTRATANTE: {{cliente_qualificacao}}.

As partes têm entre si justo e acertado este Contrato de Gestão de Tráfego Pago, que se rege pelas cláusulas a seguir.

CLÁUSULA 1ª — DO OBJETO
1.1. A CONTRATADA fará o planejamento, a configuração, o acompanhamento e a otimização de campanhas de anúncios nas plataformas {{plataformas}}, com o objetivo de {{objetivo}}
1.2. O CONTRATANTE receberá relatório {{relatorio}}, com investimento, resultados e próximos passos.
1.3. NÃO estão incluídos: a verba dos anúncios; a produção de fotos e vídeos profissionais; o atendimento dos contatos gerados; site, página de vendas ou gestão de redes sociais, que podem ser contratados à parte.
[[se cliente_advogado]]1.4. Por ser o CONTRATANTE advogado ou sociedade de advogados, os anúncios seguirão o Código de Ética e Disciplina da OAB e o Provimento nº 205/2021, que só admitem impulsionamento de conteúdo informativo, sem promessa de resultado, sem menção a honorários e sem captação de clientela. A aprovação final e a responsabilidade ética perante a OAB são do CONTRATANTE.[[/se]]

CLÁUSULA 2ª — DA VERBA DE ANÚNCIOS
2.1. Verba combinada: {{verba_anuncios}}
2.2. A verba é paga pelo CONTRATANTE diretamente à plataforma, com cartão ou Pix cadastrado na conta de anúncios dele. A CONTRATADA não recebe nem administra esse dinheiro, e o valor não se confunde com a mensalidade de gestão.
2.3. Qualquer aumento de verba só acontece com autorização do CONTRATANTE.

CLÁUSULA 3ª — DOS ACESSOS E DO QUE DEPENDE DO CONTRATANTE
3.1. A conta de anúncios, a página e o perfil são do CONTRATANTE. A CONTRATADA atua com acesso de parceira, que o CONTRATANTE pode retirar ao fim do contrato.
3.2. O CONTRATANTE deve fornecer fotos, vídeos, ofertas e preços, manter um meio de pagamento válido na plataforma e atender rapidamente os contatos que chegarem.
3.3. Atrasos no envio de material, falta de pagamento à plataforma ou falta de atendimento dos contatos afetam os resultados e não geram desconto na mensalidade.

CLÁUSULA 4ª — DO VALOR E DO PAGAMENTO DA GESTÃO
4.1. O CONTRATANTE pagará a mensalidade de gestão de {{valor_mensal}} ({{valor_mensal_extenso}}), com vencimento todo dia {{dia_vencimento}}, por Pix, débito ou crédito. A mensalidade não é parcelada.
4.2. Em caso de atraso, o valor em aberto será acrescido de multa de 2% (dois por cento), juros de mora de 1% (um por cento) ao mês, calculados por dia de atraso, e correção monetária pelo IPCA.

CLÁUSULA 5ª — DO REAJUSTE
5.1. A mensalidade será reajustada a cada 12 (doze) meses, contados de {{data_inicio}}, pela variação acumulada do IPCA no período, ou por outro índice oficial que o substitua.
5.2. A CONTRATADA avisará o novo valor com pelo menos 30 (trinta) dias de antecedência. Se o CONTRATANTE não concordar, pode encerrar o contrato sem multa antes da data do reajuste.

CLÁUSULA 6ª — DA SUSPENSÃO POR FALTA DE PAGAMENTO
6.1. Se a mensalidade ficar em atraso por mais de 10 (dez) dias, a CONTRATADA enviará aviso por escrito ao CONTRATANTE. Persistindo o atraso por mais 5 (cinco) dias úteis após o aviso, a CONTRATADA poderá suspender o acompanhamento das campanhas até a regularização.
6.2. Pago o valor em aberto, com os acréscimos da cláusula de pagamento, o serviço será reativado em até 2 (dois) dias úteis.
6.3. Atraso superior a 60 (sessenta) dias permite à CONTRATADA encerrar o contrato, sem prejuízo da cobrança do que estiver em aberto.

CLÁUSULA 7ª — DA LIMITAÇÃO DE RESPONSABILIDADE
7.1. A CONTRATADA se compromete a usar as boas práticas de gestão de anúncios, mas o tráfego pago NÃO garante vendas, número de contatos ou retorno do investimento, que dependem do mercado, da oferta, do preço, do atendimento do CONTRATANTE e dos algoritmos da plataforma.
7.2. A CONTRATADA não responde por reprovação de anúncios, bloqueio ou restrição de contas, mudança de regras ou falhas das plataformas, mas ajudará a pedir revisão quando possível.
7.3. O CONTRATANTE responde pela veracidade da oferta anunciada e pelo cumprimento das regras de publicidade aplicáveis ao seu ramo.
[[PJ]]7.4. Exceto em caso de dolo, a responsabilidade total da CONTRATADA por danos ligados a este contrato fica limitada ao valor das 3 (três) últimas mensalidades de gestão pagas.[[/PJ]]

CLÁUSULA 8ª — DOS MATERIAIS
8.1. Os anúncios aprovados e pagos podem ser usados pelo CONTRATANTE por prazo indeterminado. O CONTRATANTE garante ter autorização das pessoas que aparecem nas imagens que enviar.

CLÁUSULA 9ª — DA PROTEÇÃO DE DADOS (LGPD)
9.1. As partes tratarão os dados pessoais envolvidos neste contrato de acordo com a Lei nº 13.709/2018 (Lei Geral de Proteção de Dados).
9.2. Os dados do CONTRATANTE (nome, documento, endereço e contatos) são usados pela CONTRATADA apenas para executar este contrato, emitir cobranças e cumprir obrigações legais, e não são vendidos nem repassados a terceiros sem necessidade.
9.3. Quando a CONTRATADA tiver acesso a dados de clientes, alunos, pacientes ou contatos do CONTRATANTE, ela atuará como operadora: tratará esses dados somente conforme as instruções do CONTRATANTE e para a finalidade deste contrato, manterá medidas razoáveis de segurança, não os usará para outros fins e os apagará ou devolverá ao fim do contrato, salvo obrigação legal de guarda. Os contatos gerados pelos anúncios são do CONTRATANTE.
9.4. O CONTRATANTE é responsável por ter base legal (como o consentimento) para os dados que coleta de seus próprios clientes e que entrega à CONTRATADA.
9.5. Qualquer incidente de segurança que envolva esses dados será comunicado à outra parte em até 2 (dois) dias úteis da descoberta.

CLÁUSULA 10 — DA CONFIDENCIALIDADE
10.1. As partes manterão em sigilo as informações não públicas a que tiverem acesso por causa deste contrato, como senhas, dados financeiros, estratégias e listas de clientes, durante o contrato e por 2 (dois) anos após o seu término.
10.2. Não se considera quebra de sigilo a divulgação exigida por lei ou ordem judicial, nem o uso, no portfólio da CONTRATADA, de trabalhos já publicados, salvo pedido do CONTRATANTE em contrário.

CLÁUSULA 11 — DO PRAZO, DA RESCISÃO E DO AVISO PRÉVIO
11.1. Este contrato vale por prazo indeterminado a partir de {{data_inicio}}.
11.2. Qualquer das partes pode encerrá-lo a qualquer momento, sem multa, avisando a outra por escrito com 30 (trinta) dias de antecedência. Durante o aviso, os serviços e a mensalidade continuam normalmente.
11.3. O contrato pode ser rescindido de imediato, sem aviso prévio, em caso de descumprimento grave de cláusula que não seja corrigido em até 5 (cinco) dias úteis após aviso por escrito.
11.4. Encerrado o contrato, a CONTRATADA pausa as campanhas no último dia do período pago, entrega o último relatório e deixa a conta de anúncios com o CONTRATANTE.
[[PF]]11.5. Por se tratar de contratação feita à distância (internet, WhatsApp ou telefone), o CONTRATANTE pode desistir deste contrato em até 7 (sete) dias contados da assinatura, com devolução integral dos valores pagos, conforme o art. 49 do Código de Defesa do Consumidor.[[/PF]]

CLÁUSULA 12 — DAS COMUNICAÇÕES E DA ASSINATURA
12.1. As comunicações entre as partes podem ser feitas por WhatsApp ou e-mail informados neste contrato e valem como aviso por escrito.
12.2. As partes reconhecem a validade da assinatura eletrônica deste contrato, inclusive pela assinatura gratuita do gov.br, nos termos da Lei nº 14.063/2020 e da Medida Provisória nº 2.200-2/2001.
12.3. Este contrato não cria vínculo de emprego, sociedade ou representação entre as partes.
12.4. Alterações deste contrato só valem se feitas por escrito e aceitas pelas duas partes.

CLÁUSULA 13 — DO FORO
13.1. Fica eleito o foro da {{foro}} para resolver qualquer questão deste contrato[[PF]], sem prejuízo do direito do CONTRATANTE, como consumidor, de propor ação no foro do seu domicílio (art. 101, I, do Código de Defesa do Consumidor)[[/PF]].

E, por estarem de acordo, as partes assinam este contrato eletronicamente.

{{cidade_assinatura}}, {{data_extenso}}.$modelo$,
'[{"key":"plataformas","label":"Plataformas de anúncio","type":"text","required":true,"default":"Meta (Facebook e Instagram)"},{"key":"objetivo","label":"Objetivo das campanhas","type":"textarea","required":true,"default":"gerar contatos de potenciais clientes pelo WhatsApp."},{"key":"valor_mensal","label":"Mensalidade","type":"money","required":true},{"key":"dia_vencimento","label":"Dia do vencimento da mensalidade","type":"number","required":true,"hint":"Ex.: 10"},{"key":"verba_anuncios","label":"Verba de anúncios","type":"text","required":true,"hint":"Ex.: R$ 300,00 por mês, paga pelo cliente direto à Meta."},{"key":"data_inicio","label":"Início do contrato","type":"date","required":true},{"key":"relatorio","label":"Frequência do relatório","type":"text","required":true,"default":"semanal, pelo WhatsApp"},{"key":"cliente_advogado","label":"O cliente é advogado ou escritório de advocacia?","type":"boolean","required":false,"hint":"Inclui as regras de publicidade da OAB (Provimento 205/2021)."}]', CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "contract_templates" ("id", "baseTemplateId", "slug", "name", "kind", "category", "description", "version", "active", "content", "fieldsSchema", "updatedAt")
VALUES ('ctpl-parceria-indicacao-v1', 'ctpl-parceria-indicacao-v1', 'parceria-indicacao', 'Contrato de Parceria por Indicação (Comissão)', 'CONTRATO', 'Parcerias', 'Pessoa ou empresa que indica clientes para a Monteiro e recebe comissão. Cadastre o parceiro como cliente.', 1, true,
$modelo$CONTRATO DE PARCERIA POR INDICAÇÃO

Contrato nº {{contrato_numero}}

CONTRATADA: {{contratada_nome}}, empresa individual registrada como Microempreendedor Individual (MEI), inscrita no CNPJ nº {{contratada_cnpj}}, com sede na {{contratada_endereco}}, neste ato representada por seu titular, {{contratada_representante}}, WhatsApp {{contratada_whatsapp}}.

PARCEIRO: {{cliente_qualificacao}}.

As partes têm entre si justo e acertado este Contrato de Parceria por Indicação, que se rege pelas cláusulas a seguir. Neste contrato, a palavra CONTRATANTE se refere ao PARCEIRO.

CLÁUSULA 1ª — DO OBJETO
1.1. O PARCEIRO poderá indicar à CONTRATADA pessoas e empresas interessadas nos serviços dela (assessoria administrativa, sites e sistemas, social media, tráfego pago e outros) e receberá comissão pelas indicações que virarem contratação paga, conforme este contrato.
1.2. A parceria não tem exclusividade para nenhuma das partes.

CLÁUSULA 2ª — DA INDICAÇÃO
2.1. A indicação é feita pelo WhatsApp da CONTRATADA, com nome e contato do indicado, que deve ter concordado em ser contatado.
2.2. A indicação vale por {{validade_indicacao}}. Se o indicado contratar nesse prazo, a comissão é devida. Se o indicado já era cliente ou já estava em negociação com a CONTRATADA, não há comissão.
2.3. O atendimento, os preços, os prazos e o contrato com o indicado são definidos só pela CONTRATADA. O PARCEIRO não pode prometer preços, descontos ou condições, nem receber pagamentos em nome da CONTRATADA.

CLÁUSULA 3ª — DA COMISSÃO
3.1. O PARCEIRO receberá {{percentual_comissao}} sobre {{base_comissao}}
3.2. A comissão é paga {{prazo_pagamento_comissao}}, por Pix, e só incide sobre valores efetivamente recebidos. Se o pagamento do cliente indicado for parcelado, a comissão acompanha cada parcela recebida.
3.3. Se o valor for devolvido ao cliente indicado (por desistência, arrependimento ou cancelamento), a comissão correspondente não é devida e, se já tiver sido paga, será descontada das próximas comissões ou devolvida.
3.4. Cada parte é responsável pelos próprios tributos.
[[se parceiro_advogado]]3.5. Como o PARCEIRO é advogado, esta parceria não envolve indicação de clientes para serviços advocatícios nem divisão de honorários, o que é vedado pelo Estatuto da Advocacia (Lei nº 8.906/1994) e pelo Código de Ética e Disciplina da OAB. A comissão se refere apenas aos serviços não jurídicos prestados pela CONTRATADA.[[/se]]

CLÁUSULA 4ª — DA CONDUTA E DA MARCA
4.1. O PARCEIRO não representa a CONTRATADA, não fala em nome dela e não pode usar a marca, o logotipo ou o nome dela em anúncios sem autorização por escrito.
4.2. O PARCEIRO não pode enviar mensagens em massa, spam ou fazer abordagens enganosas em nome da parceria.

CLÁUSULA 5ª — DA PROTEÇÃO DE DADOS (LGPD)
5.1. As partes tratarão os dados pessoais envolvidos neste contrato de acordo com a Lei nº 13.709/2018 (Lei Geral de Proteção de Dados).
5.2. Os dados do CONTRATANTE (nome, documento, endereço e contatos) são usados pela CONTRATADA apenas para executar este contrato, emitir cobranças e cumprir obrigações legais, e não são vendidos nem repassados a terceiros sem necessidade.
5.3. Quando a CONTRATADA tiver acesso a dados de clientes, alunos, pacientes ou contatos do CONTRATANTE, ela atuará como operadora: tratará esses dados somente conforme as instruções do CONTRATANTE e para a finalidade deste contrato, manterá medidas razoáveis de segurança, não os usará para outros fins e os apagará ou devolverá ao fim do contrato, salvo obrigação legal de guarda.
5.4. O CONTRATANTE é responsável por ter base legal (como o consentimento) para os dados que coleta de seus próprios clientes e que entrega à CONTRATADA.
5.5. Qualquer incidente de segurança que envolva esses dados será comunicado à outra parte em até 2 (dois) dias úteis da descoberta.

CLÁUSULA 6ª — DA CONFIDENCIALIDADE
6.1. As partes manterão em sigilo as informações não públicas a que tiverem acesso por causa deste contrato, como senhas, dados financeiros, estratégias e listas de clientes, durante o contrato e por 2 (dois) anos após o seu término.
6.2. Não se considera quebra de sigilo a divulgação exigida por lei ou ordem judicial, nem o uso, no portfólio da CONTRATADA, de trabalhos já publicados, salvo pedido do CONTRATANTE em contrário.

CLÁUSULA 7ª — DO PRAZO E DA RESCISÃO
7.1. Este contrato começa em {{data_inicio}} e vale por prazo indeterminado.
7.2. Qualquer das partes pode encerrá-lo a qualquer momento, sem multa, com aviso por escrito de 30 (trinta) dias. As comissões de indicações feitas antes do encerramento continuam devidas conforme a Cláusula 3ª.
7.3. Descumprimento das Cláusulas 2.3 ou 4ª permite o encerramento imediato.

CLÁUSULA 8ª — DAS COMUNICAÇÕES E DA ASSINATURA
8.1. As comunicações entre as partes podem ser feitas por WhatsApp ou e-mail informados neste contrato e valem como aviso por escrito.
8.2. As partes reconhecem a validade da assinatura eletrônica deste contrato, inclusive pela assinatura gratuita do gov.br, nos termos da Lei nº 14.063/2020 e da Medida Provisória nº 2.200-2/2001.
8.3. Este contrato não cria vínculo de emprego, sociedade ou representação entre as partes.
8.4. Alterações deste contrato só valem se feitas por escrito e aceitas pelas duas partes.

CLÁUSULA 9ª — DO FORO
9.1. Fica eleito o foro da {{foro}} para resolver qualquer questão deste contrato.

E, por estarem de acordo, as partes assinam este contrato eletronicamente.

{{cidade_assinatura}}, {{data_extenso}}.$modelo$,
'[{"key":"percentual_comissao","label":"Comissão","type":"text","required":true,"hint":"Ex.: 10% (dez por cento)"},{"key":"base_comissao","label":"Sobre o que incide a comissão","type":"textarea","required":true,"hint":"Ex.: o valor da primeira contratação de cada cliente indicado, sem incluir mensalidades."},{"key":"prazo_pagamento_comissao","label":"Quando a comissão é paga","type":"text","required":true,"default":"até 5 (cinco) dias úteis após a Monteiro receber o pagamento do cliente indicado"},{"key":"validade_indicacao","label":"Validade de cada indicação","type":"text","required":true,"default":"90 (noventa) dias"},{"key":"data_inicio","label":"Início do contrato","type":"date","required":true},{"key":"parceiro_advogado","label":"O parceiro é advogado?","type":"boolean","required":false,"hint":"Inclui a regra de não dividir honorários nem indicar clientes para serviços jurídicos."}]', CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "contract_templates" ("id", "baseTemplateId", "slug", "name", "kind", "category", "description", "version", "active", "content", "fieldsSchema", "updatedAt")
VALUES ('ctpl-ebooks-termos-v1', 'ctpl-ebooks-termos-v1', 'ebooks-termos', 'Termos de Uso e Política de Reembolso — E-books (Monteiro Educação)', 'DOCUMENTO', 'Monteiro Educação', 'Texto público para a página de venda na Cakto e para o início dos e-books. Não precisa de cliente: abra o PDF pelo modelo.', 1, true,
$modelo$TERMOS DE USO E POLÍTICA DE REEMBOLSO — MONTEIRO EDUCAÇÃO

Estes termos valem para os e-books e materiais digitais da Monteiro Educação, marca de {{contratada_nome}}, Microempreendedor Individual, CNPJ nº {{contratada_cnpj}}, com sede na {{contratada_endereco}}. Ao comprar, você concorda com eles.

1. O QUE VOCÊ ESTÁ COMPRANDO
1.1. Um material digital (e-book em PDF ou formato semelhante), entregue pela plataforma {{plataforma}} logo após a confirmação do pagamento, no e-mail informado na compra.
1.2. O conteúdo é educativo, preparado para ajudar nos estudos. Ele não garante aprovação em provas, concursos ou vestibulares, que dependem da dedicação de cada pessoa e de fatores externos.
1.3. Informações de editais, datas e regras de provas são conferidas na data de produção do material. Sempre confira o edital oficial atualizado.

2. COMO VOCÊ PODE USAR
2.1. A compra dá a você uma licença pessoal e intransferível para ler, baixar e imprimir o material para seu próprio estudo.
2.2. Não é permitido compartilhar, revender, enviar em grupos, publicar na internet, copiar trechos para vender ou distribuir o material, de graça ou pago. Os direitos autorais são protegidos pela Lei nº 9.610/1998, e o uso indevido pode gerar responsabilização civil e criminal.

3. DIREITO DE ARREPENDIMENTO E REEMBOLSO
3.1. Como a compra é feita pela internet, você pode desistir em até 7 (sete) dias corridos contados da compra e receber de volta todo o valor pago, conforme o art. 49 do Código de Defesa do Consumidor.
3.2. Para pedir, use a área de compras da {{plataforma}} ou fale com o suporte: {{contato_suporte}}. O estorno segue os prazos da plataforma e do meio de pagamento (no cartão de crédito, pode aparecer em até duas faturas).
3.3. Depois de 7 (sete) dias, não há reembolso, exceto se o arquivo estiver com defeito e não for corrigido ou substituído em até 5 (cinco) dias úteis após você avisar o suporte.

4. SEUS DADOS (LGPD)
4.1. Seus dados de compra (nome, e-mail, telefone e pagamento) são tratados pela {{plataforma}} e pela Monteiro Educação apenas para entregar o material, dar suporte, emitir documentos fiscais e cumprir obrigações legais, conforme a Lei nº 13.709/2018.
4.2. Se você autorizar, poderemos enviar novidades e materiais gratuitos. Você pode cancelar quando quiser, e pode pedir acesso, correção ou exclusão dos seus dados pelo suporte.

5. ATUALIZAÇÕES E CONTATO
5.1. Estes termos podem ser atualizados. A versão válida para sua compra é a que estava publicada na data em que você comprou.
5.2. Dúvidas e suporte: {{contato_suporte}}.
5.3. Fica eleito o foro da {{foro}}, sem prejuízo do seu direito, como consumidor, de propor ação no foro do seu domicílio.

{{cidade_assinatura}}, {{data_extenso}}.$modelo$,
'[{"key":"plataforma","label":"Plataforma de venda","type":"text","required":true,"default":"Cakto"},{"key":"contato_suporte","label":"Contato do suporte","type":"text","required":true,"hint":"Ex.: WhatsApp (94) 99236-2433 ou e-mail"}]', CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO NOTHING;

