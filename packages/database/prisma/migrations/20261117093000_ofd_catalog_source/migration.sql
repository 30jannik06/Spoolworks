-- DropIndex
DROP INDEX "FilamentProduct_ean_key";

-- AlterTable
ALTER TABLE "FilamentProduct" ADD COLUMN     "discontinued" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "ofdUuid" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "FilamentProduct_ofdUuid_key" ON "FilamentProduct"("ofdUuid");

-- CreateIndex
CREATE INDEX "FilamentProduct_ean_idx" ON "FilamentProduct"("ean");
