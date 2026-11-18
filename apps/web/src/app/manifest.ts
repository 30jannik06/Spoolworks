import type { MetadataRoute } from "next";

import { de } from "@/messages/de";

/**
 * Web app manifest: "Zum Home-Bildschirm" opens SpoolWorks full screen with
 * its own icon. Icons are rendered from the SpoolMark glyph on the dark
 * background (public/icons); the maskable one keeps the glyph inside the
 * 80 % safe zone so Android's round and squircle masks never cut it.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: de.app.name,
    short_name: de.app.name,
    description: de.app.tagline,
    lang: "de",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#0e0e0d",
    theme_color: "#0e0e0d",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
