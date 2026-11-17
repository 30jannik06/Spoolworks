import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "../generated/prisma/client";

// Prisma 7 requires a driver adapter. adapter-pg over Neon's pooled endpoint
// supports interactive transactions, which the spool ledger relies on.
//
// Note: `next build` needs DATABASE_URL set (Better Auth touches the client
// while loading its config), but it does not connect: every page is dynamic.
function createPrismaClient(): PrismaClient {
  const connectionString = process.env["DATABASE_URL"];
  if (!connectionString) {
    throw new Error(
      "DATABASE_URL is not set. Copy .env.example to .env at the repo root and fill it in.",
    );
  }
  // `prisma dev` (local, PGlite-based) handles one connection at a time; with a
  // larger pool, concurrent requests fail with Postgres error 08P01. Locally set
  // DATABASE_POOL_MAX=1; on Neon leave it unset and use pg's default pool.
  const poolMax = Number(process.env["DATABASE_POOL_MAX"]) || undefined;

  return new PrismaClient({
    adapter: new PrismaPg({ connectionString, ...(poolMax ? { max: poolMax } : {}) }),
    log: process.env["NODE_ENV"] === "development" ? ["warn", "error"] : ["error"],
  });
}

// One client per process. In dev, hot reload would otherwise open a new pool
// on every change.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma: PrismaClient = globalForPrisma.prisma ?? createPrismaClient();

if (process.env["NODE_ENV"] !== "production") {
  globalForPrisma.prisma = prisma;
}
