import { describe, expect, it } from "vitest";

import { colorSearchTerms } from "./color-terms";
import {
  mapOfdDataset,
  mapOfdMaterial,
  normalizeBarcode,
  planCatalogSync,
  stripBrandPrefix,
  type CatalogProduct,
  type ExistingProduct,
  type OfdDataset,
} from "./ofd";

function dataset(sizes: Partial<OfdDataset["sizes"][number]>[], overrides: Partial<OfdDataset> = {}): OfdDataset {
  return {
    version: "test",
    brands: [{ id: "b1", name: "Bambu Lab" }],
    filaments: [{ id: "f1", name: "PLA Basic", brand_id: "b1", material: "PLA" }],
    variants: [{ id: "v1", name: "Black", color_hex: "#000000", filament_id: "f1" }],
    ...overrides,
    sizes: sizes.map((size, i) => ({
      id: `s${i}`,
      uuid: `u${i}`,
      variant_id: "v1",
      filament_weight: 1000,
      diameter: 1.75,
      ...size,
    })),
  };
}

describe("mapOfdMaterial", () => {
  it("keeps known materials, groups nylons, sends the rest to OTHER", () => {
    expect(mapOfdMaterial("PETG")).toBe("PETG");
    expect(mapOfdMaterial("pla")).toBe("PLA");
    expect(mapOfdMaterial("PA12")).toBe("PA");
    expect(mapOfdMaterial("PPA")).toBe("PA");
    expect(mapOfdMaterial("PCTG")).toBe("OTHER");
    expect(mapOfdMaterial("PEEK")).toBe("OTHER");
  });
});

describe("normalizeBarcode", () => {
  it("drops the GTIN-14 leading zero and rejects odd lengths", () => {
    expect(normalizeBarcode("06975337032878")).toBe("6975337032878");
    expect(normalizeBarcode("191314034277")).toBe("191314034277");
    expect(normalizeBarcode("12345")).toBeNull();
    expect(normalizeBarcode(null)).toBeNull();
  });
});

describe("stripBrandPrefix", () => {
  it("removes a repeated brand name but never empties the line", () => {
    expect(stripBrandPrefix("Polymaker", "Polymaker PolyTerra PLA")).toBe("PolyTerra PLA");
    expect(stripBrandPrefix("Bambu Lab", "PLA Basic")).toBe("PLA Basic");
    expect(stripBrandPrefix("Sunlu", "Sunlu")).toBe("Sunlu");
  });
});

describe("mapOfdDataset", () => {
  it("maps one size to one product in integer units", () => {
    const { products, invalid } = mapOfdDataset(
      dataset([{ empty_spool_weight: 250, gtin: "06975337032878", diameter: 2.85, filament_weight: 750 }]),
    );
    expect(invalid).toBe(0);
    expect(products).toEqual([
      {
        ofdUuid: "u0",
        movedFrom: [],
        brandName: "Bambu Lab",
        productLine: "PLA Basic",
        material: "PLA",
        colorName: "Black",
        colorHex: "#000000",
        diameterUm: 2850,
        netWeightG: 750,
        spoolWeightG: 250,
        ean: "6975337032878",
        barcodes: [{ code: "6975337032878", refill: false }],
        discontinued: false,
      },
    ]);
  });

  it("merges a refill into the spooled product, whichever comes first", () => {
    const sizes = [
      { container_material: "refill", gtin: "6975337030331" },
      { gtin: "6975337032878", empty_spool_weight: 250 },
    ];
    for (const order of [sizes, [...sizes].reverse()]) {
      const { products, merged } = mapOfdDataset(dataset(order));
      expect(merged).toBe(1);
      expect(products).toHaveLength(1);
      expect(products[0]?.ean).toBe("6975337032878");
      expect(products[0]?.spoolWeightG).toBe(250);
      expect(products[0]?.movedFrom).toHaveLength(1);
    }
  });

  it("treats spool_refill:true like a refill container", () => {
    const { products } = mapOfdDataset(dataset([{ spool_refill: true }, { empty_spool_weight: 200 }]));
    expect(products[0]?.ofdUuid).toBe("u1");
  });

  it("is only discontinued when every merged row is", () => {
    const { products } = mapOfdDataset(dataset([{ discontinued: true }, { spool_refill: true }]));
    expect(products[0]?.discontinued).toBe(false);
  });

  it("skips rows with broken references or values", () => {
    const { products, invalid } = mapOfdDataset(
      dataset([{ variant_id: "missing" }, { filament_weight: 0 }, { diameter: 0.4 }, {}]),
    );
    expect(invalid).toBe(3);
    expect(products).toHaveLength(1);
  });

  it("skips colours that are not #rrggbb", () => {
    const { invalid } = mapOfdDataset(
      dataset([{}], { variants: [{ id: "v1", name: "Rainbow", color_hex: "multi", filament_id: "f1" }] }),
    );
    expect(invalid).toBe(1);
  });
});

function product(overrides: Partial<CatalogProduct> = {}): CatalogProduct {
  return {
    ofdUuid: "u1",
    movedFrom: [],
    brandName: "Bambu Lab",
    productLine: "PLA Basic",
    material: "PLA",
    colorName: "Black",
    colorHex: "#000000",
    diameterUm: 1750,
    netWeightG: 1000,
    spoolWeightG: 250,
    ean: null,
    barcodes: [],
    discontinued: false,
    ...overrides,
  };
}

function row(overrides: Partial<ExistingProduct> = {}): ExistingProduct {
  return {
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
    spoolWeightG: 250,
    ean: null,
    discontinued: false,
    ...overrides,
  };
}

describe("planCatalogSync", () => {
  it("creates what is new and leaves identical rows alone", () => {
    const plan = planCatalogSync([row()], [product(), product({ ofdUuid: "u2", colorName: "White" })]);
    expect(plan.unchanged).toBe(1);
    expect(plan.create.map((p) => p.ofdUuid)).toEqual(["u2"]);
    expect(plan.update).toEqual([]);
  });

  it("updates OFD rows that changed upstream", () => {
    const plan = planCatalogSync([row({ colorHex: "#111111" })], [product()]);
    expect(plan.update).toEqual([{ id: "p1", product: product() }]);
  });

  it("follows moved_from to the existing row", () => {
    const plan = planCatalogSync([row({ ofdUuid: "old" })], [product({ ofdUuid: "new", movedFrom: ["old"] })]);
    expect(plan.create).toEqual([]);
    expect(plan.update[0]?.id).toBe("p1");
    expect(plan.update[0]?.product.ofdUuid).toBe("new");
  });

  it("only links a user-typed product with the same identity, never overwrites it", () => {
    const typed = row({ id: "mine", ofdUuid: null, ofdManaged: false, colorHex: "#222222", spoolWeightG: null });
    const plan = planCatalogSync([typed], [product()]);
    expect(plan.link).toEqual([{ id: "mine", ofdUuid: "u1" }]);
    expect(plan.update).toEqual([]);
    expect(plan.create).toEqual([]);
  });

  it("keeps a linked user row as it is on later runs, but follows a UUID rename", () => {
    const linked = row({ id: "mine", ofdManaged: false, colorHex: "#222222" });
    expect(planCatalogSync([linked], [product()])).toMatchObject({ update: [], link: [], unchanged: 1 });
    const renamed = planCatalogSync([linked], [product({ ofdUuid: "u9", movedFrom: ["u1"] })]);
    expect(renamed.link).toEqual([{ id: "mine", ofdUuid: "u9" }]);
    expect(renamed.update).toEqual([]);
  });

  it("does not move an OFD row onto another row's identity", () => {
    const plan = planCatalogSync(
      [row(), row({ id: "mine", ofdUuid: null, ofdManaged: false, colorName: "White" })],
      [product({ colorName: "White" })],
    );
    expect(plan.conflicts).toBe(1);
    expect(plan.update).toEqual([]);
  });

  it("never creates the same identity twice in one run", () => {
    const plan = planCatalogSync([], [product(), product({ ofdUuid: "u2" })]);
    expect(plan.create).toHaveLength(1);
    expect(plan.conflicts).toBe(1);
  });

  it("is empty on a second run over its own result", () => {
    const incoming = [product(), product({ ofdUuid: "u2", colorName: "White" })];
    const first = planCatalogSync([], incoming);
    const stored = first.create.map((p, i) =>
      row({ ...p, id: `p${i}`, brandKey: p.brandName.toLowerCase() }),
    );
    const second = planCatalogSync(stored, incoming);
    expect(second).toEqual({ create: [], update: [], link: [], unchanged: 2, conflicts: 0 });
  });
});

describe("colorSearchTerms", () => {
  it("adds the English colour for German words", () => {
    expect(colorSearchTerms("Schwarz")).toEqual(["Schwarz", "black"]);
    expect(colorSearchTerms("Matte")).toEqual(["Matte"]);
    expect(colorSearchTerms("orange")).toEqual(["orange"]);
  });
});
