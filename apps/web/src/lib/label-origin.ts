import "server-only";

import { spoolLabelPath } from "@spoolworks/core";
import { headers } from "next/headers";

/**
 * The origin baked into printed labels and NFC tags. A label lives for years,
 * so it must point at production, also when printed from a preview deploy:
 * Vercel sets VERCEL_PROJECT_PRODUCTION_URL in every environment. Locally
 * there is none, so the request host is used and `production` is false
 * (the label page warns about it). Reads the request: render inside <Suspense>.
 */
export async function labelOrigin(): Promise<{
  origin: string;
  production: boolean;
}> {
  const production = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (production) return { origin: `https://${production}`, production: true };
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? "localhost:3000";
  const proto = requestHeaders.get("x-forwarded-proto") ?? (/^(localhost|127\.|\[::1\])/.test(host) ? "http" : "https");
  return { origin: `${proto}://${host}`, production: false };
}

export function spoolLabelUrl(origin: string, code: string): string {
  return `${origin}${spoolLabelPath(code)}`;
}
