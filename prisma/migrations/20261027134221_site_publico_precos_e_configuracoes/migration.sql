-- CreateEnum
CREATE TYPE "PricingMode" AS ENUM ('FIXO', 'A_PARTIR_DE', 'ORCAMENTO');

-- AlterTable
ALTER TABLE "company_settings" ADD COLUMN     "about" TEXT,
ADD COLUMN     "instagram" TEXT,
ADD COLUMN     "whatsapp" TEXT;

-- AlterTable
ALTER TABLE "services" ADD COLUMN     "pricingMode" "PricingMode" NOT NULL DEFAULT 'FIXO';
