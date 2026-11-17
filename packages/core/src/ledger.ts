/**
 * The spool ledger: every change to a spool's weight is an entry.
 *
 * Anchors (INITIAL, WEIGHING, CORRECTION) state an absolute net weight.
 * PRINT entries state consumption and count only while `active`.
 *
 * Remaining weight = value of the latest anchor
 *                  − sum of active PRINT entries recorded after it.
 *
 * Consequence: a weighing wins over older prints. Editing or deleting a print
 * that was booked before the last weighing does not change the remaining
 * weight, because the scale already saw the real spool.
 */

export const LEDGER_KINDS = ["INITIAL", "WEIGHING", "CORRECTION", "PRINT"] as const;
export type LedgerKind = (typeof LEDGER_KINDS)[number];

export type LedgerEntry = {
  /** Monotonic sequence; defines the order, not timestamps. */
  seq: number;
  kind: LedgerKind;
  valueG: number;
  active: boolean;
};

export class LedgerError extends Error {
  override name = "LedgerError";
}

export function isAnchor(kind: LedgerKind): boolean {
  return kind !== "PRINT";
}

/**
 * Remaining net grams for one spool's ledger. Never below zero: consumption
 * beyond the last anchor means "empty", not "minus 30 g".
 */
export function computeRemaining(entries: readonly LedgerEntry[]): number {
  const ordered = [...entries].sort((a, b) => a.seq - b.seq);

  let anchorIndex = -1;
  for (let index = ordered.length - 1; index >= 0; index -= 1) {
    const entry = ordered[index];
    if (entry && isAnchor(entry.kind)) {
      anchorIndex = index;
      break;
    }
  }
  const anchor = ordered[anchorIndex];
  if (!anchor) {
    throw new LedgerError("A spool ledger needs at least one anchor (INITIAL entry).");
  }

  let consumed = 0;
  for (const entry of ordered.slice(anchorIndex + 1)) {
    if (entry.kind === "PRINT" && entry.active) {
      consumed += entry.valueG;
    }
  }
  return Math.max(0, anchor.valueG - consumed);
}

/** Share of a full spool that is left, 0..1, for rings and bars. */
export function remainingFraction(remainingG: number, netWeightG: number): number {
  if (netWeightG <= 0) return 0;
  return Math.min(1, Math.max(0, remainingG / netWeightG));
}
