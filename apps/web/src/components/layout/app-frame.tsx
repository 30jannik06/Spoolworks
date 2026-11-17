import { Settings } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { SignOutButton } from "@/components/auth/sign-out-button";
import { Sidebar } from "@/components/layout/sidebar";
import { SpoolMark } from "@/components/layout/spool-mark";
import { TabBar } from "@/components/layout/tab-bar";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { Button } from "@/components/ui/button";
import { getSession, getWorkshopForUser } from "@/lib/session";
import { de } from "@/messages/de";

/**
 * Picks the page frame from the session. Rendered inside a <Suspense> in the
 * root layout, because reading the session is request-time work.
 *
 * - Signed in: desktop sidebar (md+), compact top bar + bottom tab bar on phones.
 * - Guest: a regular top bar; pages (landing, auth) control their own width.
 */
export async function AppFrame({ children }: { children: ReactNode }) {
  const session = await getSession();
  if (!session) {
    return <GuestFrame>{children}</GuestFrame>;
  }
  const workshop = await getWorkshopForUser(session.user.id);

  return (
    <>
      <Sidebar userName={session.user.name} workshopName={workshop.name} />
      <header className="sticky top-0 z-30 border-b bg-background/90 backdrop-blur md:hidden">
        <div className="flex h-14 items-center justify-between gap-2 px-4">
          <Link href="/" className="flex min-h-11 items-center gap-2 font-medium tracking-tight">
            <SpoolMark />
            {de.app.name}
          </Link>
          <div className="flex items-center gap-2">
            <Link
              href="/settings"
              aria-label={de.nav.settings}
              className="flex size-11 items-center justify-center rounded-lg border text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              <Settings className="size-[18px]" aria-hidden="true" />
            </Link>
            <ThemeToggle />
            <SignOutButton />
          </div>
        </div>
      </header>
      <main className="pb-tabbar flex-1 px-4 pt-5 md:pb-12 md:pl-60">
        <div className="mx-auto w-full max-w-6xl md:px-10 md:pt-6">{children}</div>
      </main>
      <TabBar />
    </>
  );
}

function GuestFrame({ children }: { children: ReactNode }) {
  return (
    <>
      <header className="sticky top-0 z-30 border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-3 px-4 md:px-8">
          <Link href="/" className="flex min-h-11 items-center gap-2.5 font-medium tracking-tight">
            <SpoolMark />
            {de.app.name}
          </Link>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button asChild variant="ghost" className="hidden h-11 px-4 sm:inline-flex">
              <Link href="/auth/login">{de.nav.signIn}</Link>
            </Button>
            <Button asChild className="h-11 px-4">
              <Link href="/auth/register">{de.nav.signUp}</Link>
            </Button>
          </div>
        </div>
      </header>
      <main className="flex-1">{children}</main>
    </>
  );
}

/** Shown while the session is read: just the empty canvas, no layout jump to a wrong frame. */
export function AppFrameFallback() {
  return <div className="flex-1" />;
}
