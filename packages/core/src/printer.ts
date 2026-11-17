import { z } from "zod";

/**
 * Feeder units on a printer. Hardware-neutral on purpose: a unit is either a
 * 4-slot AMS or a single slot (AMS HT, external spool holder).
 */
export const SLOT_COUNTS = [4, 1] as const;
export type SlotCount = (typeof SLOT_COUNTS)[number];

/** Upper bound per printer; generous for multi-AMS setups. */
export const MAX_UNITS_PER_PRINTER = 8;

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, "too_long")
    .transform((value) => (value === "" ? undefined : value))
    .optional();

export const printerInput = z.object({
  name: z.string().trim().min(1, "required").max(40, "too_long"),
  model: optionalText(60),
});
export type PrinterInput = z.output<typeof printerInput>;

const slotCount = z.enum(["4", "1"], { message: "invalid_slot_count" }).transform((value) => Number(value) as SlotCount);

/** New printer: details plus the first feeder unit ("0" = none yet). */
export const createPrinterInput = printerInput.extend({
  firstUnit: z
    .enum(["4", "1", "0"], { message: "invalid_slot_count" })
    .transform((value) => (value === "0" ? null : (Number(value) as SlotCount))),
});
export type CreatePrinterInput = z.output<typeof createPrinterInput>;

export const addUnitInput = z.object({
  printerId: z.string().min(1),
  slotCount,
});

export const assignSlotInput = z.object({
  slotId: z.string().min(1),
  /** Empty string empties the slot (spool back to the shelf). */
  spoolId: z
    .string()
    .transform((value) => (value === "" ? null : value))
    .nullable(),
});

/** The lowest free 1-based position, or null when the printer is full. */
export function nextUnitPosition(taken: number[], max = MAX_UNITS_PER_PRINTER): number | null {
  const used = new Set(taken);
  for (let position = 1; position <= max; position++) {
    if (!used.has(position)) return position;
  }
  return null;
}

/** Slot positions 1..count for a new unit. */
export function slotPositions(count: SlotCount): number[] {
  return Array.from({ length: count }, (_, i) => i + 1);
}
