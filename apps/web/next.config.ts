import path from "node:path";

import { config } from "dotenv";
import type { NextConfig } from "next";

// The monorepo keeps a single .env at the repo root (shared with the Prisma
// CLI in packages/database). Next only reads env files from apps/web, so load
// the root one explicitly. On Vercel there is no file and the platform env wins.
config({ path: path.resolve(process.cwd(), "../../.env"), quiet: true });

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  reactCompiler: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
