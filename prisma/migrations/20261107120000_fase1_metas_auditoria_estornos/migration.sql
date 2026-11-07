-- Fase 1: só acrescenta tipos, colunas, tabelas e índices. Nenhum dado existente é apagado.

-- AlterEnum
ALTER TYPE "QuoteStatus" ADD VALUE 'CANCELADO';
ALTER TYPE "ProposalStatus" ADD VALUE 'CANCELADA';
ALTER TYPE "CommissionStatus" ADD VALUE 'CANCELADO';

-- CreateEnum
CREATE TYPE "GoalType" AS ENUM ('MENSAL', 'SEMANAL');

-- AlterTable
ALTER TABLE "receivables"
  ADD COLUMN "category" TEXT,
  ADD COLUMN "businessLine" TEXT,
  ADD COLUMN "reversedAt" TIMESTAMP(3),
  ADD COLUMN "reversesPayableId" TEXT;

ALTER TABLE "payables"
  ADD COLUMN "reversedAt" TIMESTAMP(3),
  ADD COLUMN "reversesReceivableId" TEXT;

ALTER TABLE "commissions"
  ADD COLUMN "payableId" TEXT;

ALTER TABLE "mcp_audit_logs"
  ADD COLUMN "entity" TEXT,
  ADD COLUMN "entityId" TEXT,
  ADD COLUMN "oldValue" JSONB,
  ADD COLUMN "newValue" JSONB,
  ADD COLUMN "source" TEXT NOT NULL DEFAULT 'Claude';

-- CreateTable
CREATE TABLE "goals" (
    "id" TEXT NOT NULL,
    "type" "GoalType" NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "amount" DECIMAL(65,30),
    "automatic" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "goals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "yearly_configs" (
    "id" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "minimumWage" DECIMAL(65,30) NOT NULL,
    "meiAnnualLimit" DECIMAL(65,30) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "yearly_configs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "commissions_payableId_key" ON "commissions"("payableId");
CREATE INDEX "mcp_audit_logs_entity_entityId_idx" ON "mcp_audit_logs"("entity", "entityId");
CREATE UNIQUE INDEX "goals_type_periodStart_key" ON "goals"("type", "periodStart");
CREATE UNIQUE INDEX "yearly_configs_year_key" ON "yearly_configs"("year");

-- Valores de 2026, editáveis na tela de Metas.
INSERT INTO "yearly_configs" ("id", "year", "minimumWage", "meiAnnualLimit", "updatedAt")
VALUES ('cfg_2026', 2026, 1621.00, 81000.00, CURRENT_TIMESTAMP);
