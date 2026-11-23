import { describe, expect, it } from "vitest";

import { jsonLdScript, landingJsonLd, publicPageMetadata } from "./seo";

describe("publicPageMetadata", () => {
  it("sets canonical and a full preview title", () => {
    const meta = publicPageMetadata({ title: "Impressum", description: "Wer betreibt die Seite", path: "/impressum" });
    expect(meta.alternates?.canonical).toBe("/impressum");
    expect(meta.openGraph).toMatchObject({
      title: "Impressum · SpoolWorks",
      description: "Wer betreibt die Seite",
      url: "/impressum",
      siteName: "SpoolWorks",
      locale: "de_DE",
    });
  });
});

describe("landingJsonLd", () => {
  it("names the site and links the app to it", () => {
    const [site, app] = landingJsonLd()["@graph"];
    expect(site).toMatchObject({ "@type": "WebSite", name: "SpoolWorks" });
    expect(app).toMatchObject({ "@type": "WebApplication", isPartOf: { "@id": site?.["@id"] } });
  });
});

describe("jsonLdScript", () => {
  it("cannot close the script tag", () => {
    expect(jsonLdScript({ a: "</script><script>alert(1)</script>" })).not.toContain("<");
  });
});
