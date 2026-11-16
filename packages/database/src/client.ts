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
  return new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
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
