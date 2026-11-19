/**
 * Empty-spool weights from SpoolmanDB (https://github.com/Donkie/SpoolmanDB,
 * MIT). OFD often lacks them; SpoolmanDB lists one row per colour with the
 * weight of the empty spool. Its names do not separate product line and
 * colour reliably, so the match is deliberately coarse and conservative:
 * brand + material + net weight + diameter, and only when every SpoolmanDB
 * row in that group agrees on the same weight. Anything ambiguous (e.g. a
 * brand selling the same weight on cardboard and plastic spools) stays empty.
 */

export const SPOOLMAN_DB_URL = "https://donkie.github.io/SpoolmanDB/filaments.json";

/** The fields of a compiled SpoolmanDB filament row we read. */
export type SpoolmanFilament = {
  manufacturer: string;
  material: string;
  weight: number;
  spool_weight?: number | null;
  diameter: number;
};

export type SpoolWeightQuery = {
  brandName: string;
  /** OFD's own material string, before SpoolWorks groups it. */
  material: string;
  netWeightG: number;
  diameterUm: number;
};

/** Looser than `brandKey`: "FormFutura" and "Formfutura", "3D-Fuel" and "3D Fuel" meet. */
function looseKey(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function groupKey(brand: string, material: string, netWeightG: number, diameterUm: number): string {
  return [looseKey(brand), material.trim().toUpperCase(), netWeightG, diameterUm].join("\u0000");
}

function isPlausibleWeight(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0 && value <= 2000;
}

/**
 * Builds a lookup from SpoolmanDB rows. Malformed rows are skipped, so a
 * broken upstream file degrades to "no weights", never to wrong ones.
 */
export function spoolWeightLookup(rows: unknown): (query: SpoolWeightQuery) => number | null {
  /** null marks a group whose rows disagree. */
  const groups = new Map<string, number | null>();
  if (Array.isArray(rows)) {
    for (const row of rows as Partial<SpoolmanFilament>[]) {
      if (!row || typeof row !== "object") continue;
      const { manufacturer, material, weight, diameter, spool_weight } = row;
      if (typeof manufacturer !== "string" || typeof material !== "string") continue;
      if (typeof weight !== "number" || typeof diameter !== "number" || !isPlausibleWeight(spool_weight)) continue;
      const key = groupKey(manufacturer, material, Math.round(weight), Math.round(diameter * 1000));
      const grams = Math.round(spool_weight);
      const seen = groups.get(key);
      if (seen === undefined) groups.set(key, grams);
      else if (seen !== grams) groups.set(key, null);
    }
  }
  return (query) => groups.get(groupKey(query.brandName, query.material, query.netWeightG, query.diameterUm)) ?? null;
}
