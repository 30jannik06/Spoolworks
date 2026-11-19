import { timingSafeEqual } from "node:crypto";

import { CatalogReleaseSuspiciousError, fetchOfdDataset, syncCatalog } from "@spoolworks/catalog";
import { prisma } from "@spoolworks/database";
import { connection } from "next/server";

/**
 * Nightly import of the Open Filament Database (vercel.json `crons`, free on
 * Hobby: once a day). Vercel calls it with `Authorization: Bearer
 * $CRON_SECRET`; without that secret configured the route does not exist.
 * The sync never deletes, refuses truncated releases before writing, and
 * leaves products users typed in alone, so a failed night just means the
 * catalog stays as it was until the next one.
 */
export const maxDuration = 300;

function authorized(request: Request, secret: string) {
  const given = Buffer.from(request.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${secret}`);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

export async function GET(request: Request) {
  await connection();
  const secret = process.env.CRON_SECRET;
  if (!secret) return new Response("Not found", { status: 404 });
  if (!authorized(request, secret)) return new Response("Unauthorized", { status: 401 });

  const started = Date.now();
  try {
    const data = await fetchOfdDataset();
    const report = await syncCatalog(prisma, data);
    const result = { ok: true, ms: Date.now() - started, ...report };
    console.log("catalog sync", JSON.stringify(result));
    return Response.json(result);
  } catch (error) {
    const suspicious = error instanceof CatalogReleaseSuspiciousError;
    const message = error instanceof Error ? error.message : String(error);
    console.error("catalog sync failed", JSON.stringify({ suspicious, message, ms: Date.now() - started }));
    return Response.json({ ok: false, suspicious }, { status: 500 });
  }
}
