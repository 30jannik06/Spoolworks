import { z } from "zod";

import { brandKey, normalizeHexColor, parseEuroToCents, parseGrams } from "./parse";

/**
 * Input contracts for the filament library, shared by the web forms and,
 * later, the bots. Form values arrive as strings; these schemas turn them into
 * integers (grams, cents, micrometres) or reject them with a code the UI
 * translates. Error messages are keys, never user-facing text.
 */

export const MATERIALS = ["PLA", "PETG", "ABS", "ASA", "TPU", "PA", "PC", "PET", "HIPS", "PVA", "OTHER"] as const;
export type Material = (typeof MATERIALS)[number];

const MAX_SPOOL_G = 10_000;
const MAX_EMPTY_SPOOL_G = 2_000;

const text = (max: number) => z.string().trim().max(max, "too_long");
export const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, "too_long")
    .transform((value) => (value === "" ? undefined : value))
    .optional();

const grams = (max: number) =>
  z
    .string()
    .transform((value, ctx) => {
      const parsed = parseGrams(value);
      if (parsed === null) {
        ctx.addIssue({ code: "custom", message: "invalid_grams" });
        return z.NEVER;
      }
      return parsed;
    })
    .pipe(z.number().int().min(0).max(max, "too_heavy"));

export const optionalGrams = (max: number) =>
  z
    .string()
    .optional()
    .transform((value, ctx) => {
      if (value === undefined || value.trim() === "") return undefined;
      const parsed = parseGrams(value);
      if (parsed === null || parsed > max) {
        ctx.addIssue({ code: "custom", message: "invalid_grams" });
        return z.NEVER;
      }
      return parsed;
    });

const optionalCents = z
  .string()
  .optional()
  .transform((value, ctx) => {
    if (value === undefined || value.trim() === "") return undefined;
    const cents = parseEuroToCents(value);
    if (cents === null) {
      ctx.addIssue({ code: "custom", message: "invalid_price" });
      return z.NEVER;
    }
    return cents;
  });

export const optionalDate = z
  .string()
  .optional()
  .transform((value, ctx) => {
    if (value === undefined || value.trim() === "") return undefined;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(Date.parse(`${value}T00:00:00Z`))) {
      ctx.addIssue({ code: "custom", message: "invalid_date" });
      return z.NEVER;
    }
    return value;
  });

export const optionalUrl = z
  .string()
  .trim()
  .optional()
  .transform((value, ctx) => {
    if (value === undefined || value === "") return undefined;
    try {
      const url = new URL(value);
      if (url.protocol !== "https:" && url.protocol !== "http:") throw new Error("protocol");
      return url.toString();
    } catch {
      ctx.addIssue({ code: "custom", message: "invalid_url" });
      return z.NEVER;
    }
  });

/** A catalog product typed in by the user (when it is not in the catalog yet). */
export const productInput = z.object({
  brandName: text(60).min(1, "required"),
  productLine: text(80).min(1, "required"),
  material: z.enum(MATERIALS, { message: "invalid_material" }),
  colorName: text(60).min(1, "required"),
  colorHex: z.string().transform((value, ctx) => {
    const hex = normalizeHexColor(value);
    if (!hex) {
      ctx.addIssue({ code: "custom", message: "invalid_color" });
      return z.NEVER;
    }
    return hex;
  }),
  diameterUm: z.enum(["1750", "2850"], { message: "invalid_diameter" }).transform(Number),
  netWeightG: grams(MAX_SPOOL_G).pipe(z.number().min(1, "required")),
  spoolWeightG: optionalGrams(MAX_EMPTY_SPOOL_G),
});
export type ProductInput = z.output<typeof productInput>;

/** Fields of an owned spool, independent of which product it is. */
export const spoolDetailsInput = z.object({
  emptySpoolWeightG: grams(MAX_EMPTY_SPOOL_G),
  purchasePriceCents: optionalCents,
  purchasedOn: optionalDate,
  purchaseUrl: optionalUrl,
  location: optionalText(80),
  notes: optionalText(2000),
});
export type SpoolDetailsInput = z.output<typeof spoolDetailsInput>;

/**
 * Creating a spool: either pick an existing catalog product (`productId`) or
 * describe a new one (`product`). `initialNetG` is the filament on the spool
 * right now; a new spool is usually full.
 */
export const createSpoolInput = z
  .object({
    productId: z.string().trim().optional(),
    product: productInput.optional(),
    initialNetG: grams(MAX_SPOOL_G),
  })
  .and(spoolDetailsInput)
  .superRefine((value, ctx) => {
    const hasId = Boolean(value.productId);
    if (hasId === Boolean(value.product)) {
      ctx.addIssue({ code: "custom", message: "product_required", path: ["productId"] });
    }
  });
export type CreateSpoolInput = z.output<typeof createSpoolInput>;

/** Weighing: the gross weight on the scale; the empty spool is subtracted. */
export const weighInput = z.object({
  spoolId: z.string().trim().min(1),
  grossG: grams(MAX_SPOOL_G + MAX_EMPTY_SPOOL_G),
});

/** Setting the remaining net weight by hand. */
export const correctionInput = z.object({
  spoolId: z.string().trim().min(1),
  netG: grams(MAX_SPOOL_G),
});

export const thresholdInput = z.object({
  lowStockThresholdG: grams(MAX_SPOOL_G),
});

export { brandKey };
