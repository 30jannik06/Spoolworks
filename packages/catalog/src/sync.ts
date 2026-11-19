import { gunzipSync } from "node:zlib";

import {
  brandKey,
  mapOfdDataset,
  OFD_DATASET_URL,
  planBarcodes,
  planCatalogSync,
  SPOOLMAN_DB_URL,
  spoolWeightLookup,
  type CatalogProduct,
  type OfdDataset,
} from "@spoolworks/core";
import type { PrismaClient } from "@spoolworks/database";

const CREATE_CHUNK = 1000;
const UPDATE_CHUNK = 200;
/** A release with fewer products than this share of the imported ones is treated as broken. */
const MIN_RELEASE_SHARE = 0.8;
const DOWNLOAD_TIMEOUT_MS = 60_000;

/** Thrown before anything is written when a release looks truncated or empty. */
export class CatalogReleaseSuspiciousError extends Error {}

export type SyncReport = {
  version: string;
  products: number;
  invalid: number;
  merged: number;
  /** Empty-spool weights taken from SpoolmanDB; "unavailable" when it could not be loaded. */
  spoolman: number | "unavailable";
  created: number;
  updated: number;
  linked: number;
  unchanged: number;
  conflicts: number;
  /** Barcodes added to imported products (spool and refill codes). */
  barcodesAdded: number;
  dryRun: boolean;
};

/** Downloads the daily OFD release (~3 MB gzipped). */
export async function fetchOfdDataset(url = OFD_DATASET_URL): Promise<OfdDataset> {
  const response = await fetch(url, {
    headers: { "user-agent": "SpoolWorks catalog-sync" },
    signal: AbortSignal.timeout(DOWNLOAD_TIMEOUT_MS),
  });
  if (!response.ok) throw new Error(`OFD download failed: ${response.status} ${response.statusText}`);
  const bytes = Buffer.from(await response.arrayBuffer());
  return JSON.parse(gunzipSync(bytes).toString("utf8")) as OfdDataset;
}

/**
 * Downloads SpoolmanDB's compiled filament list (~6 MB, MIT). Optional: on
 * any failure this returns null and the OFD sync runs without it; known
 * empty-spool weights are never cleared (see planCatalogSync).
 */
export async function fetchSpoolmanDb(url = SPOOLMAN_DB_URL): Promise<unknown[] | null> {
  try {
    const response = await fetch(url, {
      headers: { "user-agent": "SpoolWorks catalog-sync" },
      signal: AbortSignal.timeout(DOWNLOAD_TIMEOUT_MS),
    });
    if (!response.ok) return null;
    const rows: unknown = await response.json();
    return Array.isArray(rows) && rows.length > 0 ? rows : null;
  } catch {
    return null;
  }
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
 * Empty-spool weights OFD lacks come from SpoolmanDB when `spoolman` rows
 * are passed. Nothing is ever deleted. A release that is empty or much smaller than what
 * was imported before stops the run before any write (`allowShrink` turns
 * that check off for test fixtures and hand-picked files).
 */
export async function syncCatalog(
  prisma: PrismaClient,
  data: OfdDataset,
  {
    dryRun = false,
    allowShrink = false,
    spoolman = null,
  }: { dryRun?: boolean; allowShrink?: boolean; spoolman?: unknown[] | null } = {},
): Promise<SyncReport> {
  const mapped = mapOfdDataset(data, spoolman ? { spoolWeight: spoolWeightLookup(spoolman) } : {});
  if (mapped.products.length === 0) throw new CatalogReleaseSuspiciousError("OFD release has no products");

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
  const imported = existing.filter((row) => row.ofdManaged).length;
  if (!allowShrink && mapped.products.length < imported * MIN_RELEASE_SHARE) {
    throw new CatalogReleaseSuspiciousError(
      `OFD release has ${mapped.products.length} products, the catalog holds ${imported} imported ones; refusing to sync`,
    );
  }
  const plan = planCatalogSync(existing, mapped.products);

  const report: SyncReport = {
    version: data.version,
    products: mapped.products.length,
    invalid: mapped.invalid,
    merged: mapped.merged,
    spoolman: spoolman ? mapped.spoolWeightsFilled : "unavailable",
    created: plan.create.length,
    updated: plan.update.length,
    linked: plan.link.length,
    unchanged: plan.unchanged,
    conflicts: plan.conflicts,
    barcodesAdded: 0,
    dryRun,
  };
  if (dryRun) {
    report.barcodesAdded = await addBarcodes(prisma, mapped.products, true);
    return report;
  }

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
  report.barcodesAdded = await addBarcodes(prisma, mapped.products, false);
  return report;
}

/**
 * Adds every OFD barcode of imported products that is not stored yet (after
 * the products exist, so new ones get theirs in the same run). Never deletes,
 * never touches products users typed in.
 */
async function addBarcodes(prisma: PrismaClient, products: CatalogProduct[], dryRun: boolean): Promise<number> {
  const [managed, stored] = await Promise.all([
    prisma.filamentProduct.findMany({ where: { ofdManaged: true, ofdUuid: { not: null } }, select: { id: true, ofdUuid: true } }),
    prisma.productBarcode.findMany({ select: { productId: true, code: true } }),
  ]);
  const idByUuid = new Map(managed.map((row) => [row.ofdUuid as string, row.id]));
  const existing = new Set(stored.map((row) => `${row.productId}\u0000${row.code}`));
  const inserts = planBarcodes(products, idByUuid, existing);
  if (dryRun) return inserts.length;
  let added = 0;
  for (const batch of chunks(inserts, CREATE_CHUNK)) {
    const { count } = await prisma.productBarcode.createMany({ data: batch, skipDuplicates: true });
    added += count;
  }
  return added;
}
