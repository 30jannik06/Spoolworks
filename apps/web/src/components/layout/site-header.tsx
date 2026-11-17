import Link from "next/link";
import { Suspense } from "react";

import { SignOutButton } from "@/components/auth/sign-out-button";
import { Button } from "@/components/ui/button";
import { getSession } from "@/lib/session";
import { de } from "@/messages/de";

/** Static shell; only the session-dependent part streams in. */
export function SiteHeader() {
  return (
    <header className="border-b">
      <div className="mx-auto flex h-14 w-full max-w-2xl items-center justify-between px-4">
        <Link href="/" className="flex min-h-11 items-center font-semibold">
          {de.app.name}
        </Link>
        <Suspense fallback={null}>
          <HeaderSession />
        </Suspense>
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
    <Button asChild variant="ghost" className="h-11 px-4">
      <Link href="/auth/login">{de.nav.signIn}</Link>
    </Button>
  );
}
