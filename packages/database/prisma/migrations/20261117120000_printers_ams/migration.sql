-- CreateTable
CREATE TABLE "Printer" (
    "id" TEXT NOT NULL,
    "workshopId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "model" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Printer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AmsUnit" (
    "id" TEXT NOT NULL,
    "printerId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "slotCount" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AmsUnit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AmsSlot" (
    "id" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "spoolId" TEXT,

    CONSTRAINT "AmsSlot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Printer_workshopId_idx" ON "Printer"("workshopId");

-- CreateIndex
CREATE UNIQUE INDEX "AmsUnit_printerId_position_key" ON "AmsUnit"("printerId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "AmsSlot_spoolId_key" ON "AmsSlot"("spoolId");

-- CreateIndex
CREATE UNIQUE INDEX "AmsSlot_unitId_position_key" ON "AmsSlot"("unitId", "position");

-- AddForeignKey
ALTER TABLE "Printer" ADD CONSTRAINT "Printer_workshopId_fkey" FOREIGN KEY ("workshopId") REFERENCES "Workshop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AmsUnit" ADD CONSTRAINT "AmsUnit_printerId_fkey" FOREIGN KEY ("printerId") REFERENCES "Printer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AmsSlot" ADD CONSTRAINT "AmsSlot_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "AmsUnit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AmsSlot" ADD CONSTRAINT "AmsSlot_spoolId_fkey" FOREIGN KEY ("spoolId") REFERENCES "Spool"("id") ON DELETE SET NULL ON UPDATE CASCADE;
