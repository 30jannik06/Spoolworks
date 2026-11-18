import { describe, expect, it } from "vitest";

import {
  A4_HEIGHT_UM,
  A4_WIDTH_UM,
  LABEL_PRESETS,
  findLabelPreset,
  formatShortCode,
  labelsPerSheet,
  layoutLabelSheets,
  spoolLabelPath,
} from "./label";
import { normalizeShortCode } from "./short-code";

describe("formatShortCode", () => {
  it("splits the code in two halves", () => {
    expect(formatShortCode("K7M2Q9XA")).toBe("K7M2-Q9XA");
  });

  it("round-trips through normalizeShortCode", () => {
    expect(normalizeShortCode(formatShortCode("K7M2Q9XA"))).toBe("K7M2Q9XA");
  });

  it("leaves unexpected input alone", () => {
    expect(formatShortCode("ABC")).toBe("ABC");
  });
});

describe("spoolLabelPath", () => {
  it("points to the short route", () => {
    expect(spoolLabelPath("K7M2Q9XA")).toBe("/s/K7M2Q9XA");
  });
});

describe("LABEL_PRESETS", () => {
  it.each(LABEL_PRESETS)("$id fits on A4", (preset) => {
    const width = preset.marginLeftUm + preset.columns * preset.widthUm + (preset.columns - 1) * preset.gapXUm;
    const height = preset.marginTopUm + preset.rows * preset.heightUm + (preset.rows - 1) * preset.gapYUm;
    expect(width).toBeLessThanOrEqual(A4_WIDTH_UM);
    expect(height).toBeLessThanOrEqual(A4_HEIGHT_UM);
  });

  it("falls back to the first preset", () => {
    expect(findLabelPreset("nope").id).toBe("70x37");
    expect(findLabelPreset(undefined).id).toBe("70x37");
    expect(findLabelPreset("52x30").id).toBe("52x30");
  });
});

describe("layoutLabelSheets", () => {
  const preset = findLabelPreset("63x38");

  it("fills rows left to right", () => {
    const [sheet] = layoutLabelSheets(preset, 4);
    expect(sheet!.map(({ xUm, yUm }) => [xUm, yUm])).toEqual([
      [7_250, 15_150],
      [73_250, 15_150],
      [139_250, 15_150],
      [7_250, 53_250],
    ]);
  });

  it("starts a new sheet when one is full", () => {
    const sheets = layoutLabelSheets(preset, labelsPerSheet(preset) + 1);
    expect(sheets).toHaveLength(2);
    expect(sheets[1]).toEqual([{ index: 21, xUm: 7_250, yUm: 15_150 }]);
  });

  it("skips used cells on the first sheet only", () => {
    const sheets = layoutLabelSheets(preset, 20, 5);
    expect(sheets[0]![0]).toEqual({ index: 0, xUm: 139_250, yUm: 53_250 });
    expect(sheets[0]).toHaveLength(16);
    expect(sheets[1]![0]).toEqual({ index: 16, xUm: 7_250, yUm: 15_150 });
  });

  it("clamps skip", () => {
    expect(layoutLabelSheets(preset, 1, -3)[0]![0]).toEqual({
      index: 0,
      xUm: 7_250,
      yUm: 15_150,
    });
    expect(layoutLabelSheets(preset, 1, 999)).toHaveLength(1);
  });

  it("returns no sheets for no labels", () => {
    expect(layoutLabelSheets(preset, 0)).toEqual([]);
  });
});
