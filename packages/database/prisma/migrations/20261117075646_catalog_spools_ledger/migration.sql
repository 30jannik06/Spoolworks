-- CreateEnum
CREATE TYPE "Material" AS ENUM ('PLA', 'PETG', 'ABS', 'ASA', 'TPU', 'PA', 'PC', 'PET', 'HIPS', 'PVA', 'OTHER');

-- CreateEnum
CREATE TYPE "SpoolStatus" AS ENUM ('ACTIVE', 'EMPTY', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "LedgerKind" AS ENUM ('INITIAL', 'WEIGHING', 'CORRECTION', 'PRINT');

-- CreateTable
CREATE TABLE "Brand" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Brand_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FilamentProduct" (
    "id" TEXT NOT NULL,
    "brandId" TEXT NOT NULL,
    "productLine" TEXT NOT NULL,
    "material" "Material" NOT NULL,
    "colorName" TEXT NOT NULL,
    "colorHex" TEXT NOT NULL,
    "diameterUm" INTEGER NOT NULL DEFAULT 1750,
    "netWeightG" INTEGER NOT NULL,
    "spoolWeightG" INTEGER,
    "ean" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FilamentProduct_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Spool" (
    "id" TEXT NOT NULL,
    "workshopId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "shortCode" TEXT NOT NULL,
    "emptySpoolWeightG" INTEGER NOT NULL,
    "remainingG" INTEGER NOT NULL,
    "purchasePriceCents" INTEGER,
    "purchasedOn" DATE,
    "purchaseUrl" TEXT,
    "location" TEXT,
    "notes" TEXT,
    "status" "SpoolStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Spool_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SpoolLedgerEntry" (
    "seq" SERIAL NOT NULL,
    "spoolId" TEXT NOT NULL,
    "kind" "LedgerKind" NOT NULL,
    "valueG" INTEGER NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SpoolLedgerEntry_pkey" PRIMARY KEY ("seq")
);

-- CreateIndex
CREATE UNIQUE INDEX "Brand_nameKey_key" ON "Brand"("nameKey");

-- CreateIndex
CREATE UNIQUE INDEX "FilamentProduct_ean_key" ON "FilamentProduct"("ean");

-- CreateIndex
CREATE INDEX "FilamentProduct_material_idx" ON "FilamentProduct"("material");

-- CreateIndex
CREATE UNIQUE INDEX "FilamentProduct_brandId_productLine_material_colorName_diam_key" ON "FilamentProduct"("brandId", "productLine", "material", "colorName", "diameterUm", "netWeightG");

-- CreateIndex
CREATE UNIQUE INDEX "Spool_shortCode_key" ON "Spool"("shortCode");

-- CreateIndex
CREATE INDEX "Spool_workshopId_status_idx" ON "Spool"("workshopId", "status");

-- CreateIndex
CREATE INDEX "Spool_productId_idx" ON "Spool"("productId");

-- CreateIndex
CREATE INDEX "SpoolLedgerEntry_spoolId_seq_idx" ON "SpoolLedgerEntry"("spoolId", "seq");

-- AddForeignKey
ALTER TABLE "FilamentProduct" ADD CONSTRAINT "FilamentProduct_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FilamentProduct" ADD CONSTRAINT "FilamentProduct_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Spool" ADD CONSTRAINT "Spool_workshopId_fkey" FOREIGN KEY ("workshopId") REFERENCES "Workshop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Spool" ADD CONSTRAINT "Spool_productId_fkey" FOREIGN KEY ("productId") REFERENCES "FilamentProduct"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SpoolLedgerEntry" ADD CONSTRAINT "SpoolLedgerEntry_spoolId_fkey" FOREIGN KEY ("spoolId") REFERENCES "Spool"("id") ON DELETE CASCADE ON UPDATE CASCADE;
