-- CreateTable
CREATE TABLE "ProductBarcode" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "refill" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductBarcode_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProductBarcode_code_idx" ON "ProductBarcode"("code");

-- CreateIndex
CREATE UNIQUE INDEX "ProductBarcode_productId_code_key" ON "ProductBarcode"("productId", "code");

-- AddForeignKey
ALTER TABLE "ProductBarcode" ADD CONSTRAINT "ProductBarcode_productId_fkey" FOREIGN KEY ("productId") REFERENCES "FilamentProduct"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill: every product's current barcode is its first entry. Ids only need
-- to be unique text; the app's cuids are not required to read them.
INSERT INTO "ProductBarcode" ("id", "productId", "code")
SELECT 'bf' || md5("id"), "id", "ean" FROM "FilamentProduct" WHERE "ean" IS NOT NULL
ON CONFLICT DO NOTHING;
