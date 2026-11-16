import path from "node:path";

import { defineConfig } from "vitest/config";

// Unit tests for pure helpers only. Anything touching the database or Next
// request APIs gets integration tests from phase 1 on.
export default defineConfig({
  resolve: { alias: { "@": path.resolve(import.meta.dirname, "src") } },
  test: { include: ["src/**/*.test.ts"] },
});
