-- CreateEnum
CREATE TYPE "PrintStatus" AS ENUM ('PLANNED', 'PRINTED', 'FAILED');

-- CreateEnum
CREATE TYPE "ModelSource" AS ENUM ('MAKERWORLD', 'PRINTABLES', 'THINGIVERSE', 'OTHER');

-- AlterTable
ALTER TABLE "SpoolLedgerEntry" ADD COLUMN     "usageId" TEXT;

-- CreateTable
CREATE TABLE "Print" (
    "id" TEXT NOT NULL,
    "workshopId" TEXT NOT NULL,
    "printerId" TEXT,
    "name" TEXT NOT NULL,
    "status" "PrintStatus" NOT NULL DEFAULT 'PRINTED',
    "printedOn" DATE,
    "durationMin" INTEGER,
    "modelUrl" TEXT,
    "modelSource" "ModelSource",
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Print_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PrintUsage" (
    "id" TEXT NOT NULL,
    "printId" TEXT NOT NULL,
    "spoolId" TEXT NOT NULL,
    "grams" INTEGER NOT NULL,

    CONSTRAINT "PrintUsage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Print_workshopId_printedOn_idx" ON "Print"("workshopId", "printedOn");

-- CreateIndex
CREATE INDEX "PrintUsage_spoolId_idx" ON "PrintUsage"("spoolId");

-- CreateIndex
CREATE UNIQUE INDEX "PrintUsage_printId_spoolId_key" ON "PrintUsage"("printId", "spoolId");

-- CreateIndex
CREATE UNIQUE INDEX "SpoolLedgerEntry_usageId_key" ON "SpoolLedgerEntry"("usageId");

-- AddForeignKey
ALTER TABLE "SpoolLedgerEntry" ADD CONSTRAINT "SpoolLedgerEntry_usageId_fkey" FOREIGN KEY ("usageId") REFERENCES "PrintUsage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Print" ADD CONSTRAINT "Print_workshopId_fkey" FOREIGN KEY ("workshopId") REFERENCES "Workshop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Print" ADD CONSTRAINT "Print_printerId_fkey" FOREIGN KEY ("printerId") REFERENCES "Printer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrintUsage" ADD CONSTRAINT "PrintUsage_printId_fkey" FOREIGN KEY ("printId") REFERENCES "Print"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrintUsage" ADD CONSTRAINT "PrintUsage_spoolId_fkey" FOREIGN KEY ("spoolId") REFERENCES "Spool"("id") ON DELETE CASCADE ON UPDATE CASCADE;
