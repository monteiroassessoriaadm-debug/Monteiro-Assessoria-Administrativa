-- CreateEnum
CREATE TYPE "PfAccountType" AS ENUM ('BANCO', 'CONTA_DIGITAL', 'DINHEIRO', 'INVESTIMENTO');

-- CreateEnum
CREATE TYPE "PfMovementType" AS ENUM ('ENTRADA', 'SAIDA');

-- CreateEnum
CREATE TYPE "PfBillStatus" AS ENUM ('PENDENTE', 'PAGO');

-- CreateEnum
CREATE TYPE "PfDebtType" AS ENUM ('CARTAO', 'EMPRESTIMO_PESSOAL', 'CONSIGNADO', 'FINANCIAMENTO', 'CHEQUE_ESPECIAL', 'FAMILIA', 'OUTRO');

-- CreateEnum
CREATE TYPE "PfDebtStatus" AS ENUM ('EM_DIA', 'ATRASADA', 'NEGOCIANDO', 'QUITADA');

-- CreateEnum
CREATE TYPE "PfLiquidity" AS ENUM ('DIARIA', 'NO_VENCIMENTO');


-- CreateTable
CREATE TABLE "pf_accounts" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "PfAccountType" NOT NULL DEFAULT 'BANCO',
    "openingBalance" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pf_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pf_categories" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "PfMovementType" NOT NULL,
    "essential" BOOLEAN NOT NULL DEFAULT false,
    "saving" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pf_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pf_cards" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "limit" DECIMAL(65,30) NOT NULL,
    "closingDay" INTEGER NOT NULL,
    "dueDay" INTEGER NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pf_cards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pf_transactions" (
    "id" TEXT NOT NULL,
    "type" "PfMovementType" NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "description" TEXT NOT NULL,
    "notes" TEXT,
    "categoryId" TEXT NOT NULL,
    "accountId" TEXT,
    "cardId" TEXT,
    "invoiceMonth" TEXT,
    "installmentGroupId" TEXT,
    "installmentNumber" INTEGER,
    "installmentTotal" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pf_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pf_attachments" (
    "id" TEXT NOT NULL,
    "transactionId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "data" BYTEA NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pf_attachments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pf_card_payments" (
    "id" TEXT NOT NULL,
    "cardId" TEXT NOT NULL,
    "invoiceMonth" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pf_card_payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pf_recurring_bills" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "dueDay" INTEGER NOT NULL,
    "categoryId" TEXT NOT NULL,
    "accountId" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "startMonth" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pf_recurring_bills_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pf_bill_occurrences" (
    "id" TEXT NOT NULL,
    "billId" TEXT NOT NULL,
    "month" TEXT NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "status" "PfBillStatus" NOT NULL DEFAULT 'PENDENTE',
    "paidAt" TIMESTAMP(3),
    "transactionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pf_bill_occurrences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pf_debts" (
    "id" TEXT NOT NULL,
    "creditor" TEXT NOT NULL,
    "type" "PfDebtType" NOT NULL,
    "balance" DECIMAL(65,30) NOT NULL,
    "monthlyRate" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "installment" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "remainingInstallments" INTEGER,
    "dueDay" INTEGER,
    "status" "PfDebtStatus" NOT NULL DEFAULT 'EM_DIA',
    "daysLate" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pf_debts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pf_debt_negotiations" (
    "id" TEXT NOT NULL,
    "debtId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "proposal" TEXT NOT NULL,
    "result" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pf_debt_negotiations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pf_budgets" (
    "id" TEXT NOT NULL,
    "month" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "limit" DECIMAL(65,30) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pf_budgets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pf_goals" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "target" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "current" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "deadline" TIMESTAMP(3),
    "emergency" BOOLEAN NOT NULL DEFAULT false,
    "done" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pf_goals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pf_investments" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "institution" TEXT,
    "applied" DECIMAL(65,30) NOT NULL,
    "current" DECIMAL(65,30) NOT NULL,
    "liquidity" "PfLiquidity" NOT NULL DEFAULT 'DIARIA',
    "appliedAt" TIMESTAMP(3) NOT NULL,
    "maturityDate" TIMESTAMP(3),
    "redeemed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pf_investments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pf_monthly_snapshots" (
    "id" TEXT NOT NULL,
    "month" TEXT NOT NULL,
    "accountsTotal" DECIMAL(65,30) NOT NULL,
    "investedTotal" DECIMAL(65,30) NOT NULL,
    "debtTotal" DECIMAL(65,30) NOT NULL,
    "netWorth" DECIMAL(65,30) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pf_monthly_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "pf_categories_type_name_key" ON "pf_categories"("type", "name");

-- CreateIndex
CREATE INDEX "pf_transactions_date_idx" ON "pf_transactions"("date");

-- CreateIndex
CREATE INDEX "pf_transactions_cardId_invoiceMonth_idx" ON "pf_transactions"("cardId", "invoiceMonth");

-- CreateIndex
CREATE INDEX "pf_transactions_installmentGroupId_idx" ON "pf_transactions"("installmentGroupId");

-- CreateIndex
CREATE UNIQUE INDEX "pf_attachments_transactionId_key" ON "pf_attachments"("transactionId");

-- CreateIndex
CREATE INDEX "pf_card_payments_cardId_invoiceMonth_idx" ON "pf_card_payments"("cardId", "invoiceMonth");

-- CreateIndex
CREATE UNIQUE INDEX "pf_bill_occurrences_transactionId_key" ON "pf_bill_occurrences"("transactionId");

-- CreateIndex
CREATE INDEX "pf_bill_occurrences_dueDate_idx" ON "pf_bill_occurrences"("dueDate");

-- CreateIndex
CREATE UNIQUE INDEX "pf_bill_occurrences_billId_month_key" ON "pf_bill_occurrences"("billId", "month");

-- CreateIndex
CREATE INDEX "pf_debt_negotiations_debtId_date_idx" ON "pf_debt_negotiations"("debtId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "pf_budgets_month_categoryId_key" ON "pf_budgets"("month", "categoryId");

-- CreateIndex
CREATE UNIQUE INDEX "pf_monthly_snapshots_month_key" ON "pf_monthly_snapshots"("month");

-- AddForeignKey
ALTER TABLE "pf_transactions" ADD CONSTRAINT "pf_transactions_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "pf_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pf_transactions" ADD CONSTRAINT "pf_transactions_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "pf_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pf_transactions" ADD CONSTRAINT "pf_transactions_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "pf_cards"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pf_attachments" ADD CONSTRAINT "pf_attachments_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "pf_transactions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pf_card_payments" ADD CONSTRAINT "pf_card_payments_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "pf_cards"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pf_card_payments" ADD CONSTRAINT "pf_card_payments_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "pf_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pf_recurring_bills" ADD CONSTRAINT "pf_recurring_bills_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "pf_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pf_recurring_bills" ADD CONSTRAINT "pf_recurring_bills_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "pf_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pf_bill_occurrences" ADD CONSTRAINT "pf_bill_occurrences_billId_fkey" FOREIGN KEY ("billId") REFERENCES "pf_recurring_bills"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pf_bill_occurrences" ADD CONSTRAINT "pf_bill_occurrences_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "pf_transactions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pf_debt_negotiations" ADD CONSTRAINT "pf_debt_negotiations_debtId_fkey" FOREIGN KEY ("debtId") REFERENCES "pf_debts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pf_budgets" ADD CONSTRAINT "pf_budgets_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "pf_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- Categorias padrão (editáveis depois na tela)
INSERT INTO "pf_categories" ("id", "name", "type", "essential", "saving", "sortOrder") VALUES
  ('pfcat_salario_prefeitura', 'Salário Prefeitura', 'ENTRADA', false, false, 1),
  ('pfcat_retirada_monteiro', 'Retirada Monteiro', 'ENTRADA', false, false, 2),
  ('pfcat_extra', 'Extra', 'ENTRADA', false, false, 3),
  ('pfcat_moradia', 'Moradia', 'SAIDA', true, false, 1),
  ('pfcat_alimentacao', 'Alimentação', 'SAIDA', true, false, 2),
  ('pfcat_transporte', 'Transporte/Combustível', 'SAIDA', true, false, 3),
  ('pfcat_saude', 'Saúde', 'SAIDA', true, false, 4),
  ('pfcat_educacao', 'Educação', 'SAIDA', true, false, 5),
  ('pfcat_lazer', 'Lazer', 'SAIDA', false, false, 6),
  ('pfcat_assinaturas', 'Assinaturas', 'SAIDA', false, false, 7),
  ('pfcat_familia', 'Família', 'SAIDA', false, false, 8),
  ('pfcat_vestuario', 'Vestuário', 'SAIDA', false, false, 9),
  ('pfcat_dividas', 'Dívidas', 'SAIDA', true, false, 10),
  ('pfcat_outros', 'Outros', 'SAIDA', false, false, 11),
  ('pfcat_reserva', 'Reserva e Investimentos', 'SAIDA', false, true, 12);

-- Meta fixa
INSERT INTO "pf_goals" ("id", "name", "target", "current", "emergency", "updatedAt") VALUES
  ('pfgoal_reserva_emergencia', 'Reserva de Emergência', 0, 0, true, CURRENT_TIMESTAMP);
