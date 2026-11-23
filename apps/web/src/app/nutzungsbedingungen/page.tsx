import type { Metadata } from "next";

import { LegalPage, LegalSection, ProviderBlock } from "@/components/legal/legal-page";
import { imprint } from "@/lib/legal";
import { publicPageMetadata } from "@/lib/seo";
import { de } from "@/messages/de";

const l = de.legal;

export const metadata: Metadata = publicPageMetadata({
  title: l.termsTitle,
  description: de.seo.termsDescription,
  path: "/nutzungsbedingungen",
});

/** Terms of use, accepted at sign-up (note under the register form). */
export default function TermsPage() {
  return (
    <LegalPage title={l.termsTitle}>
      <LegalSection title={l.termsProviderTitle}>
        <ProviderBlock provider={imprint()} />
      </LegalSection>
      {l.termsSections.map((section) => (
        <LegalSection key={section.title} title={section.title}>
          {section.body.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
          {"links" in section && (
            <ul className="space-y-1">
              {section.links.map((link) => (
                <li key={link.href}>
                  <a href={link.href} className="underline underline-offset-4">
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </LegalSection>
      ))}
    </LegalPage>
  );
}
