import type { OfdDataset } from "@spoolworks/core";
import type { PrismaClient } from "@spoolworks/database";

import { CatalogReleaseSuspiciousError, fetchOfdDataset, fetchSpoolmanDb, syncCatalog, type SyncReport } from "./sync";

export type CatalogSyncTrigger = "CRON" | "MANUAL";

type Sources = { data: OfdDataset; spoolman: unknown[] | null };

async function download(): Promise<Sources> {
  const [data, spoolman] = await Promise.all([fetchOfdDataset(), fetchSpoolmanDb()]);
  return { data, spoolman };
}

/**
 * Downloads OFD and SpoolmanDB, syncs the catalog and records the outcome as
 * a CatalogSyncRun, success or failure. Rethrows a failure after recording
 * it. A failure to record never fails a sync that worked. `load` and `sync`
 * are for tests.
 */
export async function runCatalogSync(
  prisma: PrismaClient,
  trigger: CatalogSyncTrigger,
  {
    load = download,
    sync = {},
  }: { load?: () => Promise<Sources>; sync?: { dryRun?: boolean; allowShrink?: boolean } } = {},
): Promise<SyncReport> {
  const startedAt = new Date();
  const durationMs = () => Date.now() - startedAt.getTime();
  try {
    const { data, spoolman } = await load();
    const report = await syncCatalog(prisma, data, { ...sync, spoolman });
    await record(prisma, { trigger, startedAt, durationMs: durationMs(), ok: true, report });
    return report;
  } catch (error) {
    await record(prisma, {
      trigger,
      startedAt,
      durationMs: durationMs(),
      ok: false,
      suspicious: error instanceof CatalogReleaseSuspiciousError,
      error: (error instanceof Error ? error.message : String(error)).slice(0, 500),
    });
    throw error;
  }
}

async function record(
  prisma: PrismaClient,
  run: {
    trigger: CatalogSyncTrigger;
    startedAt: Date;
    durationMs: number;
    ok: boolean;
    report?: SyncReport;
    suspicious?: boolean;
    error?: string;
  },
) {
  try {
    await prisma.catalogSyncRun.create({ data: run });
  } catch (error) {
    console.error("catalog sync run not recorded", error instanceof Error ? error.message : error);
  }
}
