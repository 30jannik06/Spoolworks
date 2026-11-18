import "server-only";

import { prisma } from "@spoolworks/database";

/** Better Auth stores reset tokens as verification rows `reset-password:<token>` → user id. */
export const RESET_PREFIX = "reset-password:";

/**
 * Drops every open reset link of this user except `keepToken`, so only the
 * newest link works (mailed or made on /admin). Without `keepToken`, all go.
 */
export async function dropOtherResetTokens(userId: string, keepToken?: string): Promise<void> {
  await prisma.verification.deleteMany({
    where: {
      value: userId,
      identifier: { startsWith: RESET_PREFIX, ...(keepToken ? { not: `${RESET_PREFIX}${keepToken}` } : {}) },
    },
  });
}
