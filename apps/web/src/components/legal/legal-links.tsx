import Link from "next/link";

import { cn } from "@/lib/utils";
import { de } from "@/messages/de";

/** Imprint and privacy links, for every footer and the auth pages. */
export function LegalLinks({ className }: { className?: string }) {
  return (
    <nav aria-label={de.legal.navLabel} className={cn("flex flex-wrap gap-x-4 text-sm text-muted-foreground", className)}>
      <Link href="/impressum" className="inline-flex min-h-11 items-center underline-offset-4 hover:text-foreground hover:underline">
        {de.legal.imprintTitle}
      </Link>
      <Link href="/datenschutz" className="inline-flex min-h-11 items-center underline-offset-4 hover:text-foreground hover:underline">
        {de.legal.privacyTitle}
      </Link>
    </nav>
  );
}
