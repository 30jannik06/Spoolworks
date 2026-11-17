/**
 * Weights are whole grams (integers) everywhere. No floats: a scale shows
 * whole grams and summing floats drifts.
 */

export class WeightError extends Error {
  override name = "WeightError";
}

function assertWholeGrams(value: number, label: string): void {
  if (!Number.isInteger(value)) {
    throw new WeightError(`${label} must be a whole number of grams, got ${value}`);
  }
  if (value < 0) {
    throw new WeightError(`${label} must not be negative, got ${value}`);
  }
}

/**
 * Net filament weight from a weighing: gross (spool on the scale) minus the
 * empty spool. Never below zero: a slightly light spool on the scale means
 * "empty", not "minus 4 g".
 */
export function netFromGross(grossG: number, emptySpoolG: number): number {
  assertWholeGrams(grossG, "grossG");
  assertWholeGrams(emptySpoolG, "emptySpoolG");
  return Math.max(0, grossG - emptySpoolG);
}

/** True when the remaining net weight is at or below the workshop threshold. */
export function isLowStock(remainingG: number, thresholdG: number): boolean {
  return remainingG <= thresholdG;
}
