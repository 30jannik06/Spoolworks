import Link from "next/link";
import { Suspense } from "react";

import { SignOutButton } from "@/components/auth/sign-out-button";
import { TabBar } from "@/components/layout/tab-bar";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { Button } from "@/components/ui/button";
import { getSession } from "@/lib/session";
import { de } from "@/messages/de";

/** Static shell; only the session-dependent part streams in. */
export function SiteHeader() {
  return (
    <header className="sticky top-0 z-30 border-b bg-background/90 backdrop-blur">
      <div className="mx-auto flex h-14 w-full max-w-2xl items-center justify-between gap-2 px-4">
        <Link href="/" className="flex min-h-11 items-center gap-2 font-medium tracking-tight">
          <SpoolMark />
          {de.app.name}
        </Link>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Suspense fallback={null}>
            <HeaderSession />
          </Suspense>
        </div>
      </div>
    </header>
  );
}

async function HeaderSession() {
  const session = await getSession();
  if (session) {
    return <SignOutButton />;
  }
  return (
    <Button asChild variant="outline" className="h-11 px-4">
      <Link href="/auth/login">{de.nav.signIn}</Link>
    </Button>
  );
}

/** Bottom tab bar, only for signed-in users. */
export async function SessionTabBar() {
  const session = await getSession();
  return session ? <TabBar /> : null;
}

/** Wordmark glyph: a spool seen from the side, drawn with the accent colour. */
function SpoolMark() {
  return (
    <svg viewBox="0 0 24 24" className="size-6" aria-hidden="true">
      <circle cx="12" cy="12" r="9.5" fill="none" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
      <path
        d="M12 2.5a9.5 9.5 0 0 1 9.5 9.5"
        fill="none"
        stroke="var(--primary)"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <circle cx="12" cy="12" r="2.5" fill="currentColor" />
    </svg>
  );
}
