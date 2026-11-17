import path from "node:path";
import { fileURLToPath } from "node:url";

import { config } from "dotenv";
import { defineConfig } from "prisma/config";

// Prisma 7 no longer loads .env on its own. The monorepo keeps one .env at the
// repo root, so load it explicitly from there (two levels up from this file).
const here = path.dirname(fileURLToPath(import.meta.url));
config({ path: path.resolve(here, "../../.env"), quiet: true });

/**
 * Config for the Prisma CLI (migrate, studio, generate).
 *
 * This is NOT how the app connects. At runtime the client in src/client.ts
 * builds its own pool via @prisma/adapter-pg from DATABASE_URL:
 *  - app → DATABASE_URL, the pooled (-pooler) Neon endpoint
 *  - CLI → DIRECT_URL, the direct endpoint. `migrate` takes a session-level
 *    advisory lock that leaks through PgBouncer and fails later runs with P1002.
 * DIRECT_URL falls back to DATABASE_URL for setups without a pooler.
 */
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env["DIRECT_URL"] ?? process.env["DATABASE_URL"],
    // Local `prisma dev` ships its own shadow database on a second port; without
    // it, `migrate dev` would clone template1 (tables included) and fail.
    ...(process.env["SHADOW_DATABASE_URL"]
      ? { shadowDatabaseUrl: process.env["SHADOW_DATABASE_URL"] }
      : {}),
  },
});
