-- AlterTable
ALTER TABLE "Print" ADD COLUMN     "shareToken" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Print_shareToken_key" ON "Print"("shareToken");
