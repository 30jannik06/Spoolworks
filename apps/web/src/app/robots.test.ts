import { afterEach, describe, expect, it, vi } from "vitest";

import robots from "./robots";
import sitemap from "./sitemap";

afterEach(() => vi.unstubAllEnvs());

describe("robots and sitemap", () => {
  it("closes previews and local dev completely", () => {
    vi.stubEnv("VERCEL_ENV", "preview");
    expect(robots()).toEqual({ rules: { userAgent: "*", disallow: "/" } });
    vi.stubEnv("VERCEL_ENV", "");
    expect(robots()).toEqual({ rules: { userAgent: "*", disallow: "/" } });
  });

  it("opens production's public pages and points at its sitemap", () => {
    vi.stubEnv("VERCEL_ENV", "production");
    vi.stubEnv("VERCEL_PROJECT_PRODUCTION_URL", "spoolworks.de");
    const result = robots();
    expect(result.sitemap).toBe("https://spoolworks.de/sitemap.xml");
    const rules = Array.isArray(result.rules) ? result.rules[0] : result.rules;
    expect(rules?.allow).toBe("/");
    expect(rules?.disallow).toEqual(expect.arrayContaining(["/admin", "/s/", "/photos/", "/spools"]));
    // Shared prints and galleries carry noindex; crawlers must be able to read it.
    expect(rules?.disallow).not.toEqual(expect.arrayContaining(["/p/"]));
    expect(rules?.disallow).not.toEqual(expect.arrayContaining(["/u/"]));
    expect(sitemap().map((entry) => entry.url)).toEqual([
      "https://spoolworks.de/",
      "https://spoolworks.de/auth/register",
      "https://spoolworks.de/impressum",
      "https://spoolworks.de/datenschutz",
    ]);
  });
});
