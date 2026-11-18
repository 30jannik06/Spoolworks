import type { Metadata } from "next";

import { LegalPage, LegalSection, ProviderBlock } from "@/components/legal/legal-page";
import { imprint } from "@/lib/legal";
import { de } from "@/messages/de";

const l = de.legal;

export const metadata: Metadata = { title: l.imprintTitle };

export default function ImprintPage() {
  return (
    <LegalPage title={l.imprintTitle}>
      <LegalSection title={l.imprintProvider}>
        <ProviderBlock provider={imprint()} />
      </LegalSection>
      <LegalSection title={l.imprintAboutTitle}>
        <p>{l.imprintAbout}</p>
      </LegalSection>
    </LegalPage>
  );
}
