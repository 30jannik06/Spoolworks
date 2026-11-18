import "server-only";

import {
  isShareToken,
  normalizeHandle,
  PRINT_PHOTO_LIMIT,
  type Material,
  type ModelSource,
  type PrintStatus,
} from "@spoolworks/core";
import { prisma, type Prisma } from "@spoolworks/database";

/**
 * Reads for pages without a session. They select exactly the fields the
 * owner agreed to publish and nothing else: no ids (print, spool, workshop),
 * no short codes, no remaining weights. Photos are addressed by share token
 * and position (/p/<token>/photos/<n>), never by id. Never reuse the private
 * PrintView here.
 */

const publicPrintSelect = {
  shareToken: true,
  name: true,
  status: true,
  printedOn: true,
  durationMin: true,
  modelUrl: true,
  modelSource: true,
  notes: true,
  printer: { select: { name: true } },
  photos: { orderBy: { position: "asc" }, select: { width: true, height: true } },
  usages: {
    orderBy: { grams: "desc" },
    select: {
      grams: true,
      spool: {
        select: {
          product: {
            select: {
              productLine: true,
              material: true,
              colorName: true,
              colorHex: true,
              brand: { select: { name: true } },
            },
          },
        },
      },
    },
  },
} satisfies Prisma.PrintSelect;

type PublicPrintRow = Prisma.PrintGetPayload<{ select: typeof publicPrintSelect }>;

export type PublicUsage = {
  grams: number;
  brand: string;
  productLine: string;
  material: Material;
  colorName: string;
  colorHex: string;
};

export type PublicPrint = {
  token: string;
  name: string;
  status: PrintStatus;
  printedOn: string | null;
  durationMin: number | null;
  modelUrl: string | null;
  modelSource: ModelSource | null;
  notes: string | null;
  printerName: string | null;
  /** In order, index = position (0 = cover). */
  photos: { width: number; height: number }[];
  usages: PublicUsage[];
  totalG: number;
};

function toPublicPrint(row: PublicPrintRow): PublicPrint | null {
  if (!row.shareToken) return null;
  const usages = row.usages.map((usage) => ({
    grams: usage.grams,
    brand: usage.spool.product.brand.name,
    productLine: usage.spool.product.productLine,
    material: usage.spool.product.material,
    colorName: usage.spool.product.colorName,
    colorHex: usage.spool.product.colorHex,
  }));
  return {
    token: row.shareToken,
    name: row.name,
    status: row.status,
    printedOn: row.printedOn ? row.printedOn.toISOString().slice(0, 10) : null,
    durationMin: row.durationMin,
    modelUrl: row.modelUrl,
    modelSource: row.modelSource,
    notes: row.notes,
    printerName: row.printer?.name ?? null,
    photos: row.photos,
    usages,
    totalG: usages.reduce((sum, usage) => sum + usage.grams, 0),
  };
}

/** A shared print, plus the gallery handle if the owner's gallery is public. Null for anything else. */
export async function getSharedPrint(token: string) {
  if (!isShareToken(token)) return null;
  const row = await prisma.print.findUnique({
    where: { shareToken: token },
    select: { ...publicPrintSelect, workshop: { select: { galleryPublic: true, publicHandle: true } } },
  });
  if (!row) return null;
  const print = toPublicPrint(row);
  if (!print) return null;
  const { galleryPublic, publicHandle } = row.workshop;
  return { print, galleryHandle: galleryPublic ? publicHandle : null };
}

/** The public gallery: exactly the shared prints, newest first. Null if unknown or switched off. */
export async function getPublicGallery(handle: string) {
  const normalized = normalizeHandle(handle);
  if (normalized === "") return null;
  const workshop = await prisma.workshop.findUnique({
    where: { publicHandle: normalized },
    select: {
      galleryPublic: true,
      publicHandle: true,
      prints: {
        where: { shareToken: { not: null } },
        select: publicPrintSelect,
        orderBy: [{ printedOn: { sort: "desc", nulls: "first" } }, { createdAt: "desc" }],
      },
    },
  });
  if (!workshop?.galleryPublic || !workshop.publicHandle) return null;
  return {
    handle: workshop.publicHandle,
    prints: workshop.prints.map(toPublicPrint).filter((print): print is PublicPrint => print !== null),
  };
}

/** One photo of a shared print by position, for the public photo route. Null for anything else. */
export async function getSharedPhoto(token: string, position: string) {
  if (!isShareToken(token) || !/^\d{1,2}$/.test(position)) return null;
  const index = Number(position);
  if (index >= PRINT_PHOTO_LIMIT) return null;
  return prisma.printPhoto.findFirst({
    where: { position: index, print: { shareToken: token } },
    select: { pathname: true, thumbPathname: true, contentType: true },
  });
}
