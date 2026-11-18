import { describe, expect, it } from "vitest";

import {
  computeStats,
  monthKey,
  monthsBetween,
  parseStatsRange,
  usageCostCents,
  type StatsPrint,
  type StatsSpool,
  type StatsUsage,
} from "./stats";

const d = (iso: string) => new Date(`${iso}T00:00:00Z`);
const NOW = new Date("2026-11-18T12:00:00Z");

const pla: Omit<StatsUsage, "grams"> = {
  priceCents: 2000,
  netWeightG: 1000,
  material: "PLA",
  brand: "Bambu Lab",
  colorName: "Black",
  colorHex: "#000000",
};
const petg: Omit<StatsUsage, "grams"> = {
  priceCents: null,
  netWeightG: 1000,
  material: "PETG",
  brand: "Sunlu",
  colorName: "Orange",
  colorHex: "#FF8800",
};

let n = 0;
function print(date: string, usages: StatsUsage[], extra: Partial<StatsPrint> = {}): StatsPrint {
  return { id: `p${++n}`, status: "PRINTED", date: d(date), durationMin: null, printerName: "P2S", usages, ...extra };
}
function spool(boughtOn: string, extra: Partial<StatsSpool> = {}): StatsSpool {
  return { status: "ACTIVE", boughtOn: d(boughtOn), priceCents: 2000, remainingG: 1000, netWeightG: 1000, ...extra };
}

describe("helpers", () => {
  it("keys months in UTC and lists them inclusively", () => {
    expect(monthKey(d("2026-01-31"))).toBe("2026-01");
    expect(monthsBetween(d("2025-11-15"), d("2026-02-01"))).toEqual(["2025-11", "2025-12", "2026-01", "2026-02"]);
  });

  it("prices usages in whole cents, or not at all", () => {
    expect(usageCostCents({ grams: 333, priceCents: 1999, netWeightG: 1000 })).toBe(666);
    expect(usageCostCents({ grams: 50, priceCents: null, netWeightG: 1000 })).toBeNull();
  });

  it("falls back to 12 months", () => {
    expect(parseStatsRange("6m")).toBe("6m");
    expect(parseStatsRange(["all"])).toBe("all");
    expect(parseStatsRange("nope")).toBe("12m");
    expect(parseStatsRange(undefined)).toBe("12m");
  });
});

describe("computeStats", () => {
  it("fills every month of the range, including empty ones", () => {
    const stats = computeStats({ prints: [], spools: [] }, "6m", NOW);
    expect(stats.months.map((m) => m.month)).toEqual(["2026-06", "2026-07", "2026-08", "2026-09", "2026-10", "2026-11"]);
    expect(stats.months.every((m) => m.usedG === 0)).toBe(true);
    expect(stats.avgCostPerPrintCents).toBeNull();
    expect(stats.rangeDays).toBeNull();
  });

  it("sums grams and cost per month, and keeps unpriced grams apart", () => {
    const stats = computeStats(
      {
        prints: [
          print("2026-10-05", [{ ...pla, grams: 100 }]),
          print("2026-11-02", [{ ...pla, grams: 50 }, { ...petg, grams: 30 }]),
          print("2026-11-03", [{ ...pla, grams: 999 }], { status: "PLANNED" }),
        ],
        spools: [],
      },
      "6m",
      NOW,
    );
    const oct = stats.months.find((m) => m.month === "2026-10")!;
    const nov = stats.months.find((m) => m.month === "2026-11")!;
    expect(oct).toMatchObject({ usedG: 100, costCents: 200, prints: 1 });
    expect(nov).toMatchObject({ usedG: 80, costCents: 100, prints: 1 }); // planned print ignored
    expect(stats).toMatchObject({ usedG: 180, costCents: 300, unpricedG: 30 });
    // Only the October print is fully priced.
    expect(stats.avgCostPerPrintCents).toBe(200);
  });

  it("counts failed prints, their grams, and leaves out what is outside the range", () => {
    const stats = computeStats(
      {
        prints: [
          print("2026-11-01", [{ ...pla, grams: 40 }], { status: "FAILED" }),
          print("2026-11-02", [{ ...pla, grams: 60 }]),
          print("2025-01-01", [{ ...pla, grams: 500 }]),
        ],
        spools: [],
      },
      "12m",
      NOW,
    );
    expect(stats).toMatchObject({ printed: 1, failed: 1, failedG: 40, usedG: 100 });
  });

  it("starts 'all' at the oldest print or purchase", () => {
    const stats = computeStats({ prints: [print("2026-09-20", [])], spools: [spool("2026-08-03")] }, "all", NOW);
    expect(stats.months[0]!.month).toBe("2026-08");
    expect(stats.months.at(-1)!.month).toBe("2026-11");
  });

  it("ranks materials, colours and brands by grams", () => {
    const stats = computeStats(
      {
        prints: [
          print("2026-11-01", [{ ...pla, grams: 10 }]),
          print("2026-11-02", [{ ...petg, grams: 30 }]),
          print("2026-11-03", [{ ...pla, grams: 25, colorHex: "#000000" }]),
        ],
        spools: [],
      },
      "6m",
      NOW,
    );
    expect(stats.materials.map((r) => [r.label, r.grams])).toEqual([
      ["PLA", 35],
      ["PETG", 30],
    ]);
    expect(stats.colors[0]).toMatchObject({ label: "Black", grams: 35, colorHex: "#000000" });
    expect(stats.brands[0]).toMatchObject({ label: "Bambu Lab", grams: 35 });
  });

  it("adds print time per printer", () => {
    const stats = computeStats(
      {
        prints: [
          print("2026-11-01", [], { durationMin: 90 }),
          print("2026-11-02", [], { durationMin: 30 }),
          print("2026-11-02", [], { durationMin: 45, printerName: "A1" }),
          print("2026-11-02", [], { durationMin: null }),
        ],
        spools: [],
      },
      "6m",
      NOW,
    );
    expect(stats.printHoursByPrinter).toEqual([
      { label: "P2S", minutes: 120 },
      { label: "A1", minutes: 45 },
    ]);
  });

  it("values the active stock and estimates how long it lasts", () => {
    const stats = computeStats(
      {
        // 900 g in the last 90 days = 10 g per day.
        prints: [print("2026-10-01", [{ ...pla, grams: 900 }])],
        spools: [
          spool("2026-10-01", { remainingG: 500 }),
          spool("2026-09-01", { remainingG: 250, priceCents: null }),
          spool("2026-09-01", { remainingG: 800, status: "ARCHIVED" }),
        ],
      },
      "12m",
      NOW,
    );
    expect(stats.stockG).toBe(750);
    expect(stats.stockValueCents).toBe(1000); // only the priced spool
    expect(stats.rangeDays).toBe(75);
    expect(stats.boughtCents).toBe(4000); // archived spools were bought too; the unpriced one adds nothing
    expect(stats.months.find((m) => m.month === "2026-10")!.boughtCents).toBe(2000);
  });
});
