import { describe, expect, it } from "vitest";

import { SHORT_CODE_LENGTH, generateShortCode, normalizeShortCode } from "./short-code";

describe("generateShortCode", () => {
  it("produces 8 characters from the Crockford alphabet", () => {
    for (let run = 0; run < 200; run += 1) {
      expect(generateShortCode()).toMatch(/^[0-9A-HJKMNP-TV-Z]{8}$/);
    }
  });

  it("maps bytes deterministically through the low 5 bits", () => {
    const bytes = Uint8Array.from([0, 1, 31, 32, 33, 255, 10, 18]);
    expect(generateShortCode(() => bytes)).toBe("01Z01ZAJ");
  });

  it("is long enough for an NTAG213 URL", () => {
    const url = `https://spoolworks.example/s/${generateShortCode()}`;
    expect(SHORT_CODE_LENGTH).toBe(8);
    expect(new TextEncoder().encode(url).length).toBeLessThan(137);
  });
});

describe("normalizeShortCode", () => {
  it("accepts lowercase, hyphens and spaces", () => {
    expect(normalizeShortCode("k7m2-q9xa")).toBe("K7M2Q9XA");
    expect(normalizeShortCode(" K7M2 Q9XA ")).toBe("K7M2Q9XA");
  });

  it("reads I and L as 1 and O as 0", () => {
    expect(normalizeShortCode("IL0OABCD")).toBe("1100ABCD");
  });

  it("rejects wrong length and letters outside the alphabet", () => {
    expect(normalizeShortCode("K7M2Q9X")).toBeNull();
    expect(normalizeShortCode("K7M2Q9XAB")).toBeNull();
    expect(normalizeShortCode("K7M2Q9XU")).toBeNull();
  });
});
