import { describe, expect, it } from "vitest";

import { mapOfdDataset, planCatalogSync, type CatalogProduct, type ExistingProduct, type OfdDataset } from "./ofd";
import { spoolWeightLookup } from "./spoolman";

const rows = [
  { manufacturer: "Bambu Lab", material: "PLA", weight: 1000, diameter: 1.75, spool_weight: 250 },
  { manufacturer: "Bambu Lab", material: "PLA", weight: 1000, diameter: 1.75, spool_weight: 250.4 },
  { manufacturer: "Polymaker", material: "PLA", weight: 1000, diameter: 1.75, spool_weight: 140 },
  { manufacturer: "Polymaker", material: "PLA", weight: 1000, diameter: 1.75, spool_weight: 250 },
  { manufacturer: "FormFutura", material: "PETG", weight: 750, diameter: 2.85, spool_weight: 265 },
];

describe("spoolWeightLookup", () => {
  const lookup = spoolWeightLookup(rows);

  it("answers when every row of brand, material, weight and diameter agrees", () => {
    expect(lookup({ brandName: "Bambu Lab", material: "pla", netWeightG: 1000, diameterUm: 1750 })).toBe(250);
    expect(lookup({ brandName: "Formfutura", material: "PETG", netWeightG: 750, diameterUm: 2850 })).toBe(265);
  });

  it("stays empty when the rows disagree or nothing matches", () => {
    expect(lookup({ brandName: "Polymaker", material: "PLA", netWeightG: 1000, diameterUm: 1750 })).toBeNull();
    expect(lookup({ brandName: "Bambu Lab", material: "PETG", netWeightG: 1000, diameterUm: 1750 })).toBeNull();
    expect(lookup({ brandName: "Bambu Lab", material: "PLA", netWeightG: 500, diameterUm: 1750 })).toBeNull();
    expect(lookup({ brandName: "Bambu Lab", material: "PLA", netWeightG: 1000, diameterUm: 2850 })).toBeNull();
  });

  it("skips malformed rows and survives a broken file", () => {
    const odd = spoolWeightLookup([
      null,
      { manufacturer: "X", material: "PLA", weight: 1000, diameter: 1.75, spool_weight: 0 },
      { manufacturer: "X", material: "PLA", weight: 1000, diameter: 1.75, spool_weight: 5000 },
      { manufacturer: "X", material: "PLA", weight: "1000", diameter: 1.75, spool_weight: 200 },
    ]);
    expect(odd({ brandName: "X", material: "PLA", netWeightG: 1000, diameterUm: 1750 })).toBeNull();
    expect(spoolWeightLookup({ not: "an array" })({ brandName: "X", material: "PLA", netWeightG: 1, diameterUm: 1750 })).toBeNull();
  });
});

const data = (empty?: number): OfdDataset => ({
  version: "test",
  brands: [{ id: "b", name: "Bambu Lab" }],
  filaments: [{ id: "f", name: "PLA Basic", brand_id: "b", material: "PLA" }],
  variants: [{ id: "v", name: "Black", color_hex: "#000000", filament_id: "f" }],
  sizes: [{ id: "s", uuid: "u1", variant_id: "v", filament_weight: 1000, diameter: 1.75, empty_spool_weight: empty }],
});

describe("mapOfdDataset with SpoolmanDB weights", () => {
  it("fills a missing empty-spool weight and counts it", () => {
    const result = mapOfdDataset(data(), { spoolWeight: spoolWeightLookup(rows) });
    expect(result.products[0]?.spoolWeightG).toBe(250);
    expect(result.spoolWeightsFilled).toBe(1);
  });

  it("never replaces a weight OFD itself has", () => {
    const result = mapOfdDataset(data(180), { spoolWeight: spoolWeightLookup(rows) });
    expect(result.products[0]?.spoolWeightG).toBe(180);
    expect(result.spoolWeightsFilled).toBe(0);
  });

  it("leaves the gap without a lookup", () => {
    expect(mapOfdDataset(data()).products[0]?.spoolWeightG).toBeNull();
  });
});

describe("planCatalogSync and empty-spool weights", () => {
  const incoming = (spoolWeightG: number | null): CatalogProduct => ({
    ofdUuid: "u1",
    movedFrom: [],
    brandName: "Bambu Lab",
    productLine: "PLA Basic",
    material: "PLA",
    colorName: "Black",
    colorHex: "#000000",
    diameterUm: 1750,
    netWeightG: 1000,
    spoolWeightG,
    ean: null,
    barcodes: [],
    discontinued: false,
  });
  const existing = (spoolWeightG: number | null): ExistingProduct => ({
    id: "p1",
    ofdUuid: "u1",
    ofdManaged: true,
    brandKey: "bambu lab",
    productLine: "PLA Basic",
    material: "PLA",
    colorName: "Black",
    colorHex: "#000000",
    diameterUm: 1750,
    netWeightG: 1000,
    spoolWeightG,
    ean: null,
    discontinued: false,
  });

  it("never clears a known weight when upstream has none (or SpoolmanDB was unreachable)", () => {
    expect(planCatalogSync([existing(250)], [incoming(null)])).toMatchObject({ update: [], unchanged: 1 });
  });

  it("keeps the known weight on an update for another field", () => {
    const plan = planCatalogSync([existing(250)], [{ ...incoming(null), colorHex: "#111111" }]);
    expect(plan.update[0]?.product.spoolWeightG).toBe(250);
  });

  it("fills a gap and follows a changed value", () => {
    expect(planCatalogSync([existing(null)], [incoming(250)]).update).toHaveLength(1);
    expect(planCatalogSync([existing(250)], [incoming(180)]).update[0]?.product.spoolWeightG).toBe(180);
  });

  it("does not hand a user's own product a weight", () => {
    const typed = { ...existing(null), ofdManaged: false };
    expect(planCatalogSync([typed], [incoming(250)])).toMatchObject({ update: [], unchanged: 1 });
  });
});
