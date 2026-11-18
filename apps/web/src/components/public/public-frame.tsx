import Link from "next/link";
import type { ReactNode } from "react";

import { LegalLinks } from "@/components/legal/legal-links";
import { SpoolMark } from "@/components/layout/spool-mark";
import { de } from "@/messages/de";

/**
 * Width and footer for public pages. The page frame around it (guest top bar
 * or the signed-in sidebar) still comes from AppFrame.
 */
export function PublicFrame({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-6xl space-y-10 px-4 py-6 md:px-8 md:py-10">
      {children}
      <footer className="flex flex-wrap items-center justify-between gap-3 border-t pt-5 text-sm text-muted-foreground">
        <span className="flex items-center gap-2">
          <SpoolMark />
          {de.publicPage.by}
        </span>
        <Link href="/" className="inline-flex min-h-11 items-center underline-offset-4 hover:text-foreground hover:underline">
          {de.publicPage.cta}
        </Link>
        <LegalLinks className="w-full" />
      </footer>
    </div>
  );
}
