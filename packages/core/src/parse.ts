/**
 * Parsers for user-typed numbers. Money and weights are integers everywhere,
 * so these work on the digits and never go through a float.
 */

/**
 * "19,99" / "19.99" / "19" / "1.234,50" → cents. Returns null for anything
 * that is not a non-negative amount with at most two decimals.
 */
export function parseEuroToCents(input: string): number | null {
  const trimmed = input.trim().replace(/\s|€/g, "");
  if (trimmed === "") return null;

  // Plain: "19", "19,9", "19.99". Thousands separators only together with an
  // explicit two-digit decimal part in the other separator ("1.234,50",
  // "1,234.50"); a bare "19,999" is ambiguous and rejected.
  const plain = /^(\d+)(?:[.,](\d{1,2}))?$/.exec(trimmed);
  const grouped = /^(\d{1,3}(?:([.,])\d{3})+)([.,])(\d{2})$/.exec(trimmed);
  let wholePart: string;
  let fractionPart: string;
  if (plain) {
    wholePart = plain[1] ?? "";
    fractionPart = plain[2] ?? "";
  } else if (grouped && grouped[2] !== grouped[3]) {
    wholePart = grouped[1] ?? "";
    fractionPart = grouped[4] ?? "";
  } else {
    return null;
  }

  const whole = wholePart.replace(/[.,]/g, "");
  const fraction = fractionPart.padEnd(2, "0");
  const cents = Number.parseInt(whole, 10) * 100 + Number.parseInt(fraction || "0", 10);
  return Number.isSafeInteger(cents) ? cents : null;
}

/** Cents → "19,99" (German decimal comma, no currency sign). */
export function formatCents(cents: number): string {
  const sign = cents < 0 ? "-" : "";
  const absolute = Math.abs(cents);
  const euros = Math.floor(absolute / 100).toLocaleString("de-DE");
  return `${sign}${euros},${String(absolute % 100).padStart(2, "0")}`;
}

/** "1250" / "1.250" / " 1250 g " → 1250. Whole grams only. */
export function parseGrams(input: string): number | null {
  const cleaned = input.trim().replace(/\s|g$/gi, "").replace(/\./g, "");
  if (!/^\d{1,6}$/.test(cleaned)) return null;
  return Number.parseInt(cleaned, 10);
}

/** "#1E90FF" / "1e90ff" → "#1e90ff", or null. */
export function normalizeHexColor(input: string): string | null {
  const match = /^#?([0-9a-f]{6})$/i.exec(input.trim());
  return match ? `#${(match[1] ?? "").toLowerCase()}` : null;
}

/** Brand names compare case- and whitespace-insensitively. */
export function brandKey(name: string): string {
  return name.trim().replace(/\s+/g, " ").toLowerCase();
}
