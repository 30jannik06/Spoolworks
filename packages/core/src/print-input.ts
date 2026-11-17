import { z } from "zod";

import { parseGrams } from "./parse";
import { optionalDate, optionalText, optionalUrl } from "./spool-input";

export const PRINT_STATUSES = ["PRINTED", "FAILED", "PLANNED"] as const;
export type PrintStatus = (typeof PRINT_STATUSES)[number];

export const MODEL_SOURCES = ["MAKERWORLD", "PRINTABLES", "THINGIVERSE", "OTHER"] as const;
export type ModelSource = (typeof MODEL_SOURCES)[number];

/** Printed and failed prints consume filament; planned ones do not (yet). */
export function consumesFilament(status: PrintStatus): boolean {
  return status !== "PLANNED";
}

const KNOWN_SOURCES: [string, ModelSource][] = [
  ["makerworld.com", "MAKERWORLD"],
  ["printables.com", "PRINTABLES"],
  ["thingiverse.com", "THINGIVERSE"],
];

/** Where a model link points, by hostname (subdomains count, look-alikes do not). */
export function modelSourceFromUrl(url: string): ModelSource {
  let host: string;
  try {
    host = new URL(url).hostname.toLowerCase();
  } catch {
    return "OTHER";
  }
  for (const [domain, source] of KNOWN_SOURCES) {
    if (host === domain || host.endsWith(`.${domain}`)) return source;
  }
  return "OTHER";
}

/** Max one week; longer is almost certainly a typo. */
export const MAX_DURATION_MIN = 7 * 24 * 60;

/** "2:30", "2h30", "2h", "45m" or plain minutes "150" → minutes. Null when unreadable. */
export function parseDuration(input: string): number | null {
  const value = input.trim().toLowerCase().replace(/\s+/g, "");
  if (value === "") return null;
  let minutes: number;
  let match: RegExpExecArray | null;
  if ((match = /^(\d{1,3}):([0-5]\d)$/.exec(value))) {
    minutes = Number(match[1]) * 60 + Number(match[2]);
  } else if ((match = /^(\d{1,3})h(?:([0-5]?\d)(?:m|min)?)?$/.exec(value))) {
    minutes = Number(match[1]) * 60 + Number(match[2] ?? 0);
  } else if ((match = /^(\d{1,5})(?:m|min)?$/.exec(value))) {
    minutes = Number(match[1]);
  } else {
    return null;
  }
  return minutes > 0 && minutes <= MAX_DURATION_MIN ? minutes : null;
}

/** 150 → "2:30". */
export function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  return `${hours}:${String(minutes % 60).padStart(2, "0")}`;
}

const MAX_USAGE_G = 10_000;

const usageRow = z.object({
  spoolId: z.string().trim().default(""),
  grams: z.string().trim().default(""),
});

/**
 * Usage rows arrive as { "0": {spoolId, grams}, "1": … } from the form.
 * Rows without a spool or without grams are dropped: the form pre-fills one
 * row per loaded AMS slot and the user only types grams for the ones used.
 */
const usages = z
  .record(z.string(), usageRow)
  .optional()
  .transform((rows, ctx) => {
    const ordered = Object.entries(rows ?? {})
      .sort(([a], [b]) => Number(a) - Number(b))
      .map(([key, row]) => ({ key, ...row }));
    const result: { spoolId: string; grams: number }[] = [];
    const seen = new Set<string>();
    for (const row of ordered) {
      if (row.spoolId === "" || row.grams === "") continue;
      const grams = parseGrams(row.grams);
      if (grams === null || grams < 1 || grams > MAX_USAGE_G) {
        ctx.addIssue({ code: "custom", message: "invalid_grams", path: [row.key, "grams"] });
        continue;
      }
      if (seen.has(row.spoolId)) {
        ctx.addIssue({ code: "custom", message: "duplicate_spool", path: [row.key, "spoolId"] });
        continue;
      }
      seen.add(row.spoolId);
      result.push({ spoolId: row.spoolId, grams });
    }
    return result;
  });

const optionalDuration = z
  .string()
  .optional()
  .transform((value, ctx) => {
    if (value === undefined || value.trim() === "") return undefined;
    const minutes = parseDuration(value);
    if (minutes === null) {
      ctx.addIssue({ code: "custom", message: "invalid_duration" });
      return z.NEVER;
    }
    return minutes;
  });

export const printInput = z.object({
  name: z.string().trim().min(1, "required").max(80, "too_long"),
  status: z.enum(PRINT_STATUSES, { message: "invalid_status" }),
  printedOn: optionalDate,
  printerId: optionalText(40),
  durationMin: optionalDuration,
  modelUrl: optionalUrl,
  notes: optionalText(2000),
  usages,
});
export type PrintInput = z.output<typeof printInput>;
