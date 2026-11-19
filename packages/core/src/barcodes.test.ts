import { describe, expect, it } from "vitest";

import { barcodeCandidates, mapOfdDataset, planBarcodes, type OfdDataset } from "./ofd";

describe("barcodeCandidates", () => {
  it("pairs a UPC-A with its EAN-13 form and back", () => {
    expect(barcodeCandidates("012345678905")).toEqual(["012345678905", "0012345678905"]);
    expect(barcodeCandidates("0012345678905")).toEqual(["0012345678905", "012345678905"]);
  });

  it("keeps a plain EAN-13 and an EAN-8 as they are", () => {
    expect(barcodeCandidates("4250786312345")).toEqual(["4250786312345"]);
    expect(barcodeCandidates("96385074")).toEqual(["96385074"]);
  });

  it("cleans scanner noise and GTIN-14 padding", () => {
    expect(barcodeCandidates(" 4250-7863-12345 ")).toEqual(["4250786312345"]);
    expect(barcodeCandidates("04250786312345")).toEqual(["4250786312345"]);
  });

  it("returns nothing for text that is no barcode", () => {
    expect(barcodeCandidates("PLA Basic")).toEqual([]);
    expect(barcodeCandidates("12345")).toEqual([]);
    expect(barcodeCandidates(null)).toEqual([]);
  });
});

function dataset(sizes: Partial<OfdDataset["sizes"][number]>[]): OfdDataset {
  return {
    version: "test",
    brands: [{ id: "b", name: "Bambu Lab" }],
    filaments: [{ id: "f", name: "PLA Basic", brand_id: "b", material: "PLA" }],
    variants: [{ id: "v", name: "Black", color_hex: "#000000", filament_id: "f" }],
    sizes: sizes.map((size, i) => ({ id: `s${i}`, uuid: `u${i}`, variant_id: "v", filament_weight: 1000, diameter: 1.75, ...size })),
  };
}

describe("barcodes in mapOfdDataset", () => {
  it("keeps the spool's and the refill's codes on the merged product", () => {
    const { products } = mapOfdDataset(
      dataset([
        { container_material: "refill", gtin: "06975337030331" },
        { gtin: "6975337032878", barcode_identifier: "921128098885" },
      ]),
    );
    expect(products).toHaveLength(1);
    expect(products[0]?.ean).toBe("6975337032878");
    expect(products[0]?.barcodes).toEqual([
      { code: "6975337032878", refill: false },
      { code: "921128098885", refill: false },
      { code: "6975337030331", refill: true },
    ]);
  });

  it("lists a code once, as the spool's when both rows carry it, and skips junk", () => {
    const { products } = mapOfdDataset(
      dataset([
        { spool_refill: true, gtin: "6975337032878", barcode_identifier: "n/a" },
        { gtin: "06975337032878" },
      ]),
    );
    expect(products[0]?.barcodes).toEqual([{ code: "6975337032878", refill: false }]);
  });

  it("has none when OFD has none", () => {
    expect(mapOfdDataset(dataset([{}])).products[0]?.barcodes).toEqual([]);
  });
});

describe("planBarcodes", () => {
  const products = [
    { ofdUuid: "u1", barcodes: [{ code: "111", refill: false }, { code: "222", refill: true }] },
    { ofdUuid: "user", barcodes: [{ code: "333", refill: false }] },
    { ofdUuid: "unknown", barcodes: [{ code: "444", refill: false }] },
  ];
  const ids = new Map([["u1", "p1"]]);

  it("adds missing codes of managed products only", () => {
    expect(planBarcodes(products, ids, new Set(["p1\u0000111"]))).toEqual([{ productId: "p1", code: "222", refill: true }]);
  });

  it("adds nothing on a second run and never twice in one run", () => {
    const twice = [products[0]!, products[0]!];
    const first = planBarcodes(twice, ids, new Set());
    expect(first).toHaveLength(2);
    expect(planBarcodes(twice, ids, new Set(first.map((b) => `${b.productId}\u0000${b.code}`)))).toEqual([]);
  });
});
