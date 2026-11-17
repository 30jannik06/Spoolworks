import { describe, expect, it } from "vitest";

import { brandKey, formatCents, normalizeHexColor, parseEuroToCents, parseGrams } from "./parse";

describe("parseEuroToCents", () => {
  it.each([
    ["19,99", 1999],
    ["19.99", 1999],
    ["19", 1900],
    ["19,9", 1990],
    ["0,05", 5],
    ["1.234,50", 123450],
    ["1,234.50", 123450],
    [" 24,90 € ", 2490],
  ])("%s → %i", (input, cents) => {
    expect(parseEuroToCents(input)).toBe(cents);
  });

  it.each(["", "abc", "-5", "19,999", "1,2,3"])("rejects %j", (input) => {
    expect(parseEuroToCents(input)).toBeNull();
  });

  it("does not suffer float rounding (0.1 + 0.2 style)", () => {
    expect(parseEuroToCents("0,29")).toBe(29);
    expect(parseEuroToCents("1,15")).toBe(115);
  });
});

describe("formatCents", () => {
  it("uses the German decimal comma", () => {
    expect(formatCents(1999)).toBe("19,99");
    expect(formatCents(5)).toBe("0,05");
    expect(formatCents(123450)).toBe("1.234,50");
  });
});

describe("parseGrams", () => {
  it("accepts whole grams with optional unit and thousands dot", () => {
    expect(parseGrams("1250")).toBe(1250);
    expect(parseGrams("1.250")).toBe(1250);
    expect(parseGrams(" 812 g ")).toBe(812);
    expect(parseGrams("0")).toBe(0);
  });

  it("rejects decimals, negatives and text", () => {
    expect(parseGrams("12,5")).toBeNull();
    expect(parseGrams("-3")).toBeNull();
    expect(parseGrams("viel")).toBeNull();
    expect(parseGrams("")).toBeNull();
  });
});

describe("normalizeHexColor", () => {
  it("lowercases and adds the hash", () => {
    expect(normalizeHexColor("#1E90FF")).toBe("#1e90ff");
    expect(normalizeHexColor("1e90ff")).toBe("#1e90ff");
    expect(normalizeHexColor("#fff")).toBeNull();
  });
});

describe("brandKey", () => {
  it("ignores case and extra spaces", () => {
    expect(brandKey("  Bambu   Lab ")).toBe("bambu lab");
    expect(brandKey("BAMBU LAB")).toBe(brandKey("Bambu Lab"));
  });
});
