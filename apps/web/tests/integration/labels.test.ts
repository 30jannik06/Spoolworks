import { randomUUID } from "node:crypto";

import { formatShortCode, generateShortCode } from "@spoolworks/core";
import { prisma } from "@spoolworks/database";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Label codes against the local database: a printed code opens the caller's
 * spool, and only theirs. Unknown and foreign codes must look the same.
 */

type Caller = { user: { id: string; name: string }; workshop: { id: string; lowStockThresholdG: number } };
let caller: Caller | null = null;

class RedirectSignal extends Error {
  constructor(readonly url: string) {
    super(`redirect ${url}`);
  }
}

vi.mock("@/lib/session", () => ({
  requireWorkshop: async (next?: string) => {
    if (!caller) throw new RedirectSignal(`/auth/login?next=${encodeURIComponent(next ?? "/")}`);
    return caller;
  },
}));
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new RedirectSignal(url);
  },
}));

const { openSpoolCode } = await import("@/app/s/actions");
const { findSpoolIdByCode, listLabelSpools } = await import("@/lib/queries/spools");

const tag = `itest-${randomUUID().slice(0, 8)}`;
let alice: Caller;
let bob: Caller;
let productId: string;

async function makeCaller(name: string): Promise<Caller> {
  const user = await prisma.user.create({ data: { name, email: `${tag}-${name}@spoolworks.test` } });
  const workshop = await prisma.workshop.create({ data: { ownerId: user.id } });
  return { user: { id: user.id, name }, workshop: { id: workshop.id, lowStockThresholdG: workshop.lowStockThresholdG } };
}

async function makeSpool(as: Caller, status: "ACTIVE" | "ARCHIVED" = "ACTIVE") {
  return prisma.spool.create({
    data: {
      workshopId: as.workshop.id,
      productId,
      shortCode: generateShortCode(),
      status,
      emptySpoolWeightG: 200,
      remainingG: 1000,
      ledger: { create: { kind: "INITIAL", valueG: 1000 } },
    },
  });
}

/** Runs the code form as `as`; returns the redirect target or the failed state. */
async function enter(as: Caller | null, code: string): Promise<unknown> {
  caller = as;
  const data = new FormData();
  data.set("code", code);
  try {
    return await openSpoolCode({ ok: false }, data);
  } catch (error) {
    if (error instanceof RedirectSignal) return error.url;
    throw error;
  }
}

beforeAll(async () => {
  alice = await makeCaller("alice");
  bob = await makeCaller("bob");
  const brand = await prisma.brand.create({ data: { name: `${tag} Brand`, nameKey: `${tag} brand` } });
  const product = await prisma.filamentProduct.create({
    data: { brandId: brand.id, productLine: "PLA Basic", material: "PLA", colorName: "Black", colorHex: "#000000", netWeightG: 1000 },
  });
  productId = product.id;
});

beforeEach(() => {
  caller = null;
});

afterAll(async () => {
  await prisma.user.deleteMany({ where: { email: { startsWith: tag } } });
  await prisma.filamentProduct.deleteMany({ where: { brand: { name: { startsWith: tag } } } });
  await prisma.brand.deleteMany({ where: { name: { startsWith: tag } } });
});

describe("label codes", () => {
  it("opens the caller's spool, typed the way it is printed", async () => {
    const spool = await makeSpool(alice);
    expect(await enter(alice, spool.shortCode)).toBe(`/spools/${spool.id}`);
    expect(await enter(alice, ` ${formatShortCode(spool.shortCode).toLowerCase()} `)).toBe(`/spools/${spool.id}`);
  });

  it("treats a foreign code like an unknown one", async () => {
    const bobs = await makeSpool(bob);
    expect(await enter(alice, bobs.shortCode)).toEqual({ ok: false, fieldErrors: { code: "code_not_found" } });
    expect(await findSpoolIdByCode(alice.workshop.id, bobs.shortCode)).toBeNull();
    expect(await findSpoolIdByCode(bob.workshop.id, bobs.shortCode)).toBe(bobs.id);
  });

  it("rejects input that is not a code", async () => {
    expect(await enter(alice, "K7M2Q9X")).toEqual({ ok: false, fieldErrors: { code: "invalid_code" } });
    expect(await enter(alice, "K7M2Q9XU")).toEqual({ ok: false, fieldErrors: { code: "invalid_code" } });
  });

  it("still opens archived spools, whose label is still stuck on them", async () => {
    const spool = await makeSpool(alice, "ARCHIVED");
    expect(await enter(alice, spool.shortCode)).toBe(`/spools/${spool.id}`);
  });

  it("sends signed-out callers to the login first", async () => {
    expect(await enter(null, "K7M2Q9XA")).toBe("/auth/login?next=%2Fs");
  });

  it("lists only the caller's active spools for the sheet", async () => {
    const own = await makeSpool(alice);
    const archived = await makeSpool(alice, "ARCHIVED");
    const foreign = await makeSpool(bob);
    const ids = (await listLabelSpools(alice.workshop.id)).map((spool) => spool.id);
    expect(ids).toContain(own.id);
    expect(ids).not.toContain(archived.id);
    expect(ids).not.toContain(foreign.id);
  });
});
