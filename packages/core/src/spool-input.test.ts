import { describe, expect, it } from "vitest";

import { createSpoolInput, productInput, weighInput } from "./spool-input";

const product = {
  brandName: " Bambu Lab ",
  productLine: "PLA Matte",
  material: "PLA",
  colorName: "Marine Blue",
  colorHex: "#4A7BC2",
  diameterUm: "1750",
  netWeightG: "1000",
  spoolWeightG: "250",
};

describe("productInput", () => {
  it("normalises strings into integers and a lowercase hex", () => {
    const parsed = productInput.parse(product);
    expect(parsed).toMatchObject({
      brandName: "Bambu Lab",
      colorHex: "#4a7bc2",
      diameterUm: 1750,
      netWeightG: 1000,
      spoolWeightG: 250,
    });
  });

  it("rejects an unknown material and a bad colour", () => {
    expect(productInput.safeParse({ ...product, material: "WOOD" }).success).toBe(false);
    expect(productInput.safeParse({ ...product, colorHex: "blue" }).success).toBe(false);
  });

  it("treats an empty empty-spool weight as unknown", () => {
    expect(productInput.parse({ ...product, spoolWeightG: "" }).spoolWeightG).toBeUndefined();
  });
});

describe("createSpoolInput", () => {
  const base = { initialNetG: "1000", emptySpoolWeightG: "250" };

  it("accepts an existing product id", () => {
    const parsed = createSpoolInput.parse({ ...base, productId: "prod_1", purchasePriceCents: "19,99" });
    expect(parsed.productId).toBe("prod_1");
    expect(parsed.purchasePriceCents).toBe(1999);
  });

  it("accepts a new product instead", () => {
    expect(createSpoolInput.safeParse({ ...base, product }).success).toBe(true);
  });

  it("requires exactly one of product id and new product", () => {
    expect(createSpoolInput.safeParse(base).success).toBe(false);
    expect(createSpoolInput.safeParse({ ...base, productId: "prod_1", product }).success).toBe(false);
  });

  it("rejects fractional grams and non-http links", () => {
    expect(createSpoolInput.safeParse({ ...base, productId: "p", initialNetG: "999,5" }).success).toBe(false);
    expect(
      createSpoolInput.safeParse({ ...base, productId: "p", purchaseUrl: "javascript:alert(1)" }).success,
    ).toBe(false);
  });

  it("drops empty optional fields", () => {
    const parsed = createSpoolInput.parse({ ...base, productId: "p", location: "  ", notes: "" });
    expect(parsed.location).toBeUndefined();
    expect(parsed.notes).toBeUndefined();
  });
});

describe("weighInput", () => {
  it("takes the gross weight in whole grams", () => {
    expect(weighInput.parse({ spoolId: "s1", grossG: "1062" }).grossG).toBe(1062);
    expect(weighInput.safeParse({ spoolId: "s1", grossG: "abc" }).success).toBe(false);
  });
});
