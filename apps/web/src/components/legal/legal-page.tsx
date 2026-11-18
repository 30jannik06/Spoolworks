import type { ReactNode } from "react";

import type { Imprint } from "@/lib/legal";
import { de } from "@/messages/de";

/** Plain reading column for the imprint and the privacy policy. */
export function LegalPage({ title, children }: { title: string; children: ReactNode }) {
  return (
    <article className="mx-auto w-full max-w-2xl space-y-8 px-4 py-10 md:py-16">
      <h1 className="text-2xl font-medium tracking-tight md:text-3xl">{title}</h1>
      <div className="space-y-8 text-sm leading-relaxed">{children}</div>
      <p className="text-xs text-muted-foreground">{de.legal.updated}</p>
    </article>
  );
}

export function LegalSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-2">
      <h2 className="text-base font-medium">{title}</h2>
      {children}
    </section>
  );
}

/** Name, address and contact, or a visible gap while the env is not set. */
export function ProviderBlock({ provider }: { provider: Imprint | null }) {
  if (!provider) {
    return <p className="text-muted-foreground">{de.legal.missing}</p>;
  }
  return (
    <address className="not-italic">
      {provider.name}
      {provider.address.length > 0 ? (
        provider.address.map((line) => (
          <span key={line} className="block">
            {line}
          </span>
        ))
      ) : (
        <span className="block text-muted-foreground">{de.legal.addressMissing}</span>
      )}
      {provider.email && (
        <span className="mt-2 block">
          {de.legal.emailLabel}{" "}
          <a href={`mailto:${provider.email}`} className="underline underline-offset-4">
            {provider.email}
          </a>
        </span>
      )}
    </address>
  );
}
