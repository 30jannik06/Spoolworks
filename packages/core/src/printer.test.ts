import { describe, expect, it } from "vitest";

import { assignSlotInput, createPrinterInput, nextUnitPosition, slotPositions } from "./printer";

describe("createPrinterInput", () => {
  it("trims, drops an empty model and maps the first unit", () => {
    expect(createPrinterInput.parse({ name: "  P2S ", model: "", firstUnit: "4" })).toEqual({
      name: "P2S",
      model: undefined,
      firstUnit: 4,
    });
    expect(createPrinterInput.parse({ name: "A1", firstUnit: "0" }).firstUnit).toBeNull();
  });

  it("rejects missing names and unknown unit sizes", () => {
    const result = createPrinterInput.safeParse({ name: " ", firstUnit: "3" });
    expect(result.success).toBe(false);
    const messages = result.error?.issues.map((issue) => issue.message);
    expect(messages).toContain("required");
    expect(messages).toContain("invalid_slot_count");
  });
});

describe("assignSlotInput", () => {
  it("treats an empty spool id as emptying the slot", () => {
    expect(assignSlotInput.parse({ slotId: "s", spoolId: "" })).toEqual({ slotId: "s", spoolId: null });
    expect(assignSlotInput.parse({ slotId: "s", spoolId: "abc" }).spoolId).toBe("abc");
  });
});

describe("nextUnitPosition", () => {
  it("fills gaps first and stops at the limit", () => {
    expect(nextUnitPosition([])).toBe(1);
    expect(nextUnitPosition([1, 3])).toBe(2);
    expect(nextUnitPosition([1, 2], 2)).toBeNull();
  });
});

describe("slotPositions", () => {
  it("numbers slots from 1", () => {
    expect(slotPositions(4)).toEqual([1, 2, 3, 4]);
    expect(slotPositions(1)).toEqual([1]);
  });
});
