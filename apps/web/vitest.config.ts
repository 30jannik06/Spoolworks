import path from "node:path";

import { config } from "dotenv";
import { defineConfig } from "vitest/config";

const root = import.meta.dirname;
const alias = {
  "@": path.resolve(root, "src"),
  // `server-only` throws outside a React Server environment; tests are server code.
  "server-only": path.resolve(root, "tests/stubs/empty.ts"),
};

/**
 * Two projects:
 * - unit: pure helpers in src, no database.
 * - integration: server actions against the local database (`prisma dev`),
 *   with the session mocked so a test chooses who is calling. Never point this
 *   at Neon: fixtures are created and deleted.
 */
export default defineConfig({
  test: {
    projects: [
      {
        resolve: { alias },
        test: { name: "unit", include: ["src/**/*.test.ts"] },
      },
      {
        resolve: { alias },
        test: {
          name: "integration",
          include: ["tests/integration/**/*.test.ts"],
          env: (() => {
            config({ path: path.resolve(root, "../../.env"), quiet: true });
            return { DATABASE_URL: process.env["DATABASE_URL"] ?? "", DATABASE_POOL_MAX: "1" };
          })(),
          fileParallelism: false,
          testTimeout: 20_000,
        },
      },
    ],
  },
});
