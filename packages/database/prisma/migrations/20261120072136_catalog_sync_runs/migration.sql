-- CreateEnum
CREATE TYPE "CatalogSyncTrigger" AS ENUM ('CRON', 'MANUAL');

-- CreateTable
CREATE TABLE "CatalogSyncRun" (
    "id" TEXT NOT NULL,
    "trigger" "CatalogSyncTrigger" NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "durationMs" INTEGER NOT NULL,
    "ok" BOOLEAN NOT NULL,
    "report" JSONB,
    "suspicious" BOOLEAN NOT NULL DEFAULT false,
    "error" TEXT,

    CONSTRAINT "CatalogSyncRun_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CatalogSyncRun_startedAt_idx" ON "CatalogSyncRun"("startedAt");
