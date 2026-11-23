import type { Metadata } from "next";

import { LegalPage, LegalSection, ProviderBlock } from "@/components/legal/legal-page";
import { imprint } from "@/lib/legal";
import { publicPageMetadata } from "@/lib/seo";
import { de } from "@/messages/de";

const l = de.legal;

export const metadata: Metadata = publicPageMetadata({
  title: l.privacyTitle,
  description: de.seo.privacyDescription,
  path: "/datenschutz",
});

export default function PrivacyPage() {
  return (
    <LegalPage title={l.privacyTitle}>
      <LegalSection title={l.controllerTitle}>
        <ProviderBlock provider={imprint()} />
      </LegalSection>
      {l.privacySections.map((section) => (
        <LegalSection key={section.title} title={section.title}>
          {section.body.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
          {"links" in section && (
            <ul className="space-y-1">
              {section.links.map((link) => (
                <li key={link.href}>
                  <a href={link.href} target="_blank" rel="noreferrer" className="underline underline-offset-4">
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
