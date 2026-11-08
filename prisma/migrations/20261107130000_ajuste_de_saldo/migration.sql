-- Só acrescenta: ajuste de saldo e conta na comissão. Nenhum dado existente é apagado.

-- AlterTable
ALTER TABLE "commissions" ADD COLUMN "accountId" TEXT;

-- CreateTable
CREATE TABLE "balance_adjustments" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "newBalance" DECIMAL(65,30) NOT NULL,
    "reason" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "balance_adjustments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "balance_adjustments_accountId_createdAt_idx" ON "balance_adjustments"("accountId", "createdAt");

-- AddForeignKey
ALTER TABLE "commissions" ADD CONSTRAINT "commissions_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "financial_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "balance_adjustments" ADD CONSTRAINT "balance_adjustments_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "financial_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "balance_adjustments" ADD CONSTRAINT "balance_adjustments_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
