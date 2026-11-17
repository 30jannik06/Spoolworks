import "server-only";

import { prisma, type Prisma } from "@spoolworks/database";

import { spoolInclude, toView, type SpoolView } from "@/lib/queries/spools";

/**
 * Printer reads, scoped by workshop like the spool queries. `null` means
 * missing or not yours.
 */

const printerInclude = {
  units: {
    orderBy: { position: "asc" },
    include: { slots: { orderBy: { position: "asc" }, include: { spool: { include: spoolInclude } } } },
  },
} satisfies Prisma.PrinterInclude;

type PrinterRow = Prisma.PrinterGetPayload<{ include: typeof printerInclude }>;

export type SlotView = { id: string; position: number; spool: SpoolView | null };
export type UnitView = { id: string; position: number; slotCount: number; slots: SlotView[] };
export type PrinterView = { id: string; name: string; model: string | null; units: UnitView[] };

function toPrinterView(row: PrinterRow, thresholdG: number): PrinterView {
  return {
    id: row.id,
    name: row.name,
    model: row.model,
    units: row.units.map((unit) => ({
      id: unit.id,
      position: unit.position,
      slotCount: unit.slotCount,
      slots: unit.slots.map((slot) => ({
        id: slot.id,
        position: slot.position,
        spool: slot.spool ? toView(slot.spool, thresholdG) : null,
      })),
    })),
  };
}

export async function listPrinters(workshopId: string, thresholdG: number): Promise<PrinterView[]> {
  const rows = await prisma.printer.findMany({
    where: { workshopId },
    include: printerInclude,
    orderBy: { createdAt: "asc" },
  });
  return rows.map((row) => toPrinterView(row, thresholdG));
}

export async function getPrinter(workshopId: string, printerId: string, thresholdG: number) {
  const row = await prisma.printer.findFirst({ where: { id: printerId, workshopId }, include: printerInclude });
  return row ? toPrinterView(row, thresholdG) : null;
}

/** Spools currently loaded in a printer, in slot order. Phase 3 pre-fills print usage from this. */
export function loadedSpools(printer: PrinterView): SpoolView[] {
  return printer.units.flatMap((unit) => unit.slots.flatMap((slot) => (slot.spool ? [slot.spool] : [])));
}

/** Everything that may go into a slot: active spools, shelf first, then by name. */
export async function assignableSpools(workshopId: string, thresholdG: number): Promise<SpoolView[]> {
  const rows = await prisma.spool.findMany({
    where: { workshopId, status: "ACTIVE" },
    include: spoolInclude,
    orderBy: [{ product: { productLine: "asc" } }, { product: { colorName: "asc" } }],
  });
  const views = rows.map((row) => toView(row, thresholdG));
  return [...views.filter((spool) => !spool.slot), ...views.filter((spool) => spool.slot)];
}
