/**
 * Imports the Open Filament Database into the product catalog.
 *
 *   pnpm --filter @spoolworks/catalog-sync sync              # local database from the root .env
 *   pnpm --filter @spoolworks/catalog-sync sync --dry-run    # only report what would change
 *   pnpm --filter @spoolworks/catalog-sync sync --file all.json.gz [--allow-shrink]
 *
 * A remote database (Neon) additionally needs --allow-remote, so a stray .env
 * never writes to production by accident. A release much smaller than the
 * imported catalog is refused unless --allow-shrink (for hand-picked files).
 * The same sync runs nightly on Vercel (apps/web, /api/cron/catalog).
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import { parseArgs } from "node:util";
import { gunzipSync } from "node:zlib";

import type { OfdDataset } from "@spoolworks/core";
import { config } from "dotenv";

config({ path: path.resolve(import.meta.dirname, "../../../.env"), quiet: true });

const { values } = parseArgs({
  options: {
    "dry-run": { type: "boolean", default: false },
    "allow-remote": { type: "boolean", default: false },
    "allow-shrink": { type: "boolean", default: false },
    file: { type: "string" },
  },
});

function isLocal(url: string): boolean {
  try {
    return ["localhost", "127.0.0.1", "[::1]"].includes(new URL(url).hostname);
  } catch {
    return false;
  }
}

async function main() {
  const url = process.env["DATABASE_URL"] ?? "";
  if (!isLocal(url) && !values["allow-remote"]) {
    throw new Error("DATABASE_URL is not local. Pass --allow-remote to import into a remote database.");
  }

  // Import after the env check: the client connects on load.
  const { prisma } = await import("@spoolworks/database");
  const { fetchOfdDataset, syncCatalog } = await import("@spoolworks/catalog");

  const data: OfdDataset = values.file
    ? (JSON.parse(
        (values.file.endsWith(".gz")
          ? gunzipSync(await readFile(values.file))
          : await readFile(values.file)
        ).toString("utf8"),
      ) as OfdDataset)
    : await fetchOfdDataset();

  const started = Date.now();
  const report = await syncCatalog(prisma, data, { dryRun: values["dry-run"], allowShrink: values["allow-shrink"] });
  console.log(JSON.stringify({ ...report, seconds: Math.round((Date.now() - started) / 1000) }, null, 2));
  await prisma.$disconnect();
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
