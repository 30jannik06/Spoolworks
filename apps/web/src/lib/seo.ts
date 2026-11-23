import type { Metadata } from "next";

import { siteOrigin } from "@/lib/site-origin";
import { de } from "@/messages/de";

/** Shared by the root layout and every page that sets its own preview. */
export const openGraphBase = { type: "website", locale: "de_DE", siteName: de.app.name } as const;

const previewImage = { url: "/opengraph-image", width: 1200, height: 630, alt: de.linkPreview.alt };

/**
 * Metadata for a public page: its own description, a canonical URL (five
 * domains point here, the canonical names spoolworks.de) and a link preview
 * that matches the search title. Next replaces a parent's openGraph instead
 * of merging it, so the base fields and the preview image (rendered by
 * app/opengraph-image.tsx, which only applies to "/" by itself) are repeated.
 */
export function publicPageMetadata({
  title,
  description,
  path,
}: {
  /** Page name; the layout template appends " · SpoolWorks" in the tab. */
  title: string;
  description: string;
  path: `/${string}`;
}): Metadata {
  const fullTitle = `${title} · ${de.app.name}`;
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: { ...openGraphBase, title: fullTitle, description, url: path, images: [previewImage] },
  };
}

/** schema.org data for the landing page: the site name Google shows, and what the app is. */
export function landingJsonLd() {
  const url = `${siteOrigin()}/`;
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": `${url}#website`,
        name: de.app.name,
        alternateName: de.seo.alternateName,
        url,
        inLanguage: "de",
      },
      {
        "@type": "WebApplication",
        name: de.app.name,
        url,
        description: de.app.description,
        applicationCategory: "UtilitiesApplication",
        operatingSystem: "Web",
        inLanguage: "de",
        isAccessibleForFree: true,
        offers: { "@type": "Offer", price: "0", priceCurrency: "EUR" },
        isPartOf: { "@id": `${url}#website` },
      },
    ],
  };
}

/** Serialises JSON-LD for a <script> tag; escapes "<" so no string can close the tag. */
export function jsonLdScript(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
