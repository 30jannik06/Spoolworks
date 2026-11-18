/** Display formatting for statistics (German locale, integer inputs). */

const nf = (min: number, max: number) =>
  new Intl.NumberFormat("de-DE", { minimumFractionDigits: min, maximumFractionDigits: max });

/** 1234 → "1,23 kg"; below one kilogram stays in grams ("640 g"). */
export function weight(grams: number): string {
  return Math.abs(grams) >= 1000 ? `${nf(1, 2).format(grams / 1000)} kg` : `${nf(0, 0).format(grams)} g`;
}

/** 123456 → "1.234,56 €" */
export function euros(cents: number): string {
  return new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(cents / 100);
}

/** Whole euros for axis ticks: 2500 → "25 €" */
export function eurosShort(cents: number): string {
  return `${nf(0, 0).format(Math.round(cents / 100))} €`;
}

/** 135 → "2 h 15 min", 45 → "45 min" */
export function duration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (!h) return `${m} min`;
  return m ? `${h} h ${m} min` : `${h} h`;
}

export function percent(part: number, whole: number): string {
  return whole ? `${Math.round((part / whole) * 100)} %` : "–";
}

const MONTHS = ["Jan", "Feb", "Mär", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"];

/** "2026-11" → "Nov"; with year: "Nov 2026" */
export function monthLabel(key: string, withYear = false): string {
  const [y, m] = key.split("-");
  const name = MONTHS[Number(m) - 1] ?? key;
  return withYear ? `${name} ${y}` : name;
}

/** Round an axis maximum up to a clean value: 1, 2 or 5 × 10^n. */
export function niceMax(value: number): number {
  if (value <= 0) return 1;
  const exp = 10 ** Math.floor(Math.log10(value));
  const f = value / exp;
  return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * exp;
}
