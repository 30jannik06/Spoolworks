import path from "node:path";

import { config } from "dotenv";
import { defineConfig } from "vitest/config";

// Integration tests write to the local database (`prisma dev`), never to Neon.
export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
    env: (() => {
      config({ path: path.resolve(import.meta.dirname, "../../.env"), quiet: true });
      return { DATABASE_URL: process.env["DATABASE_URL"] ?? "", DATABASE_POOL_MAX: "1" };
    })(),
    fileParallelism: false,
    testTimeout: 30_000,
  },
});
