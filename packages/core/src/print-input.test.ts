import { describe, expect, it } from "vitest";

import { consumesFilament, formatDuration, modelSourceFromUrl, parseDuration, printInput } from "./print-input";

describe("modelSourceFromUrl", () => {
  it("recognises the big model sites by hostname", () => {
    expect(modelSourceFromUrl("https://makerworld.com/de/models/123")).toBe("MAKERWORLD");
    expect(modelSourceFromUrl("https://www.printables.com/model/1")).toBe("PRINTABLES");
    expect(modelSourceFromUrl("https://www.thingiverse.com/thing:1")).toBe("THINGIVERSE");
  });

  it("does not fall for look-alikes or broken links", () => {
    expect(modelSourceFromUrl("https://makerworld.com.evil.example/x")).toBe("OTHER");
    expect(modelSourceFromUrl("https://notprintables.com/x")).toBe("OTHER");
    expect(modelSourceFromUrl("not a url")).toBe("OTHER");
  });
});

describe("parseDuration", () => {
  it("reads common ways to write a duration", () => {
    expect(parseDuration("2:30")).toBe(150);
    expect(parseDuration("2h30")).toBe(150);
    expect(parseDuration("2h")).toBe(120);
    expect(parseDuration("45m")).toBe(45);
    expect(parseDuration(" 90 ")).toBe(90);
  });

  it("rejects nonsense, zero and more than a week", () => {
    expect(parseDuration("2:75")).toBeNull();
    expect(parseDuration("abc")).toBeNull();
    expect(parseDuration("0")).toBeNull();
    expect(parseDuration("20000")).toBeNull();
  });

  it("formats back", () => {
    expect(formatDuration(150)).toBe("2:30");
    expect(formatDuration(5)).toBe("0:05");
  });
});

describe("consumesFilament", () => {
  it("is false only for planned prints", () => {
    expect(consumesFilament("PRINTED")).toBe(true);
    expect(consumesFilament("FAILED")).toBe(true);
    expect(consumesFilament("PLANNED")).toBe(false);
  });
});

describe("printInput", () => {
  const base = { name: "Kabelhalter", status: "PRINTED" };

  it("keeps filled usage rows in order and drops empty ones", () => {
    const parsed = printInput.parse({
      ...base,
      usages: {
        "1": { spoolId: "b", grams: "12" },
        "0": { spoolId: "a", grams: "34" },
        "2": { spoolId: "c", grams: "" },
        "3": { spoolId: "", grams: "5" },
      },
    });
    expect(parsed.usages).toEqual([
      { spoolId: "a", grams: 34 },
      { spoolId: "b", grams: 12 },
    ]);
  });

  it("flags a spool used twice and bad grams on the row", () => {
    const result = printInput.safeParse({
      ...base,
      usages: {
        "0": { spoolId: "a", grams: "10" },
        "1": { spoolId: "a", grams: "5" },
        "2": { spoolId: "b", grams: "0" },
      },
    });
    expect(result.success).toBe(false);
    const issues = result.error?.issues.map((issue) => [issue.path.join("."), issue.message]);
    expect(issues).toContainEqual(["usages.1.spoolId", "duplicate_spool"]);
    expect(issues).toContainEqual(["usages.2.grams", "invalid_grams"]);
  });

  it("allows a print without usages and validates the rest", () => {
    expect(printInput.parse({ ...base, durationMin: "1:15", printedOn: "2026-11-17" })).toMatchObject({
      durationMin: 75,
      printedOn: "2026-11-17",
      usages: [],
    });
    const bad = printInput.safeParse({ name: "", status: "DONE", modelUrl: "ftp://x" });
    expect(bad.error?.issues.map((issue) => issue.message).sort()).toEqual(
      ["invalid_status", "invalid_url", "required"].sort(),
    );
  });
});
