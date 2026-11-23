import type { Metadata } from "next";

import { LegalPage, LegalSection, ProviderBlock } from "@/components/legal/legal-page";
import { imprint, SOURCE_URL } from "@/lib/legal";
import { publicPageMetadata } from "@/lib/seo";
import { de } from "@/messages/de";

const l = de.legal;

export const metadata: Metadata = publicPageMetadata({
  title: l.imprintTitle,
  description: de.seo.imprintDescription,
  path: "/impressum",
});

export default function ImprintPage() {
  return (
    <LegalPage title={l.imprintTitle}>
      <LegalSection title={l.imprintProvider}>
        <ProviderBlock provider={imprint()} />
      </LegalSection>
      <LegalSection title={l.imprintAboutTitle}>
        <p>{l.imprintAbout}</p>
        <p>
          {l.sourceNote}{" "}
          <a href={SOURCE_URL} className="underline underline-offset-4">
            {l.sourceLink}
          </a>
        </p>
      </LegalSection>
    </LegalPage>
  );
}
