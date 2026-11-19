import "server-only";

import { isAdminEmail, parseAdminEmails } from "@spoolworks/core";
import { notFound } from "next/navigation";

import { requireWorkshop } from "@/lib/session";

/** True if this address is listed in ADMIN_EMAILS (server env, never shipped to the client). */
export function isAdmin(email: string | null | undefined): boolean {
  return isAdminEmail(email, parseAdminEmails(process.env.ADMIN_EMAILS));
}

/** The manual catalog sync exists everywhere except production (which has the nightly cron). */
export function catalogSyncByHand(): boolean {
  return process.env.VERCEL_ENV !== "production";
}

/**
 * For admin pages and actions: signed in and listed in ADMIN_EMAILS, otherwise
 * 404 (the admin area does not exist for anyone else). Reads the request.
 */
export async function requireAdmin(next?: string) {
  const caller = await requireWorkshop(next);
  if (!isAdmin(caller.user.email)) notFound();
  return caller;
}
