"use server";

import { CatalogReleaseSuspiciousError, fetchOfdDataset, fetchSpoolmanDb, syncCatalog, type SyncReport } from "@spoolworks/catalog";
import { generateShareToken, RESET_LINK_TTL_SECONDS, resetLinkInput } from "@spoolworks/core";
import { prisma } from "@spoolworks/database";
import { notFound } from "next/navigation";

import { fieldErrorsFrom, formToObject, type ActionState } from "@/lib/action-state";
import { catalogSyncByHand, requireAdmin } from "@/lib/admin";
import { auth } from "@/lib/auth";
import { dropOtherResetTokens, RESET_PREFIX } from "@/lib/reset-tokens";

/**
 * Creates a one-time password reset link for an account, in the same form
 * Better Auth's own reset flow stores it, so /auth/reset can redeem it with
 * authClient.resetPassword. Returns only the path; the page adds its origin,
 * because the link must point at the deployment whose database holds the token.
 * Older links for the same account stop working.
 */
export async function createResetLink(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin("/admin");
  const parsed = resetLinkInput.safeParse(formToObject(formData));
  if (!parsed.success) {
    return { ok: false, error: "invalid_input", fieldErrors: fieldErrorsFrom(parsed.error) };
  }

  const user = await prisma.user.findUnique({ where: { email: parsed.data.email }, select: { id: true } });
  if (!user) return { ok: false, error: "invalid_input", fieldErrors: { email: "account_not_found" } };

  await dropOtherResetTokens(user.id);
  const token = generateShareToken();
  const ctx = await auth.$context;
  await ctx.internalAdapter.createVerificationValue({
    identifier: `${RESET_PREFIX}${token}`,
    value: user.id,
    expiresAt: new Date(Date.now() + RESET_LINK_TTL_SECONDS * 1000),
  });
  return { ok: true, text: `/auth/reset?token=${token}` };
}

export type CatalogSyncResult =
  | { ok: true; report: SyncReport & { seconds: number } }
  | { ok: false; error: "sync_failed" | "sync_suspicious" };

/**
 * Runs the nightly catalog sync on demand, for previews and local development
 * (their databases get no cron). Production answers 404 like a foreign admin:
 * it syncs every night, and a hand-started run there is not worth the risk.
 */
export async function syncCatalogNow(): Promise<CatalogSyncResult> {
  await requireAdmin("/admin");
  if (!catalogSyncByHand()) notFound();
  const started = Date.now();
  try {
    const [data, spoolman] = await Promise.all([fetchOfdDataset(), fetchSpoolmanDb()]);
    const report = await syncCatalog(prisma, data, { spoolman });
    return { ok: true, report: { ...report, seconds: Math.round((Date.now() - started) / 1000) } };
  } catch (error) {
    console.error("manual catalog sync failed", error instanceof Error ? error.message : error);
    return { ok: false, error: error instanceof CatalogReleaseSuspiciousError ? "sync_suspicious" : "sync_failed" };
  }
}
