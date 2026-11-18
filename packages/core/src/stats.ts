/**
 * Workshop statistics: pure aggregation over prints, usages and spools, so the
 * web page, the dashboard and later the bots compute the same numbers.
 *
 * - A print counts on `printedOn`, or the day it was entered if that is empty.
 * - Only PRINTED and FAILED prints used filament (like the ledger). PLANNED
 *   prints appear nowhere.
 * - Cost of a usage = grams × spool price / net weight, rounded to whole
 *   cents. Usages on spools without a price have no cost; their grams are
 *   reported separately, so an average never pretends to know them.
 * - Months are UTC calendar months ("2026-11"), matching the @db.Date columns.
 */

export type StatsPrintStatus = "PLANNED" | "PRINTED" | "FAILED";

export type StatsPrint = {
  id: string;
  status: StatsPrintStatus;
  /** printedOn ?? createdAt */
  date: Date;
  durationMin: number | null;
  printerName: string | null;
  usages: StatsUsage[];
};

export type StatsUsage = {
  grams: number;
  priceCents: number | null;
  netWeightG: number;
  material: string;
  brand: string;
  colorName: string;
  colorHex: string;
};

export type StatsSpool = {
  status: "ACTIVE" | "EMPTY" | "ARCHIVED";
  /** purchasedOn ?? createdAt */
  boughtOn: Date;
  priceCents: number | null;
  remainingG: number;
  netWeightG: number;
};

export type StatsRange = "6m" | "12m" | "all";
export const STATS_RANGES: readonly StatsRange[] = ["6m", "12m", "all"];

export function parseStatsRange(value: string | string[] | undefined): StatsRange {
  const v = Array.isArray(value) ? value[0] : value;
  return STATS_RANGES.includes(v as StatsRange) ? (v as StatsRange) : "12m";
}

export type MonthStats = { month: string; usedG: number; costCents: number; boughtCents: number; prints: number };
export type Ranked = { key: string; label: string; grams: number; colorHex?: string };

export type WorkshopStats = {
  months: MonthStats[];
  /** Totals for the selected range. */
  usedG: number;
  costCents: number;
  /** Grams in the range whose spool has no price (not in costCents). */
  unpricedG: number;
  boughtCents: number;
  printed: number;
  failed: number;
  failedG: number;
  /** Average over prints whose every usage has a price; null if there is none. */
  avgCostPerPrintCents: number | null;
  printHoursByPrinter: { label: string; minutes: number }[];
  materials: Ranked[];
  colors: Ranked[];
  brands: Ranked[];
  /** Not range-bound: what is on the shelf now. */
  stockG: number;
  stockValueCents: number;
  /** Days the active stock lasts at the last 90 days' pace; null without use in that window. */
  rangeDays: number | null;
};

const DAY_MS = 24 * 60 * 60 * 1000;

export function monthKey(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

/** Month keys from `from` through `to`, inclusive, oldest first. */
export function monthsBetween(from: Date, to: Date): string[] {
  const keys: string[] = [];
  let y = from.getUTCFullYear();
  let m = from.getUTCMonth();
  const endY = to.getUTCFullYear();
  const endM = to.getUTCMonth();
  while (y < endY || (y === endY && m <= endM)) {
    keys.push(`${y}-${String(m + 1).padStart(2, "0")}`);
    m += 1;
    if (m === 12) {
      m = 0;
      y += 1;
    }
  }
  return keys;
}

export function usageCostCents(usage: Pick<StatsUsage, "grams" | "priceCents" | "netWeightG">): number | null {
  if (usage.priceCents === null || usage.netWeightG <= 0) return null;
  return Math.round((usage.grams * usage.priceCents) / usage.netWeightG);
}

/** The first month shown: 6 or 12 calendar months ending with `now`'s, or the oldest data for "all". */
function rangeStart(range: StatsRange, now: Date, oldest: Date | null): Date {
  if (range === "all") {
    const start = oldest && oldest < now ? oldest : now;
    return new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), 1));
  }
  const back = range === "6m" ? 5 : 11;
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - back, 1));
}

function rank(map: Map<string, Ranked>, limit: number): Ranked[] {
  return [...map.values()].sort((a, b) => b.grams - a.grams || a.label.localeCompare(b.label)).slice(0, limit);
}

function add(map: Map<string, Ranked>, key: string, label: string, grams: number, colorHex?: string) {
  const entry = map.get(key) ?? { key, label, grams: 0, ...(colorHex ? { colorHex } : {}) };
  entry.grams += grams;
  map.set(key, entry);
}

export function computeStats(
  input: { prints: readonly StatsPrint[]; spools: readonly StatsSpool[] },
  range: StatsRange,
  now: Date,
  limit = 5,
): WorkshopStats {
  const used = input.prints.filter((p) => p.status !== "PLANNED");
  const dates = [...used.map((p) => p.date), ...input.spools.map((s) => s.boughtOn)];
  const oldest = dates.length ? new Date(Math.min(...dates.map((d) => d.getTime()))) : null;
  const start = rangeStart(range, now, oldest);
  const keys = monthsBetween(start, now);
  const months = new Map(keys.map((month) => [month, { month, usedG: 0, costCents: 0, boughtCents: 0, prints: 0 }]));

  let usedG = 0;
  let costCents = 0;
  let unpricedG = 0;
  let printed = 0;
  let failed = 0;
  let failedG = 0;
  let pricedPrints = 0;
  let pricedPrintCost = 0;
  const hours = new Map<string, number>();
  const materials = new Map<string, Ranked>();
  const colors = new Map<string, Ranked>();
  const brands = new Map<string, Ranked>();

  for (const print of used) {
    const month = months.get(monthKey(print.date));
    if (!month || print.date > now) continue;
    month.prints += 1;
    if (print.status === "PRINTED") printed += 1;
    else failed += 1;
    if (print.durationMin) {
      const label = print.printerName ?? "";
      hours.set(label, (hours.get(label) ?? 0) + print.durationMin);
    }
    let printCost = 0;
    let fullyPriced = print.usages.length > 0;
    for (const usage of print.usages) {
      usedG += usage.grams;
      month.usedG += usage.grams;
      if (print.status === "FAILED") failedG += usage.grams;
      const cost = usageCostCents(usage);
      if (cost === null) {
        unpricedG += usage.grams;
        fullyPriced = false;
      } else {
        costCents += cost;
        month.costCents += cost;
        printCost += cost;
      }
      add(materials, usage.material, usage.material, usage.grams);
      add(brands, usage.brand, usage.brand, usage.grams);
      const hex = usage.colorHex.toLowerCase();
      add(colors, `${usage.colorName.toLowerCase()}|${hex}`, usage.colorName, usage.grams, hex);
    }
    if (fullyPriced) {
      pricedPrints += 1;
      pricedPrintCost += printCost;
    }
  }

  let boughtCents = 0;
  let stockG = 0;
  let stockValueCents = 0;
  for (const spool of input.spools) {
    const month = months.get(monthKey(spool.boughtOn));
    if (month && spool.priceCents !== null && spool.boughtOn <= now) {
      month.boughtCents += spool.priceCents;
      boughtCents += spool.priceCents;
    }
    if (spool.status === "ACTIVE") {
      stockG += spool.remainingG;
      stockValueCents += usageCostCents({ grams: spool.remainingG, priceCents: spool.priceCents, netWeightG: spool.netWeightG }) ?? 0;
    }
  }

  // Pace over the last 90 days, independent of the selected range.
  const since = now.getTime() - 90 * DAY_MS;
  const recentG = used
    .filter((p) => p.date.getTime() > since && p.date <= now)
    .reduce((sum, p) => sum + p.usages.reduce((s, u) => s + u.grams, 0), 0);
  const rangeDays = recentG > 0 ? Math.round((stockG * 90) / recentG) : null;

  return {
    months: keys.map((k) => months.get(k)!),
    usedG,
    costCents,
    unpricedG,
    boughtCents,
    printed,
    failed,
    failedG,
    avgCostPerPrintCents: pricedPrints ? Math.round(pricedPrintCost / pricedPrints) : null,
    printHoursByPrinter: [...hours.entries()]
      .map(([label, minutes]) => ({ label, minutes }))
      .sort((a, b) => b.minutes - a.minutes),
    materials: rank(materials, limit),
    colors: rank(colors, limit),
    brands: rank(brands, limit),
    stockG,
    stockValueCents,
    rangeDays,
  };
}
