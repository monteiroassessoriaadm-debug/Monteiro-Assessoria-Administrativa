-- Remove a parte antiga "Documentos", já migrada para o Jurídico em
-- 20261110120000_juridico_contratos e conferida pelo dono.
-- Trava: se algum documento ou modelo antigo não tiver cópia na estrutura
-- nova, a migração para aqui e nada é apagado.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM "generated_documents" g
    WHERE NOT EXISTS (SELECT 1 FROM "contracts" c WHERE c."legacyDocumentId" = g."id")
  ) THEN
    RAISE EXCEPTION 'Há documentos antigos sem contrato correspondente. Nada foi removido.';
  END IF;
  IF EXISTS (
    SELECT 1 FROM "document_templates" t
    WHERE NOT EXISTS (SELECT 1 FROM "contract_templates" ct WHERE ct."legacyDocumentTemplateId" = t."id")
  ) THEN
    RAISE EXCEPTION 'Há modelos antigos sem cópia em contract_templates. Nada foi removido.';
  END IF;
END $$;

-- DropForeignKey
ALTER TABLE "document_templates" DROP CONSTRAINT "document_templates_createdById_fkey";

-- DropForeignKey
ALTER TABLE "generated_documents" DROP CONSTRAINT "generated_documents_clientId_fkey";

-- DropForeignKey
ALTER TABLE "generated_documents" DROP CONSTRAINT "generated_documents_createdById_fkey";

-- DropForeignKey
ALTER TABLE "generated_documents" DROP CONSTRAINT "generated_documents_templateId_fkey";

-- DropTable
DROP TABLE "generated_documents";

-- DropTable
DROP TABLE "document_templates";

-- DropEnum
DROP TYPE "DocumentStatus";
