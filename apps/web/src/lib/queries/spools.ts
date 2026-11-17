import "server-only";

import { colorSearchTerms, MATERIALS, remainingFraction, type Material } from "@spoolworks/core";
import { prisma, type Prisma } from "@spoolworks/database";

/**
 * Spool reads. Every query takes the caller's workshopId and scopes by it;
 * `null` means "missing or not yours", which pages turn into notFound()
 * without telling the two apart.
 */

export const spoolInclude = {
  product: { include: { brand: true } },
  slot: { include: { unit: { include: { printer: { select: { id: true, name: true } } } } } },
} satisfies Prisma.SpoolInclude;

type SpoolRow = Prisma.SpoolGetPayload<{ include: typeof spoolInclude }>;

/** What list and detail components render. Never a raw Prisma row. */
export type SpoolView = {
  id: string;
  shortCode: string;
  brand: string;
  productLine: string;
  material: Material;
  colorName: string;
  colorHex: string;
  netWeightG: number;
  diameterUm: number;
  emptySpoolWeightG: number;
  remainingG: number;
  fraction: number;
  low: boolean;
  status: "ACTIVE" | "EMPTY" | "ARCHIVED";
  location: string | null;
  purchasePriceCents: number | null;
  purchasedOn: string | null;
  purchaseUrl: string | null;
  notes: string | null;
  /** Where the spool is loaded; null means on the shelf. */
  slot: SlotRef | null;
};

/** A slot position as the UI labels it ("P2S · AMS 1 · Slot 2"). */
export type SlotRef = {
  printerId: string;
  printerName: string;
  unitPosition: number;
  slotCount: number;
  slotPosition: number;
};

export function toView(row: SpoolRow, thresholdG: number): SpoolView {
  return {
    id: row.id,
    shortCode: row.shortCode,
    brand: row.product.brand.name,
    productLine: row.product.productLine,
    material: row.product.material,
    colorName: row.product.colorName,
    colorHex: row.product.colorHex,
    netWeightG: row.product.netWeightG,
    diameterUm: row.product.diameterUm,
    emptySpoolWeightG: row.emptySpoolWeightG,
    remainingG: row.remainingG,
    fraction: remainingFraction(row.remainingG, row.product.netWeightG),
    low: row.status === "ACTIVE" && row.remainingG <= thresholdG,
    status: row.status,
    location: row.location,
    purchasePriceCents: row.purchasePriceCents,
    purchasedOn: row.purchasedOn ? row.purchasedOn.toISOString().slice(0, 10) : null,
    purchaseUrl: row.purchaseUrl,
    notes: row.notes,
    slot: row.slot
      ? {
          printerId: row.slot.unit.printer.id,
          printerName: row.slot.unit.printer.name,
          unitPosition: row.slot.unit.position,
          slotCount: row.slot.unit.slotCount,
          slotPosition: row.slot.position,
        }
      : null,
  };
}

export type SpoolFilter = {
  material?: Material;
  brandId?: string;
  colorHex?: string;
  low?: boolean;
  archived?: boolean;
  /** Active spools not loaded in any slot. */
  shelf?: boolean;
};

/** Reads the list filter from URL search params; unknown values are ignored. */
export function parseSpoolFilter(params: Record<string, string | string[] | undefined>): SpoolFilter {
  const one = (key: string) => {
    const value = params[key];
    return typeof value === "string" && value !== "" ? value : undefined;
  };
  const material = one("material");
  const color = one("color");
  return {
    material: MATERIALS.includes(material as Material) ? (material as Material) : undefined,
    brandId: one("brand"),
    colorHex: color && /^[0-9a-f]{6}$/.test(color) ? `#${color}` : undefined,
    low: one("low") === "1",
    archived: one("archived") === "1",
    shelf: one("shelf") === "1",
  };
}

export async function listSpools(workshopId: string, thresholdG: number, filter: SpoolFilter = {}) {
  const rows = await prisma.spool.findMany({
    where: {
      workshopId,
      status: filter.archived ? "ARCHIVED" : { not: "ARCHIVED" },
      ...(filter.low ? { remainingG: { lte: thresholdG } } : {}),
      ...(filter.shelf && !filter.archived ? { slot: { is: null } } : {}),
      product: {
        ...(filter.material ? { material: filter.material } : {}),
        ...(filter.brandId ? { brandId: filter.brandId } : {}),
        ...(filter.colorHex ? { colorHex: filter.colorHex } : {}),
      },
    },
    include: spoolInclude,
    orderBy: [{ remainingG: "asc" }, { createdAt: "desc" }],
  });
  return rows.map((row) => toView(row, thresholdG));
}

/** Brands, materials and colours that occur in this workshop, for filter chips. */
export async function getSpoolFacets(workshopId: string) {
  const products = await prisma.filamentProduct.findMany({
    where: { spools: { some: { workshopId, status: { not: "ARCHIVED" } } } },
    select: { material: true, colorHex: true, colorName: true, brand: { select: { id: true, name: true } } },
  });
  const brands = new Map<string, string>();
  const materials = new Set<Material>();
  const colors = new Map<string, string>();
  for (const product of products) {
    brands.set(product.brand.id, product.brand.name);
    materials.add(product.material);
    colors.set(product.colorHex, product.colorName);
  }
  return {
    brands: [...brands].map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name, "de")),
    materials: MATERIALS.filter((material) => materials.has(material)),
    colors: [...colors].map(([hex, name]) => ({ hex, name })),
  };
}

export async function getSpool(workshopId: string, spoolId: string, thresholdG: number) {
  const row = await prisma.spool.findFirst({ where: { id: spoolId, workshopId }, include: spoolInclude });
  return row ? toView(row, thresholdG) : null;
}

export type LedgerView = { seq: number; kind: "INITIAL" | "WEIGHING" | "CORRECTION" | "PRINT"; valueG: number; active: boolean; createdAt: Date };

/** The spool's history, newest first. Scoped through the spool's workshop. */
export async function getSpoolLedger(workshopId: string, spoolId: string): Promise<LedgerView[]> {
  return prisma.spoolLedgerEntry.findMany({
    where: { spoolId, spool: { workshopId } },
    select: { seq: true, kind: true, valueG: true, active: true, createdAt: true },
    orderBy: { seq: "desc" },
    take: 50,
  });
}

/** Figures for the dashboard. */
export async function getStockStats(workshopId: string, thresholdG: number) {
  const active = await prisma.spool.findMany({
    where: { workshopId, status: "ACTIVE" },
    include: spoolInclude,
    orderBy: { remainingG: "asc" },
  });
  const views = active.map((row) => toView(row, thresholdG));
  return {
    totalG: views.reduce((sum, spool) => sum + spool.remainingG, 0),
    count: views.length,
    low: views.filter((spool) => spool.low),
  };
}

/** Catalog search for the "add spool" picker. The catalog is global and holds no personal data. */
export async function searchProducts(query: string) {
  const terms = query.trim().split(/\s+/).filter(Boolean).slice(0, 4);
  const rows = await prisma.filamentProduct.findMany({
    where: {
      AND: terms.map((term) => ({
        OR: [
          { productLine: { contains: term, mode: "insensitive" as const } },
          // The imported catalog names colours in English; "Schwarz" also finds "Black".
          ...colorSearchTerms(term).map((color) => ({ colorName: { contains: color, mode: "insensitive" as const } })),
          { brand: { name: { contains: term, mode: "insensitive" as const } } },
          ...(MATERIALS.includes(term.toUpperCase() as Material)
            ? [{ material: term.toUpperCase() as Material }]
            : []),
        ],
      })),
    },
    include: { brand: true },
    orderBy: [{ discontinued: "asc" }, { brand: { name: "asc" } }, { productLine: "asc" }, { colorName: "asc" }],
    take: 20,
  });
  return rows.map((row) => ({
    id: row.id,
    brand: row.brand.name,
    productLine: row.productLine,
    material: row.material,
    colorName: row.colorName,
    colorHex: row.colorHex,
    netWeightG: row.netWeightG,
    diameterUm: row.diameterUm,
    spoolWeightG: row.spoolWeightG,
    discontinued: row.discontinued,
  }));
}

export type ProductOption = Awaited<ReturnType<typeof searchProducts>>[number];
