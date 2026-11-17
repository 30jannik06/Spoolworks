import { gunzipSync } from "node:zlib";

import {
  brandKey,
  mapOfdDataset,
  OFD_DATASET_URL,
  planCatalogSync,
  type CatalogProduct,
  type OfdDataset,
} from "@spoolworks/core";
import type { PrismaClient } from "@spoolworks/database";

const CREATE_CHUNK = 1000;
const UPDATE_CHUNK = 200;

export type SyncReport = {
  version: string;
  products: number;
  invalid: number;
  merged: number;
  created: number;
  updated: number;
  linked: number;
  unchanged: number;
  conflicts: number;
  dryRun: boolean;
};

/** Downloads the daily OFD release (~3 MB gzipped). */
export async function fetchOfdDataset(url = OFD_DATASET_URL): Promise<OfdDataset> {
  const response = await fetch(url, { headers: { "user-agent": "SpoolWorks catalog-sync" } });
  if (!response.ok) throw new Error(`OFD download failed: ${response.status} ${response.statusText}`);
  const bytes = Buffer.from(await response.arrayBuffer());
  return JSON.parse(gunzipSync(bytes).toString("utf8")) as OfdDataset;
}

function chunks<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

function productData(product: CatalogProduct, brandId: string) {
  return {
    brandId,
    ofdUuid: product.ofdUuid,
    ofdManaged: true,
    productLine: product.productLine,
    material: product.material,
    colorName: product.colorName,
    colorHex: product.colorHex,
    diameterUm: product.diameterUm,
    netWeightG: product.netWeightG,
    spoolWeightG: product.spoolWeightG,
    ean: product.ean,
    discontinued: product.discontinued,
  };
}

/**
 * Brings the global product catalog in line with an OFD release. Products
 * users typed in are never overwritten: at most the OFD UUID is attached.
 * Spools reference products by id, so nothing here touches anyone's inventory.
 */
export async function syncCatalog(
  prisma: PrismaClient,
  data: OfdDataset,
  { dryRun = false }: { dryRun?: boolean } = {},
): Promise<SyncReport> {
  const mapped = mapOfdDataset(data);

  const existingRows = await prisma.filamentProduct.findMany({
    select: {
      id: true,
      ofdUuid: true,
      ofdManaged: true,
      productLine: true,
      material: true,
      colorName: true,
      colorHex: true,
      diameterUm: true,
      netWeightG: true,
      spoolWeightG: true,
      ean: true,
      discontinued: true,
      brand: { select: { nameKey: true } },
    },
  });
  const existing = existingRows.map(({ brand, ...row }) => ({ ...row, brandKey: brand.nameKey }));
  const plan = planCatalogSync(existing, mapped.products);

  const report: SyncReport = {
    version: data.version,
    products: mapped.products.length,
    invalid: mapped.invalid,
    merged: mapped.merged,
    created: plan.create.length,
    updated: plan.update.length,
    linked: plan.link.length,
    unchanged: plan.unchanged,
    conflicts: plan.conflicts,
    dryRun,
  };
  if (dryRun) return report;

  // Brands first: products need their ids. Existing brands keep their display name.
  const needed = new Map<string, string>();
  for (const product of [...plan.create, ...plan.update.map((u) => u.product)]) {
    const key = brandKey(product.brandName);
    if (!needed.has(key)) needed.set(key, product.brandName);
  }
  if (needed.size > 0) {
    await prisma.brand.createMany({
      data: [...needed].map(([nameKey, name]) => ({ nameKey, name })),
      skipDuplicates: true,
    });
  }
  const brands = await prisma.brand.findMany({
    where: { nameKey: { in: [...needed.keys()] } },
    select: { id: true, nameKey: true },
  });
  const brandIds = new Map(brands.map((b) => [b.nameKey, b.id]));
  const brandIdFor = (product: CatalogProduct) => {
    const id = brandIds.get(brandKey(product.brandName));
    if (!id) throw new Error(`Brand missing after insert: ${product.brandName}`);
    return id;
  };

  // skipDuplicates: a row someone created meanwhile is skipped, so report what was inserted.
  report.created = 0;
  for (const batch of chunks(plan.create, CREATE_CHUNK)) {
    const { count } = await prisma.filamentProduct.createMany({
      data: batch.map((product) => productData(product, brandIdFor(product))),
      skipDuplicates: true,
    });
    report.created += count;
  }
  for (const batch of chunks(plan.update, UPDATE_CHUNK)) {
    await prisma.$transaction(
      batch.map(({ id, product }) =>
        prisma.filamentProduct.update({ where: { id }, data: productData(product, brandIdFor(product)) }),
      ),
    );
  }
  for (const batch of chunks(plan.link, UPDATE_CHUNK)) {
    await prisma.$transaction(
      batch.map(({ id, ofdUuid }) => prisma.filamentProduct.update({ where: { id }, data: { ofdUuid } })),
    );
  }
  return report;
}
