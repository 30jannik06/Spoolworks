import { brandKey, normalizeHexColor } from "./parse";
import type { Material } from "./spool-input";
import type { SpoolWeightQuery } from "./spoolman";

/**
 * Open Filament Database (MIT, https://github.com/OpenFilamentCollective/open-filament-database).
 * The daily release `json/all.json.gz` holds flat, normalised tables. Only the
 * fields we read are typed here; everything else is ignored.
 */
export const OFD_DATASET_URL = "https://api.openfilamentdatabase.org/json/all.json.gz";

export type OfdDataset = {
  version: string;
  brands: { id: string; name: string }[];
  filaments: { id: string; name: string; brand_id: string; material: string; discontinued?: boolean }[];
  variants: { id: string; name: string; color_hex: string; filament_id: string; discontinued?: boolean }[];
  sizes: {
    id: string;
    /** Stable across renames; `moved_from` lists the UUIDs it replaced. */
    uuid: string;
    moved_from?: string[];
    variant_id: string;
    filament_weight: number;
    diameter: number;
    empty_spool_weight?: number | null;
    gtin?: string | null;
    barcode_identifier?: string | null;
    spool_refill?: boolean | null;
    container_material?: string | null;
    discontinued?: boolean;
  }[];
};

/** A catalog product as SpoolWorks stores it, derived from one OFD size. */
export type CatalogProduct = {
  ofdUuid: string;
  /** Earlier UUIDs of this product (OFD renames, merged refill rows). */
  movedFrom: string[];
  brandName: string;
  productLine: string;
  material: Material;
  colorName: string;
  colorHex: string;
  diameterUm: number;
  netWeightG: number;
  spoolWeightG: number | null;
  ean: string | null;
  /** Every barcode of the merged OFD rows (spool and refill), one entry per code. */
  barcodes: ProductBarcode[];
  discontinued: boolean;
};

export type ProductBarcode = { code: string; refill: boolean };

export type MapResult = {
  products: CatalogProduct[];
  invalid: number;
  merged: number;
  /** Products whose empty-spool weight came from the `spoolWeight` lookup, not from OFD. */
  spoolWeightsFilled: number;
};

const DIRECT: ReadonlySet<string> = new Set(["PLA", "PETG", "ABS", "ASA", "TPU", "PC", "PET", "HIPS", "PVA"]);
const NYLON: ReadonlySet<string> = new Set(["PA", "PA6", "PA11", "PA12", "PA66", "PPA"]);

/** OFD knows ~40 materials; SpoolWorks groups them. Nylons become PA, the rest of the long tail OTHER. */
export function mapOfdMaterial(material: string): Material {
  const upper = material.trim().toUpperCase();
  if (DIRECT.has(upper)) return upper as Material;
  if (NYLON.has(upper)) return "PA";
  return "OTHER";
}

/** Digits only; a 14-digit GTIN with a leading zero is the same code as its 13-digit EAN. */
export function normalizeBarcode(raw: string | null | undefined): string | null {
  if (!raw) return null;
  let digits = raw.replace(/\D/g, "");
  if (digits.length === 14 && digits.startsWith("0")) digits = digits.slice(1);
  return [8, 12, 13, 14].includes(digits.length) ? digits : null;
}

/**
 * The stored codes a scanned or typed barcode can match. A UPC-A (12 digits)
 * is the same number as the EAN-13 with a leading 0, and scanners and OFD
 * disagree on which form they report, so both are tried. Empty when the input
 * is no barcode at all.
 */
export function barcodeCandidates(raw: string | null | undefined): string[] {
  const code = normalizeBarcode(raw);
  if (!code) return [];
  if (code.length === 12) return [code, `0${code}`];
  if (code.length === 13 && code.startsWith("0")) return [code, code.slice(1)];
  return [code];
}

/** "Polymaker PolyTerra PLA" under brand "Polymaker" → "PolyTerra PLA". */
export function stripBrandPrefix(brandName: string, productLine: string): string {
  const prefix = `${brandName.trim()} `;
  if (productLine.toLowerCase().startsWith(prefix.toLowerCase())) {
    const rest = productLine.slice(prefix.length).trim();
    if (rest) return rest;
  }
  return productLine.trim();
}

/** Identity of a product in SpoolWorks; mirrors the unique key on FilamentProduct. */
export function catalogKey(p: {
  brandName?: string;
  brandKey?: string;
  productLine: string;
  material: Material;
  colorName: string;
  diameterUm: number;
  netWeightG: number;
}): string {
  const brand = p.brandKey ?? brandKey(p.brandName ?? "");
  return [brand, p.productLine, p.material, p.colorName, p.diameterUm, p.netWeightG].join("\u0000");
}

type Candidate = CatalogProduct & { refill: boolean; rawMaterial: string };

function rank(c: Candidate): number[] {
  // Lower sorts first: real spools, barcode known, still sold, empty weight known.
  return [c.refill ? 1 : 0, c.ean ? 0 : 1, c.discontinued ? 1 : 0, c.spoolWeightG === null ? 1 : 0];
}

function compare(a: Candidate, b: Candidate): number {
  const ra = rank(a);
  const rb = rank(b);
  for (let i = 0; i < ra.length; i++) {
    const diff = (ra[i] ?? 0) - (rb[i] ?? 0);
    if (diff !== 0) return diff;
  }
  return a.ofdUuid < b.ofdUuid ? -1 : a.ofdUuid > b.ofdUuid ? 1 : 0;
}

/** All codes of a merged group; a code on both a spool and a refill row counts as the spool's. */
function mergeBarcodes(group: Candidate[]): ProductBarcode[] {
  const byCode = new Map<string, ProductBarcode>();
  for (const barcode of group.flatMap((c) => c.barcodes)) {
    const seen = byCode.get(barcode.code);
    if (!seen || (seen.refill && !barcode.refill)) byCode.set(barcode.code, barcode);
  }
  return [...byCode.values()].sort((a, b) => Number(a.refill) - Number(b.refill) || a.code.localeCompare(b.code));
}

/**
 * Turns the OFD tables into SpoolWorks products: one per size (colour × weight × diameter).
 * A refill and the same filament on a spool are one product here, because the
 * empty-spool weight is recorded per owned spool anyway. Rows that collapse onto
 * one product keep a deterministic winner; the others' UUIDs go to `movedFrom`.
 */
export function mapOfdDataset(
  data: OfdDataset,
  { spoolWeight }: { spoolWeight?: (query: SpoolWeightQuery) => number | null } = {},
): MapResult {
  const brands = new Map(data.brands.map((b) => [b.id, b]));
  const filaments = new Map(data.filaments.map((f) => [f.id, f]));
  const variants = new Map(data.variants.map((v) => [v.id, v]));

  const groups = new Map<string, Candidate[]>();
  let invalid = 0;

  for (const size of data.sizes) {
    const variant = variants.get(size.variant_id);
    const filament = variant && filaments.get(variant.filament_id);
    const brand = filament && brands.get(filament.brand_id);
    const colorHex = variant && normalizeHexColor(variant.color_hex);
    const diameterUm = Math.round(size.diameter * 1000);
    const netWeightG = Math.round(size.filament_weight);
    if (
      !variant ||
      !filament ||
      !brand ||
      !colorHex ||
      !Number.isFinite(diameterUm) ||
      diameterUm < 1000 ||
      diameterUm > 3500 ||
      !Number.isFinite(netWeightG) ||
      netWeightG < 1 ||
      netWeightG > 10_000
    ) {
      invalid++;
      continue;
    }

    const brandName = brand.name.trim();
    const productLine = stripBrandPrefix(brandName, filament.name);
    const colorName = variant.name.trim();
    if (!brandName || brandName.length > 60 || !productLine || productLine.length > 80 || !colorName || colorName.length > 60) {
      invalid++;
      continue;
    }

    const empty = size.empty_spool_weight;
    const candidate: Candidate = {
      ofdUuid: size.uuid,
      movedFrom: size.moved_from ?? [],
      brandName,
      productLine,
      material: mapOfdMaterial(filament.material),
      colorName,
      colorHex,
      diameterUm,
      netWeightG,
      spoolWeightG: typeof empty === "number" && empty > 0 && empty <= 2000 ? Math.round(empty) : null,
      ean: normalizeBarcode(size.gtin ?? size.barcode_identifier),
      barcodes: [],
      discontinued: Boolean(size.discontinued || variant.discontinued || filament.discontinued),
      refill: size.spool_refill === true || size.container_material?.toLowerCase() === "refill",
      rawMaterial: filament.material,
    };
    for (const raw of [size.gtin, size.barcode_identifier]) {
      const code = normalizeBarcode(raw);
      if (code && !candidate.barcodes.some((b) => b.code === code)) candidate.barcodes.push({ code, refill: candidate.refill });
    }

    const key = catalogKey(candidate);
    const group = groups.get(key);
    if (group) group.push(candidate);
    else groups.set(key, [candidate]);
  }

  let merged = 0;
  let spoolWeightsFilled = 0;
  const products: CatalogProduct[] = [];
  for (const group of groups.values()) {
    group.sort(compare);
    const [winner, ...rest] = group as [Candidate, ...Candidate[]];
    merged += rest.length;
    const { refill: _refill, rawMaterial, ...product } = winner;
    // OFD's own weight wins; the lookup only fills a gap.
    let spoolWeightG =
      winner.spoolWeightG ?? group.find((c) => !c.refill && c.spoolWeightG !== null)?.spoolWeightG ?? null;
    if (spoolWeightG === null && spoolWeight) {
      spoolWeightG = spoolWeight({ brandName: product.brandName, material: rawMaterial, netWeightG: product.netWeightG, diameterUm: product.diameterUm });
      if (spoolWeightG !== null) spoolWeightsFilled++;
    }
    products.push({
      ...product,
      movedFrom: [...new Set([...group.flatMap((c) => c.movedFrom), ...rest.map((c) => c.ofdUuid)])].filter(
        (uuid) => uuid !== winner.ofdUuid,
      ),
      spoolWeightG,
      ean: winner.ean ?? group.find((c) => c.ean)?.ean ?? null,
      barcodes: mergeBarcodes(group),
      discontinued: group.every((c) => c.discontinued),
    });
  }
  return { products, invalid, merged, spoolWeightsFilled };
}

/** What the database holds today, reduced to what the sync compares. */
export type ExistingProduct = {
  id: string;
  ofdUuid: string | null;
  /** Created by the import; only these rows follow upstream changes. */
  ofdManaged: boolean;
  brandKey: string;
  productLine: string;
  material: Material;
  colorName: string;
  colorHex: string;
  diameterUm: number;
  netWeightG: number;
  spoolWeightG: number | null;
  ean: string | null;
  discontinued: boolean;
};

export type SyncPlan = {
  create: CatalogProduct[];
  /** OFD-sourced rows whose data changed upstream. */
  update: { id: string; product: CatalogProduct }[];
  /** User-typed rows that turn out to be an OFD product: only the UUID is attached, nothing is overwritten. */
  link: { id: string; ofdUuid: string }[];
  unchanged: number;
  /** Would collide with another row's identity; left alone and reported. */
  conflicts: number;
};

function differs(row: ExistingProduct, p: CatalogProduct): boolean {
  return (
    row.ofdUuid !== p.ofdUuid ||
    row.brandKey !== brandKey(p.brandName) ||
    row.productLine !== p.productLine ||
    row.material !== p.material ||
    row.colorName !== p.colorName ||
    row.colorHex !== p.colorHex ||
    row.diameterUm !== p.diameterUm ||
    row.netWeightG !== p.netWeightG ||
    row.spoolWeightG !== p.spoolWeightG ||
    row.ean !== p.ean ||
    row.discontinued !== p.discontinued
  );
}

/**
 * Decides per incoming product: create, update (OFD row changed), link (a
 * user-typed row with the same identity) or leave alone. Pure, so a second run
 * over the same data yields an empty plan.
 */
export function planCatalogSync(existing: ExistingProduct[], incoming: CatalogProduct[]): SyncPlan {
  const byUuid = new Map<string, ExistingProduct>();
  const byKey = new Map<string, ExistingProduct>();
  for (const row of existing) {
    if (row.ofdUuid) byUuid.set(row.ofdUuid, row);
    byKey.set(catalogKey(row), row);
  }

  const plan: SyncPlan = { create: [], update: [], link: [], unchanged: 0, conflicts: 0 };
  const claimed = new Set<string>();

  for (let product of incoming) {
    const key = catalogKey(product);
    const match =
      byUuid.get(product.ofdUuid) ??
      product.movedFrom.map((uuid) => byUuid.get(uuid)).find((row) => row !== undefined);

    if (match) {
      if (claimed.has(match.id)) {
        plan.conflicts++;
        continue;
      }
      claimed.add(match.id);
      if (!match.ofdManaged) {
        // A linked user row keeps its data; only follow an OFD rename of the UUID.
        if (match.ofdUuid === product.ofdUuid) plan.unchanged++;
        else plan.link.push({ id: match.id, ofdUuid: product.ofdUuid });
        continue;
      }
      // A known empty-spool weight is never cleared: a missing value upstream (or
      // an unreachable SpoolmanDB) keeps what the row already has.
      if (product.spoolWeightG === null && match.spoolWeightG !== null) {
        product = { ...product, spoolWeightG: match.spoolWeightG };
      }
      if (!differs(match, product)) {
        plan.unchanged++;
        continue;
      }
      const holder = byKey.get(key);
      if (holder && holder.id !== match.id) {
        plan.conflicts++;
        continue;
      }
      byKey.delete(catalogKey(match));
      byKey.set(key, match);
      plan.update.push({ id: match.id, product });
      continue;
    }

    const holder = byKey.get(key);
    if (holder) {
      if (holder.ofdUuid === null && !claimed.has(holder.id)) {
        claimed.add(holder.id);
        plan.link.push({ id: holder.id, ofdUuid: product.ofdUuid });
      } else {
        plan.conflicts++;
      }
      continue;
    }

    plan.create.push(product);
    // Reserve the identity so a later incoming row cannot create it twice.
    byKey.set(key, {
      id: `new:${product.ofdUuid}`,
      ofdUuid: product.ofdUuid,
      ofdManaged: true,
      brandKey: brandKey(product.brandName),
      productLine: product.productLine,
      material: product.material,
      colorName: product.colorName,
      colorHex: product.colorHex,
      diameterUm: product.diameterUm,
      netWeightG: product.netWeightG,
      spoolWeightG: product.spoolWeightG,
      ean: product.ean,
      discontinued: product.discontinued,
    });
  }
  return plan;
}

export type BarcodeInsert = { productId: string; code: string; refill: boolean };

/**
 * Which barcodes to add for products the import manages. Only adds: a code
 * that disappears upstream stays, like every other fact the catalog once had.
 * `productIdByUuid` holds only `ofdManaged` rows, so user products get none.
 * `existing` holds "productId\u0000code" keys.
 */
export function planBarcodes(
  products: Pick<CatalogProduct, "ofdUuid" | "barcodes">[],
  productIdByUuid: ReadonlyMap<string, string>,
  existing: ReadonlySet<string>,
): BarcodeInsert[] {
  const out: BarcodeInsert[] = [];
  const planned = new Set(existing);
  for (const product of products) {
    const productId = productIdByUuid.get(product.ofdUuid);
    if (!productId) continue;
    for (const { code, refill } of product.barcodes) {
      const key = `${productId}\u0000${code}`;
      if (planned.has(key)) continue;
      planned.add(key);
      out.push({ productId, code, refill });
    }
  }
  return out;
}
