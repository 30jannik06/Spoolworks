import Link from "next/link";

import { cn } from "@/lib/utils";
import { de } from "@/messages/de";

const SOURCE_URL = "https://github.com/30jannik06/Spoolworks";

/** Imprint, privacy and source links, for every footer and the auth pages. */
export function LegalLinks({ className }: { className?: string }) {
  return (
    <nav aria-label={de.legal.navLabel} className={cn("flex flex-wrap gap-x-4 text-sm text-muted-foreground", className)}>
      <Link href="/impressum" className="inline-flex min-h-11 items-center underline-offset-4 hover:text-foreground hover:underline">
        {de.legal.imprintTitle}
      </Link>
      <Link href="/datenschutz" className="inline-flex min-h-11 items-center underline-offset-4 hover:text-foreground hover:underline">
        {de.legal.privacyTitle}
      </Link>
      {/* AGPL-3.0: the running app points to its source. */}
      <a href={SOURCE_URL} className="inline-flex min-h-11 items-center underline-offset-4 hover:text-foreground hover:underline">
        {de.legal.sourceTitle}
      </a>
    </nav>
  );
}
