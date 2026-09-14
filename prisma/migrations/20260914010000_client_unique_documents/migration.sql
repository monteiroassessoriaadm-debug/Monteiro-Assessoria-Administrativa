-- DropIndex
DROP INDEX "clients_cnpj_idx";

-- DropIndex
DROP INDEX "clients_cpf_idx";

-- CreateIndex
CREATE UNIQUE INDEX "clients_cpf_key" ON "clients"("cpf");

-- CreateIndex
CREATE UNIQUE INDEX "clients_cnpj_key" ON "clients"("cnpj");

