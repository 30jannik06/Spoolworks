import "server-only";

import { RESET_LINK_TTL_SECONDS } from "@spoolworks/core";
import { prisma } from "@spoolworks/database";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { createAuthMiddleware } from "better-auth/api";
import { nextCookies } from "better-auth/next-js";

import {
  mailConfigured,
  passwordChangedMail,
  resetPasswordMail,
  sendMail,
  supportEmail,
} from "@/lib/mail";
import { dropOtherResetTokens } from "@/lib/reset-tokens";

type MailUser = { id: string; email: string; name: string };

/**
 * "Your password was changed" to the account's own address, after a reset or
 * a change, so a stranger setting a password does not go unnoticed. The link
 * back uses the origin of the request (production, preview or localhost).
 */
async function notifyPasswordChanged(user: MailUser, request?: Request) {
  const origin = request?.url ? new URL(request.url).origin : (process.env.BETTER_AUTH_URL ?? null);
  try {
    await sendMail(passwordChangedMail(user.email, user.name, origin, supportEmail()));
  } catch (error) {
    // The password is already changed; a lost notice must not turn that into an error.
    console.error("mail: password notice not sent", error instanceof Error ? error.message : error);
  }
}

/**
 * Better Auth server instance. Used by the route handler at /api/auth/[...all]
 * and by lib/session.ts. Never import from a client component; use
 * lib/auth-client.ts there.
 */
export const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: "postgresql" }),

  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
    minPasswordLength: 8,
    resetPasswordTokenExpiresIn: RESET_LINK_TTL_SECONDS,
    revokeSessionsOnPasswordReset: true,
    // With SMTP configured (lib/mail.ts) "Passwort vergessen" mails the link.
    // Without it there is no sendResetPassword, the public reset request
    // refuses with RESET_PASSWORD_DISABLED, and resets go through the support
    // address and a link an admin makes on /admin (app/admin/actions.ts).
    ...(mailConfigured()
      ? {
          sendResetPassword: async ({ user, url, token }: { user: MailUser; url: string; token: string }) => {
            // Only the newest link works, like the ones made on /admin.
            await dropOtherResetTokens(user.id, token);
            await sendMail(resetPasswordMail(user.email, user.name, url));
          },
          onPasswordReset: async ({ user }: { user: MailUser }, request?: Request) => {
            await notifyPasswordChanged(user, request);
          },
        }
      : {}),
  },

  // Change-password has no callback of its own: notify after a successful one.
  hooks: {
    after: createAuthMiddleware(async (ctx) => {
      if (ctx.path !== "/change-password" || !mailConfigured()) return;
      const returned = ctx.context.returned;
      if (!returned || returned instanceof Error || !("user" in (returned as object))) return;
      await notifyPasswordChanged((returned as { user: MailUser }).user, ctx.request);
    }),
  },

  user: {
    // Confirmed with the password in settings. Deleting the user cascades to
    // the workshop and everything that hangs off it (see schema.prisma).
    deleteUser: { enabled: true },
  },

  session: {
    expiresIn: 60 * 60 * 24 * 30, // 30 days: she logs in once on her phone
    updateAge: 60 * 60 * 24,
  },

  databaseHooks: {
    user: {
      create: {
        // Every account gets its own workshop, the tenant all data hangs off.
        // lib/session.ts upserts as well, so a failure here self-heals.
        after: async (user) => {
          await prisma.workshop.upsert({
            where: { ownerId: user.id },
            update: {},
            create: { ownerId: user.id },
          });
        },
      },
    },
  },

  // Lets server actions set cookies. Must stay the last plugin.
  plugins: [nextCookies()],
});

export type Session = typeof auth.$Infer.Session;
