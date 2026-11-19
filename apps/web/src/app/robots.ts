import type { MetadataRoute } from "next";

import { isProductionDeployment, siteOrigin } from "@/lib/site-origin";

/**
 * Production: the landing page and the legal pages are public; the app
 * behind the login, label codes and photos are not for crawlers. Shared
 * prints (/p) and galleries (/u) stay crawlable on purpose, so search engines
 * see their `noindex` instead of indexing a bare link. Previews and local dev
 * are closed completely (they have their own databases).
 */
export default function robots(): MetadataRoute.Robots {
  if (!isProductionDeployment()) return { rules: { userAgent: "*", disallow: "/" } };
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/admin",
        "/api/",
        "/photos/",
        "/s/",
        "/labels",
        "/printers",
        "/prints",
        "/settings",
        "/spools",
        "/stats",
        "/weigh",
      ],
    },
    sitemap: `${siteOrigin()}/sitemap.xml`,
  };
}
