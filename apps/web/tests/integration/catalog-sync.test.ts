import { CatalogReleaseSuspiciousError, runCatalogSync } from "@spoolworks/catalog";
import type { OfdDataset } from "@spoolworks/core";
import { prisma } from "@spoolworks/database";
import { afterEach, describe, expect, it } from "vitest";

/**
 * runCatalogSync records every run. Dry runs only: the local catalog stays as it is.
 * Rows created here are deleted by id afterwards.
 */

const created: string[] = [];
afterEach(async () => {
  await prisma.catalogSyncRun.deleteMany({ where: { id: { in: created.splice(0) } } });
});

async function newestRun(since: Date) {
  const run = await prisma.catalogSyncRun.findFirst({ where: { startedAt: { gte: since } }, orderBy: { startedAt: "desc" } });
  if (run) created.push(run.id);
  return run;
}

const tiny: OfdDataset = {
  version: "test-run",
  brands: [{ id: "b", name: "Run Test Brand" }],
  filaments: [{ id: "f", name: "PLA Run", brand_id: "b", material: "PLA" }],
  variants: [{ id: "v", name: "Black", color_hex: "#000000", filament_id: "f" }],
  sizes: [{ id: "s", uuid: "run-test-uuid", variant_id: "v", filament_weight: 1000, diameter: 1.75 }],
};

describe("runCatalogSync", () => {
  it("records a successful run with its report", async () => {
    const since = new Date();
    const report = await runCatalogSync(prisma, "MANUAL", {
      load: async () => ({ data: tiny, spoolman: null }),
      sync: { dryRun: true, allowShrink: true },
    });
    const run = await newestRun(since);
    expect(run).toMatchObject({ trigger: "MANUAL", ok: true, suspicious: false, error: null });
    expect(run?.report).toMatchObject({ version: "test-run", products: 1, dryRun: true, spoolman: "unavailable" });
    expect(report.version).toBe("test-run");
  });

  it("records a truncated release as suspicious and rethrows", async () => {
    const since = new Date();
    await expect(
      runCatalogSync(prisma, "CRON", { load: async () => ({ data: { ...tiny, sizes: [] }, spoolman: null }) }),
    ).rejects.toBeInstanceOf(CatalogReleaseSuspiciousError);
    const run = await newestRun(since);
    expect(run).toMatchObject({ trigger: "CRON", ok: false, suspicious: true, report: null });
    expect(run?.error).toMatch(/no products/);
  });

  it("records a failed download", async () => {
    const since = new Date();
    await expect(
      runCatalogSync(prisma, "CRON", {
        load: async () => {
          throw new Error("OFD download failed: 503");
        },
      }),
    ).rejects.toThrow("503");
    expect(await newestRun(since)).toMatchObject({ ok: false, suspicious: false, error: "OFD download failed: 503" });
  });
});
