import type { MetadataRoute } from "next";

import { siteOrigin } from "@/lib/site-origin";

/** The pages anyone may find: landing, sign-up and the legal pages. Nothing per user. */
export default function sitemap(): MetadataRoute.Sitemap {
  const origin = siteOrigin();
  return [
    { url: `${origin}/`, changeFrequency: "monthly", priority: 1 },
    { url: `${origin}/auth/register`, changeFrequency: "yearly", priority: 0.5 },
    { url: `${origin}/impressum`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${origin}/datenschutz`, changeFrequency: "yearly", priority: 0.2 },
  ];
}
