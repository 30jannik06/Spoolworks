import { describe, expect, it } from "vitest";

import { WeightError, isLowStock, netFromGross } from "./weight";

describe("netFromGross", () => {
  it("subtracts the empty spool", () => {
    expect(netFromGross(1250, 250)).toBe(1000);
  });

  it("clamps at zero when the scale reads below the empty spool", () => {
    expect(netFromGross(246, 250)).toBe(0);
  });

  it("rejects fractional grams", () => {
    expect(() => netFromGross(1000.5, 250)).toThrow(WeightError);
  });

  it("rejects negative input", () => {
    expect(() => netFromGross(-1, 250)).toThrow(WeightError);
    expect(() => netFromGross(1000, -1)).toThrow(WeightError);
  });
});

describe("isLowStock", () => {
  it("warns at the threshold, not only below it", () => {
    expect(isLowStock(150, 150)).toBe(true);
    expect(isLowStock(151, 150)).toBe(false);
  });
});
