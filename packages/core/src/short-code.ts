/**
 * Short codes for spool labels: /s/<code> on a QR code and an NTAG213 sticker.
 *
 * 8 characters of Crockford base32 (no I, L, O, U): 40 bits, easy to read off
 * a label, and case-insensitive. The code is fixed once printed, so it is
 * random rather than derived from anything that could change.
 */
export const SHORT_CODE_ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
export const SHORT_CODE_LENGTH = 8;

/** Returns `count` random bytes. Injected so tests can be deterministic. */
export type RandomBytes = (count: number) => Uint8Array;

const defaultRandom: RandomBytes = (count) => crypto.getRandomValues(new Uint8Array(count));

export function generateShortCode(random: RandomBytes = defaultRandom): string {
  // 256 is a multiple of 32, so masking the low 5 bits is unbiased.
  const bytes = random(SHORT_CODE_LENGTH);
  let code = "";
  for (const byte of bytes) {
    code += SHORT_CODE_ALPHABET[byte & 31];
  }
  return code;
}

/**
 * Normalises typed or scanned input the Crockford way: case-insensitive,
 * hyphens and spaces ignored, I/L read as 1 and O as 0. Returns null if the
 * result is not a valid code.
 */
export function normalizeShortCode(input: string): string | null {
  const cleaned = input
    .toUpperCase()
    .replace(/[\s-]/g, "")
    .replace(/[IL]/g, "1")
    .replace(/O/g, "0");
  if (cleaned.length !== SHORT_CODE_LENGTH) return null;
  for (const char of cleaned) {
    if (!SHORT_CODE_ALPHABET.includes(char)) return null;
  }
  return cleaned;
}
