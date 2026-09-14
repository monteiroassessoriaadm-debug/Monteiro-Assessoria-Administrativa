-- CreateTable
CREATE TABLE "media_contents" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "number" INTEGER NOT NULL,
    "clientId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "type" TEXT,
    "platform" TEXT,
    "scheduledDate" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'IDEIA',
    "responsibleId" TEXT,
    "approvalNotes" TEXT,
    "approvedById" TEXT,
    "approvedAt" DATETIME,
    "publishedAt" DATETIME,
    "link" TEXT,
    "notes" TEXT,
    "createdById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "media_contents_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "media_contents_responsibleId_fkey" FOREIGN KEY ("responsibleId") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "media_contents_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "media_contents_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "media_contents_status_idx" ON "media_contents"("status");

-- CreateIndex
CREATE INDEX "media_contents_scheduledDate_idx" ON "media_contents"("scheduledDate");

