import "server-only";

import type { ModelSource, PrintStatus } from "@spoolworks/core";
import { prisma, type Prisma } from "@spoolworks/database";

import { loadedSpools, listPrinters } from "@/lib/queries/printers";
import { spoolInclude, toView, type SpoolView } from "@/lib/queries/spools";

/** Print reads, scoped by workshop. `null` means missing or not yours. */

const printInclude = {
  printer: { select: { id: true, name: true } },
  usages: {
    orderBy: { grams: "desc" },
    include: { spool: { include: { product: { include: { brand: true } } } } },
  },
} satisfies Prisma.PrintInclude;

type PrintRow = Prisma.PrintGetPayload<{ include: typeof printInclude }>;

export type UsageView = {
  spoolId: string;
  grams: number;
  brand: string;
  productLine: string;
  colorName: string;
  colorHex: string;
  archived: boolean;
};

export type PrintView = {
  id: string;
  name: string;
  status: PrintStatus;
  printedOn: string | null;
  durationMin: number | null;
  modelUrl: string | null;
  modelSource: ModelSource | null;
  notes: string | null;
  /** Secret share token; null = private. */
  shareToken: string | null;
  printer: { id: string; name: string } | null;
  usages: UsageView[];
  totalG: number;
};

function toPrintView(row: PrintRow): PrintView {
  const usages = row.usages.map((usage) => ({
    spoolId: usage.spoolId,
    grams: usage.grams,
    brand: usage.spool.product.brand.name,
    productLine: usage.spool.product.productLine,
    colorName: usage.spool.product.colorName,
    colorHex: usage.spool.product.colorHex,
    archived: usage.spool.status === "ARCHIVED",
  }));
  return {
    id: row.id,
    name: row.name,
    status: row.status,
    printedOn: row.printedOn ? row.printedOn.toISOString().slice(0, 10) : null,
    durationMin: row.durationMin,
    modelUrl: row.modelUrl,
    modelSource: row.modelSource,
    notes: row.notes,
    shareToken: row.shareToken,
    printer: row.printer,
    usages,
    totalG: usages.reduce((sum, usage) => sum + usage.grams, 0),
  };
}

export async function listPrints(workshopId: string): Promise<PrintView[]> {
  const rows = await prisma.print.findMany({
    where: { workshopId },
    include: printInclude,
    orderBy: [{ printedOn: { sort: "desc", nulls: "first" } }, { createdAt: "desc" }],
  });
  return rows.map(toPrintView);
}

export async function getPrint(workshopId: string, printId: string): Promise<PrintView | null> {
  const row = await prisma.print.findFirst({ where: { id: printId, workshopId }, include: printInclude });
  return row ? toPrintView(row) : null;
}

/** Count and the latest print, for the dashboard. */
export async function getPrintStats(workshopId: string) {
  const [count, latest] = await Promise.all([
    prisma.print.count({ where: { workshopId, status: { not: "PLANNED" } } }),
    prisma.print.findFirst({
      where: { workshopId, status: { not: "PLANNED" } },
      include: printInclude,
      orderBy: [{ printedOn: { sort: "desc", nulls: "last" } }, { createdAt: "desc" }],
    }),
  ]);
  return { count, latest: latest ? toPrintView(latest) : null };
}

/**
 * What the print form needs: spools that can be booked (active ones, plus the
 * print's own spools even if archived since) and each printer's loaded spools
 * for pre-filling the usage rows.
 */
export async function getPrintFormOptions(workshopId: string, thresholdG: number, keepSpoolIds: string[] = []) {
  const [rows, printers] = await Promise.all([
    prisma.spool.findMany({
      where: { workshopId, OR: [{ status: "ACTIVE" }, { id: { in: keepSpoolIds } }] },
      include: spoolInclude,
      orderBy: [{ product: { productLine: "asc" } }, { product: { colorName: "asc" } }],
    }),
    listPrinters(workshopId, thresholdG),
  ]);
  const spools: SpoolView[] = rows.map((row) => toView(row, thresholdG));
  return {
    spools,
    printers: printers.map((printer) => ({
      id: printer.id,
      name: printer.name,
      loadedSpoolIds: loadedSpools(printer).map((spool) => spool.id),
    })),
  };
}
