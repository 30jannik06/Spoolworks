import Link from "next/link";

import { cn } from "@/lib/utils";
import { de } from "@/messages/de";

const LINKS = [
  { href: "/impressum", label: de.legal.imprintTitle },
  { href: "/datenschutz", label: de.legal.privacyTitle },
  { href: "/nutzungsbedingungen", label: de.legal.termsTitle },
] as const;

/** Imprint, privacy and terms, for every footer and the auth pages. The source link lives in the imprint. */
export function LegalLinks({ className }: { className?: string }) {
  return (
    <nav aria-label={de.legal.navLabel} className={cn("flex flex-wrap gap-x-4 text-sm text-muted-foreground", className)}>
      {LINKS.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className="inline-flex min-h-11 items-center underline-offset-4 hover:text-foreground hover:underline"
        >
          {link.label}
        </Link>
      ))}
    </nav>
  );
}
