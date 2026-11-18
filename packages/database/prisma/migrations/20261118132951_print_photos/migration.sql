-- CreateTable
CREATE TABLE "PrintPhoto" (
    "id" TEXT NOT NULL,
    "workshopId" TEXT NOT NULL,
    "printId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "pathname" TEXT NOT NULL,
    "thumbPathname" TEXT NOT NULL,
    "contentType" TEXT NOT NULL,
    "width" INTEGER NOT NULL,
    "height" INTEGER NOT NULL,
    "bytes" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PrintPhoto_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PrintPhoto_pathname_key" ON "PrintPhoto"("pathname");

-- CreateIndex
CREATE UNIQUE INDEX "PrintPhoto_thumbPathname_key" ON "PrintPhoto"("thumbPathname");

-- CreateIndex
CREATE INDEX "PrintPhoto_workshopId_idx" ON "PrintPhoto"("workshopId");

-- CreateIndex
CREATE UNIQUE INDEX "PrintPhoto_printId_position_key" ON "PrintPhoto"("printId", "position");

-- AddForeignKey
ALTER TABLE "PrintPhoto" ADD CONSTRAINT "PrintPhoto_workshopId_fkey" FOREIGN KEY ("workshopId") REFERENCES "Workshop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrintPhoto" ADD CONSTRAINT "PrintPhoto_printId_fkey" FOREIGN KEY ("printId") REFERENCES "Print"("id") ON DELETE CASCADE ON UPDATE CASCADE;
