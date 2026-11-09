-- Só acrescenta: status dos compromissos da agenda (todos os existentes ficam PENDENTE),
-- data/hora da conclusão, resultado e ligação da publicação com o conteúdo de mídia.
-- Nenhum dado existente é apagado.

-- CreateEnum
CREATE TYPE "CalendarEventStatus" AS ENUM ('PENDENTE', 'CONCLUIDO', 'NAO_REALIZADO');

-- AlterTable
ALTER TABLE "calendar_events" ADD COLUMN     "completedAt" TIMESTAMP(3),
ADD COLUMN     "mediaContentId" TEXT,
ADD COLUMN     "result" TEXT,
ADD COLUMN     "status" "CalendarEventStatus" NOT NULL DEFAULT 'PENDENTE';

-- CreateIndex
CREATE INDEX "calendar_events_status_idx" ON "calendar_events"("status");

-- CreateIndex
CREATE INDEX "calendar_events_mediaContentId_idx" ON "calendar_events"("mediaContentId");

-- AddForeignKey
ALTER TABLE "calendar_events" ADD CONSTRAINT "calendar_events_mediaContentId_fkey" FOREIGN KEY ("mediaContentId") REFERENCES "media_contents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Liga as publicações já criadas pelo conector ao conteúdo, pela observação
-- "Conteúdo #N do calendário de mídia." (só quando o número é de um único conteúdo).
UPDATE "calendar_events" e
SET "mediaContentId" = m."id"
FROM "media_contents" m
WHERE e."type" = 'PUBLICACAO'
  AND e."mediaContentId" IS NULL
  AND e."notes" = 'Conteúdo #' || m."number" || ' do calendário de mídia.'
  AND (SELECT COUNT(*) FROM "media_contents" m2 WHERE m2."number" = m."number") = 1;

-- Publicação cujo conteúdo já está PUBLICADO já foi feita: entra como concluída.
UPDATE "calendar_events" e
SET "status" = 'CONCLUIDO',
    "completedAt" = COALESCE(m."publishedAt", m."updatedAt")
FROM "media_contents" m
WHERE e."mediaContentId" = m."id"
  AND m."status" = 'PUBLICADO';
