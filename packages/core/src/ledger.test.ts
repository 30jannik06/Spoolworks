import { describe, expect, it } from "vitest";

import { LedgerError, computeRemaining, remainingFraction, type LedgerEntry } from "./ledger";

const initial = (valueG: number, seq = 1): LedgerEntry => ({ seq, kind: "INITIAL", valueG, active: true });
const weighing = (valueG: number, seq: number): LedgerEntry => ({ seq, kind: "WEIGHING", valueG, active: true });
const print = (valueG: number, seq: number, active = true): LedgerEntry => ({ seq, kind: "PRINT", valueG, active });

describe("computeRemaining", () => {
  it("starts at the initial weight", () => {
    expect(computeRemaining([initial(1000)])).toBe(1000);
  });

  it("subtracts active prints after the anchor", () => {
    expect(computeRemaining([initial(1000), print(46, 2), print(212, 3)])).toBe(742);
  });

  it("ignores inactive prints (a print set back to planned)", () => {
    expect(computeRemaining([initial(1000), print(46, 2, false), print(12, 3)])).toBe(988);
  });

  it("lets a weighing win over older prints", () => {
    // Printed 46 g, then weighed 940 g net, then the old print is edited to 80 g:
    // the scale already saw the real spool, so the old print no longer matters.
    const entries = [initial(1000), print(80, 2), weighing(940, 3)];
    expect(computeRemaining(entries)).toBe(940);
  });

  it("counts prints recorded after a weighing", () => {
    expect(computeRemaining([initial(1000), print(46, 2), weighing(940, 3), print(18, 4)])).toBe(922);
  });

  it("orders by seq, not by array position", () => {
    expect(computeRemaining([print(18, 4), weighing(940, 3), initial(1000, 1)])).toBe(922);
  });

  it("never goes below zero", () => {
    expect(computeRemaining([initial(100), print(150, 2)])).toBe(0);
  });

  it("refuses a ledger without an anchor", () => {
    expect(() => computeRemaining([print(10, 1)])).toThrow(LedgerError);
    expect(() => computeRemaining([])).toThrow(LedgerError);
  });
});

describe("remainingFraction", () => {
  it("is the share of the nominal weight, clamped to 0..1", () => {
    expect(remainingFraction(250, 1000)).toBe(0.25);
    expect(remainingFraction(1200, 1000)).toBe(1);
    expect(remainingFraction(-5, 1000)).toBe(0);
    expect(remainingFraction(100, 0)).toBe(0);
  });
});
