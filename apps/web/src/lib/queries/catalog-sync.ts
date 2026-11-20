import "server-only";

import type { CatalogSyncTrigger, SyncReport } from "@spoolworks/catalog";
import { prisma } from "@spoolworks/database";

/** A nightly run counts as overdue once the last good one is older than this. */
const CRON_OVERDUE_MS = 36 * 60 * 60 * 1000;

export type CatalogSyncRunView = {
  id: string;
  trigger: CatalogSyncTrigger;
  startedAt: Date;
  seconds: number;
  ok: boolean;
  suspicious: boolean;
  report: SyncReport | null;
  error: string | null;
};

/** The latest catalog sync runs of this environment, newest first. Global data, admins only. */
export async function listCatalogSyncRuns(take = 7): Promise<CatalogSyncRunView[]> {
  const rows = await prisma.catalogSyncRun.findMany({ orderBy: { startedAt: "desc" }, take });
  return rows.map((row) => ({
    id: row.id,
    trigger: row.trigger,
    startedAt: row.startedAt,
    seconds: Math.round(row.durationMs / 1000),
    ok: row.ok,
    suspicious: row.suspicious,
    report: row.report as SyncReport | null,
    error: row.error,
  }));
}

/** True when no nightly run has succeeded within the last 36 hours. */
export async function cronSyncOverdue(now = Date.now()): Promise<boolean> {
  const last = await prisma.catalogSyncRun.findFirst({
    where: { trigger: "CRON", ok: true },
    orderBy: { startedAt: "desc" },
    select: { startedAt: true },
  });
  return !last || now - last.startedAt.getTime() > CRON_OVERDUE_MS;
}
