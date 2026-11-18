"use server";

import { generateShareToken, RESET_LINK_TTL_SECONDS, resetLinkInput } from "@spoolworks/core";
import { prisma } from "@spoolworks/database";

import { fieldErrorsFrom, formToObject, type ActionState } from "@/lib/action-state";
import { requireAdmin } from "@/lib/admin";
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
