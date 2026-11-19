/**
 * The public origin for robots.txt and the sitemap: production's domain on
 * Vercel (VERCEL_PROJECT_PRODUCTION_URL, the shortest production domain, i.e.
 * spoolworks.de), localhost otherwise. Build-time env only, no request.
 */
export function siteOrigin(): string {
  const production = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  return production ? `https://${production}` : "http://localhost:3000";
}

/** Only the production deployment may be crawled; previews and local dev never. */
export function isProductionDeployment(): boolean {
  return process.env.VERCEL_ENV === "production";
}
