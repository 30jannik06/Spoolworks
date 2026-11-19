import type { OfdDataset } from "@spoolworks/core";
import { prisma } from "@spoolworks/database";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { CatalogReleaseSuspiciousError, syncCatalog } from "../src";

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

    const report = await syncCatalog(prisma, dataset(), { allowShrink: true });
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
    const report = await syncCatalog(prisma, dataset(), { allowShrink: true });
    expect(report).toMatchObject({ created: 0, updated: 0, linked: 0, conflicts: 0 });
    expect(await products()).toEqual(before);
  });

  it("updates an imported product when OFD changes it", async () => {
    const report = await syncCatalog(prisma, dataset("#202020"), { allowShrink: true });
    expect(report).toMatchObject({ created: 0, updated: 1, linked: 0 });
    const black = (await products()).find((r) => r.colorName === "Black");
    expect(black?.colorHex).toBe("#202020");
  });

  it("reports without writing in a dry run", async () => {
    const before = await products();
    const report = await syncCatalog(prisma, dataset("#303030"), { dryRun: true, allowShrink: true });
    expect(report).toMatchObject({ updated: 1, dryRun: true });
    expect(await products()).toEqual(before);
  });

  it("refuses a release far smaller than the imported catalog, before writing anything", async () => {
    // Ten imported products of the test brand, so the check has something to compare against.
    const brand = await prisma.brand.findFirstOrThrow({ where: { nameKey: KEY } });
    await prisma.filamentProduct.createMany({
      data: Array.from({ length: 10 }, (_, i) => ({
        brandId: brand.id,
        ofdUuid: `zz-test-extra-${i}`,
        ofdManaged: true,
        productLine: "PLA Extra",
        material: "PLA" as const,
        colorName: `Extra ${i}`,
        colorHex: "#123456",
        netWeightG: 1000,
      })),
    });
    const before = await products();
    await expect(syncCatalog(prisma, dataset("#404040"))).rejects.toThrow(CatalogReleaseSuspiciousError);
    expect(await products()).toEqual(before);
  });

  it("refuses an empty release even when shrinking is allowed", async () => {
    const empty: OfdDataset = { version: "empty", brands: [], filaments: [], variants: [], sizes: [] };
    await expect(syncCatalog(prisma, empty, { allowShrink: true })).rejects.toThrow(CatalogReleaseSuspiciousError);
  });

  it("fills a missing empty-spool weight from SpoolmanDB and keeps it when SpoolmanDB is unreachable", async () => {
    const withGap: OfdDataset = {
      ...dataset("#404040"),
      sizes: [{ id: "s3", uuid: "zz-test-u3", variant_id: "v1", filament_weight: 500, diameter: 1.75 }],
    };
    const spoolman = [{ manufacturer: BRAND, material: "PLA", weight: 500, diameter: 1.75, spool_weight: 190 }];
    const filled = await syncCatalog(prisma, withGap, { allowShrink: true, spoolman });
    expect(filled).toMatchObject({ created: 1, spoolman: 1 });
    const find = () => prisma.filamentProduct.findUniqueOrThrow({ where: { ofdUuid: "zz-test-u3" } });
    expect((await find()).spoolWeightG).toBe(190);

    const without = await syncCatalog(prisma, withGap, { allowShrink: true });
    expect(without).toMatchObject({ updated: 0, spoolman: "unavailable" });
    expect((await find()).spoolWeightG).toBe(190);
  });
});
