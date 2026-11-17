"use server";

import {
  addUnitInput,
  assignSlotInput,
  createPrinterInput,
  MAX_UNITS_PER_PRINTER,
  nextUnitPosition,
  printerInput,
  slotPositions,
  type SlotCount,
} from "@spoolworks/core";
import { Prisma, prisma } from "@spoolworks/database";
import { refresh } from "next/cache";
import { redirect } from "next/navigation";

import { fieldErrorsFrom, formToObject, type ActionState } from "@/lib/action-state";
import { requireWorkshop } from "@/lib/session";

/**
 * Printers, feeder units and slots. Every lookup is scoped by the caller's
 * workshop through printer.workshopId; a foreign id behaves like a missing one.
 */

async function createUnit(tx: Prisma.TransactionClient, printerId: string, position: number, slotCount: SlotCount) {
  await tx.amsUnit.create({
    data: {
      printerId,
      position,
      slotCount,
      slots: { create: slotPositions(slotCount).map((slot) => ({ position: slot })) },
    },
  });
}

export async function createPrinter(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { workshop } = await requireWorkshop("/printers/new");
  const parsed = createPrinterInput.safeParse(formToObject(formData));
  if (!parsed.success) {
    return { ok: false, error: "invalid_input", fieldErrors: fieldErrorsFrom(parsed.error) };
  }
  const { name, model, firstUnit } = parsed.data;

  const printerId = await prisma.$transaction(async (tx) => {
    const printer = await tx.printer.create({ data: { workshopId: workshop.id, name, model: model ?? null } });
    if (firstUnit) await createUnit(tx, printer.id, 1, firstUnit);
    return printer.id;
  });
  redirect(`/printers/${printerId}`);
}

export async function updatePrinter(printerId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const { workshop } = await requireWorkshop(`/printers/${printerId}/edit`);
  const parsed = printerInput.safeParse(formToObject(formData));
  if (!parsed.success) {
    return { ok: false, error: "invalid_input", fieldErrors: fieldErrorsFrom(parsed.error) };
  }
  const result = await prisma.printer.updateMany({
    where: { id: printerId, workshopId: workshop.id },
    data: { name: parsed.data.name, model: parsed.data.model ?? null },
  });
  if (result.count === 0) return { ok: false, error: "printer_not_found" };
  redirect(`/printers/${printerId}`);
}

/** Units and slots go with the printer; their spools stay and are back on the shelf. */
export async function deletePrinter(printerId: string): Promise<ActionState> {
  const { workshop } = await requireWorkshop();
  const result = await prisma.printer.deleteMany({ where: { id: printerId, workshopId: workshop.id } });
  if (result.count === 0) return { ok: false, error: "printer_not_found" };
  redirect("/printers");
}

export async function addUnit(printerId: string, slotCount: string): Promise<ActionState> {
  const { workshop } = await requireWorkshop();
  const parsed = addUnitInput.safeParse({ printerId, slotCount });
  if (!parsed.success) return { ok: false, error: "invalid_input" };

  try {
    const outcome = await prisma.$transaction(async (tx) => {
      const printer = await tx.printer.findFirst({
        where: { id: printerId, workshopId: workshop.id },
        select: { id: true, units: { select: { position: true } } },
      });
      if (!printer) return "printer_not_found" as const;
      const position = nextUnitPosition(
        printer.units.map((unit) => unit.position),
        MAX_UNITS_PER_PRINTER,
      );
      if (position === null) return "too_many_units" as const;
      await createUnit(tx, printer.id, position, parsed.data.slotCount);
      return null;
    });
    if (outcome) return { ok: false, error: outcome };
  } catch (error) {
    // Two adds at once can pick the same position; the unique index rejects one.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { ok: false, error: "conflict" };
    }
    throw error;
  }
  refresh();
  return { ok: true };
}

/** Removes a unit; spools in it go back to the shelf (slots cascade, spools stay). */
export async function removeUnit(unitId: string): Promise<ActionState> {
  const { workshop } = await requireWorkshop();
  const result = await prisma.amsUnit.deleteMany({ where: { id: unitId, printer: { workshopId: workshop.id } } });
  if (result.count === 0) return { ok: false, error: "printer_not_found" };
  refresh();
  return { ok: true };
}

/**
 * Loads a spool into a slot, or empties the slot (spoolId ""). A spool already
 * in another slot moves; a spool already in the target slot goes back to the
 * shelf. All in one transaction.
 */
export async function assignSlot(slotId: string, spoolId: string): Promise<ActionState> {
  const { workshop } = await requireWorkshop();
  const parsed = assignSlotInput.safeParse({ slotId, spoolId });
  if (!parsed.success) return { ok: false, error: "invalid_input" };
  const input = parsed.data;

  try {
    const outcome = await prisma.$transaction(async (tx) => {
      const slot = await tx.amsSlot.findFirst({
        where: { id: input.slotId, unit: { printer: { workshopId: workshop.id } } },
        select: { id: true, spoolId: true },
      });
      if (!slot) return "slot_not_found" as const;

      if (input.spoolId === null) {
        await tx.amsSlot.update({ where: { id: slot.id }, data: { spoolId: null } });
        return null;
      }
      if (slot.spoolId === input.spoolId) return null;

      const spool = await tx.spool.findFirst({
        where: { id: input.spoolId, workshopId: workshop.id },
        select: { id: true, status: true },
      });
      if (!spool) return "not_found" as const;
      if (spool.status !== "ACTIVE") return "spool_not_active" as const;

      // Take it out of wherever it sits now, then load it here.
      await tx.amsSlot.updateMany({ where: { spoolId: spool.id }, data: { spoolId: null } });
      await tx.amsSlot.update({ where: { id: slot.id }, data: { spoolId: spool.id } });
      return null;
    });
    if (outcome) return { ok: false, error: outcome };
  } catch (error) {
    // A concurrent assignment of the same spool hits the unique index.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { ok: false, error: "conflict" };
    }
    throw error;
  }
  refresh();
  return { ok: true };
}
