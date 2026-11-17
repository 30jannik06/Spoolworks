import "server-only";

import { prisma } from "@spoolworks/database";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";

import { auth } from "@/lib/auth";

/**
 * Data access entry point for "who is calling". Reads the request, so with
 * Cache Components every caller must render inside a <Suspense> boundary.
 * React's cache() dedupes the lookup within one request.
 */
export const getSession = cache(async () => {
  return auth.api.getSession({ headers: await headers() });
});

/** The workshop owned by this user. Creates it if missing (self-heals a failed sign-up hook). */
export const getWorkshopForUser = cache(async (userId: string) => {
  return prisma.workshop.upsert({
    where: { ownerId: userId },
    update: {},
    create: { ownerId: userId },
  });
});

/**
 * For pages and actions that need a signed-in user: returns user and workshop,
 * or redirects to the login page. Every server action must call this itself;
 * UI gating is cosmetic.
 */
export async function requireWorkshop(next?: string) {
  const session = await getSession();
  if (!session) {
    redirect(next ? `/auth/login?next=${encodeURIComponent(next)}` : "/auth/login");
  }
  const workshop = await getWorkshopForUser(session.user.id);
  return { user: session.user, workshop };
}
