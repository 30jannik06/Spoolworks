import "server-only";

import { prisma } from "@spoolworks/database";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";

/**
 * Better Auth server instance. Used by the route handler at /api/auth/[...all]
 * and by lib/session.ts. Never import from a client component; use
 * lib/auth-client.ts there.
 */
export const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: "postgresql" }),

  emailAndPassword: {
    enabled: true,
    // TODO(auth): needs a mail provider (password reset, verification) before
    // the app opens to the public.
    requireEmailVerification: false,
    minPasswordLength: 8,
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
