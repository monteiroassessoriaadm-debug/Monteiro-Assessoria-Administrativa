-- AlterTable
ALTER TABLE "financial_accounts" ADD COLUMN     "openingBalance" DECIMAL(65,30),
ADD COLUMN     "openingBalanceAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "oauth_clients" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "redirectUris" TEXT[],
    "clientName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "oauth_clients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "oauth_authorization_codes" (
    "id" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "redirectUri" TEXT NOT NULL,
    "codeChallenge" TEXT NOT NULL,
    "codeChallengeMethod" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "oauth_authorization_codes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "oauth_tokens" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accessTokenHash" TEXT,
    "refreshTokenHash" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "oauth_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mcp_audit_logs" (
    "id" TEXT NOT NULL,
    "tool" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mcp_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "oauth_clients_clientId_key" ON "oauth_clients"("clientId");

-- CreateIndex
CREATE UNIQUE INDEX "oauth_authorization_codes_codeHash_key" ON "oauth_authorization_codes"("codeHash");

-- CreateIndex
CREATE INDEX "oauth_authorization_codes_expiresAt_idx" ON "oauth_authorization_codes"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "oauth_tokens_accessTokenHash_key" ON "oauth_tokens"("accessTokenHash");

-- CreateIndex
CREATE UNIQUE INDEX "oauth_tokens_refreshTokenHash_key" ON "oauth_tokens"("refreshTokenHash");

-- CreateIndex
CREATE INDEX "oauth_tokens_userId_idx" ON "oauth_tokens"("userId");

-- CreateIndex
CREATE INDEX "mcp_audit_logs_createdAt_idx" ON "mcp_audit_logs"("createdAt");

-- AddForeignKey
ALTER TABLE "oauth_authorization_codes" ADD CONSTRAINT "oauth_authorization_codes_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "oauth_clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "oauth_authorization_codes" ADD CONSTRAINT "oauth_authorization_codes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "oauth_tokens" ADD CONSTRAINT "oauth_tokens_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "oauth_clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "oauth_tokens" ADD CONSTRAINT "oauth_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mcp_audit_logs" ADD CONSTRAINT "mcp_audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Dados: o lançamento "SERVIÇOS DIVERSOS – R$ 759,00 – 04/11/2026 – NUBANK – Recebido"
-- em Contas a receber não é venda: é o saldo inicial da conta Nubank PJ no recomeço
-- da empresa. Este bloco move esse valor para o saldo inicial da conta e remove o
-- lançamento de "contas a receber"/faturamento. É seguro rodar mais de uma vez
-- (idempotente): só age se encontrar exatamente o lançamento esperado.
DO $$
DECLARE
  v_account_id TEXT;
  v_receivable RECORD;
BEGIN
  -- Localiza (ou cria) a conta Nubank PJ.
  SELECT "id" INTO v_account_id
  FROM "financial_accounts"
  WHERE "name" ILIKE '%nubank%'
  ORDER BY "createdAt" ASC
  LIMIT 1;

  IF v_account_id IS NULL THEN
    INSERT INTO "financial_accounts" ("id", "name", "type", "active", "openingBalance", "openingBalanceAt", "createdAt", "updatedAt")
    VALUES (gen_random_uuid()::text, 'Nubank PJ', 'Conta PJ', true, 759.00, '2026-11-04T00:00:00Z', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    RETURNING "id" INTO v_account_id;
  ELSE
    UPDATE "financial_accounts"
    SET "openingBalance" = 759.00,
        "openingBalanceAt" = '2026-11-04T00:00:00Z',
        "updatedAt" = CURRENT_TIMESTAMP
    WHERE "id" = v_account_id
      AND "openingBalance" IS NULL;
  END IF;

  -- Localiza o lançamento exato em contas a receber (critério específico o
  -- bastante para não pegar nada além desse lançamento original).
  SELECT * INTO v_receivable
  FROM "receivables"
  WHERE "description" ILIKE '%SERVIÇOS DIVERSOS%'
    AND "amount" = 759.00
    AND "status" = 'RECEBIDO'
    AND "receivedAt"::date = '2026-11-04'
  LIMIT 1;

  IF v_receivable."id" IS NOT NULL THEN
    DELETE FROM "receivables" WHERE "id" = v_receivable."id";
  END IF;
END $$;
