import { z } from "zod";

/**
 * Account administration without a mail service: whoever forgot their
 * password writes to the support address, an admin creates a one-time reset
 * link and sends it by hand.
 */

/** Comma or whitespace separated list from ADMIN_EMAILS, lower-cased. Empty means nobody is admin. */
export function parseAdminEmails(value: string | undefined): Set<string> {
  return new Set(
    (value ?? "")
      .split(/[\s,;]+/)
      .map((email) => email.trim().toLowerCase())
      .filter((email) => email.includes("@")),
  );
}

export function isAdminEmail(email: string | null | undefined, admins: Set<string>): boolean {
  return !!email && admins.has(email.trim().toLowerCase());
}

/** Reset links expire after one hour, like Better Auth's own default. */
export const RESET_LINK_TTL_SECONDS = 60 * 60;

export const resetLinkInput = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .min(1, "required")
    .pipe(z.email({ message: "invalid_email" })),
});
