import type { OfdDataset } from "@spoolworks/core";
import { prisma } from "@spoolworks/database";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { syncCatalog } from "../src/sync";

// A brand no real catalog has, so the test never touches imported data.
const BRAND = "Zz Sync Test Brand";
const KEY = BRAND.toLowerCase();

function dataset(colorHex = "#101010"): OfdDataset {
  return {
    version: "test",
    brands: [{ id: "b", name: BRAND }],
    filaments: [{ id: "f", name: "PLA Test", brand_id: "b", material: "PLA" }],
    variants: [
      { id: "v1", name: "Black", color_hex: colorHex, filament_id: "f" },
      { id: "v2", name: "White", color_hex: "#fafafa", filament_id: "f" },
    ],
    sizes: [
      { id: "s1", uuid: "zz-test-u1", variant_id: "v1", filament_weight: 1000, diameter: 1.75, empty_spool_weight: 250 },
      { id: "s1r", uuid: "zz-test-u1r", variant_id: "v1", filament_weight: 1000, diameter: 1.75, spool_refill: true },
      { id: "s2", uuid: "zz-test-u2", variant_id: "v2", filament_weight: 1000, diameter: 1.75, gtin: "06975337032878" },
    ],
  };
}

async function cleanup() {
  await prisma.filamentProduct.deleteMany({ where: { brand: { nameKey: KEY } } });
  await prisma.brand.deleteMany({ where: { nameKey: KEY } });
}

async function products() {
  return prisma.filamentProduct.findMany({
    where: { brand: { nameKey: KEY } },
    orderBy: { colorName: "asc" },
    select: { id: true, ofdUuid: true, colorName: true, colorHex: true, spoolWeightG: true, ean: true, createdById: true },
  });
}

describe("syncCatalog", () => {
  beforeAll(cleanup);
  afterAll(async () => {
    await cleanup();
    await prisma.$disconnect();
  });

  it("links a user-typed product without overwriting it, creates the rest", async () => {
    const brand = await prisma.brand.create({ data: { name: BRAND, nameKey: KEY } });
    const typed = await prisma.filamentProduct.create({
      data: {
        brandId: brand.id,
        productLine: "PLA Test",
        material: "PLA",
        colorName: "White",
        colorHex: "#eeeeee",
        netWeightG: 1000,
      },
    });

    const report = await syncCatalog(prisma, dataset());
    expect(report).toMatchObject({ created: 1, linked: 1, updated: 0, merged: 1 });

    const rows = await products();
    expect(rows).toHaveLength(2);
    const white = rows.find((r) => r.colorName === "White");
    expect(white).toMatchObject({ id: typed.id, ofdUuid: "zz-test-u2", colorHex: "#eeeeee", ean: null, spoolWeightG: null });
    const black = rows.find((r) => r.colorName === "Black");
    expect(black).toMatchObject({ ofdUuid: "zz-test-u1", colorHex: "#101010", spoolWeightG: 250, createdById: null });
  });

  it("changes nothing on a second run", async () => {
    const before = await products();
    const report = await syncCatalog(prisma, dataset());
    expect(report).toMatchObject({ created: 0, updated: 0, linked: 0, conflicts: 0 });
    expect(await products()).toEqual(before);
  });

  it("updates an imported product when OFD changes it", async () => {
    const report = await syncCatalog(prisma, dataset("#202020"));
    expect(report).toMatchObject({ created: 0, updated: 1, linked: 0 });
    const black = (await products()).find((r) => r.colorName === "Black");
    expect(black?.colorHex).toBe("#202020");
  });

  it("reports without writing in a dry run", async () => {
    const before = await products();
    const report = await syncCatalog(prisma, dataset("#303030"), { dryRun: true });
    expect(report).toMatchObject({ updated: 1, dryRun: true });
    expect(await products()).toEqual(before);
  });
});
