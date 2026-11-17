import { randomUUID } from "node:crypto";

import { prisma } from "@spoolworks/database";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Server actions of the filament library against the local database.
 * The session is mocked: `caller` decides whose workshop requireWorkshop()
 * returns. Every row carries a per-run tag and is deleted afterwards.
 */

type Caller = { user: { id: string; name: string }; workshop: { id: string; lowStockThresholdG: number } };
let caller: Caller | null = null;

class RedirectSignal extends Error {
  constructor(readonly url: string) {
    super(`redirect ${url}`);
  }
}

vi.mock("@/lib/session", () => ({
  requireWorkshop: async () => {
    if (!caller) throw new RedirectSignal("/auth/login");
    return caller;
  },
}));
vi.mock("next/cache", () => ({ refresh: vi.fn() }));
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new RedirectSignal(url);
  },
}));

const { createSpool, weighSpool, correctSpool, updateSpool, setSpoolArchived, deleteSpool } = await import(
  "@/app/spools/actions"
);
const { getSpool, listSpools } = await import("@/lib/queries/spools");

const tag = `itest-${randomUUID().slice(0, 8)}`;
let alice: Caller;
let bob: Caller;

async function makeCaller(name: string): Promise<Caller> {
  const user = await prisma.user.create({ data: { name, email: `${tag}-${name}@spoolworks.test` } });
  const workshop = await prisma.workshop.create({ data: { ownerId: user.id } });
  return { user: { id: user.id, name }, workshop: { id: workshop.id, lowStockThresholdG: workshop.lowStockThresholdG } };
}

function form(values: Record<string, string>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(values)) data.set(key, value);
  return data;
}

const initial = { ok: false } as const;

/** Creates a spool as `as` and returns its id (from the redirect target). */
async function createAs(as: Caller, overrides: Record<string, string> = {}): Promise<string> {
  caller = as;
  try {
    await createSpool(
      initial,
      form({
        mode: "new",
        "product.brandName": `${tag} Brand`,
        "product.productLine": "PLA Matte",
        "product.material": "PLA",
        "product.colorName": "Marine Blue",
        "product.colorHex": "#4A7BC2",
        "product.diameterUm": "1750",
        "product.netWeightG": "1000",
        "product.spoolWeightG": "250",
        initialNetG: "1000",
        emptySpoolWeightG: "250",
        ...overrides,
      }),
    );
  } catch (error) {
    if (error instanceof RedirectSignal) return error.url.replace("/spools/", "");
    throw error;
  }
  throw new Error("createSpool did not redirect");
}

beforeAll(async () => {
  alice = await makeCaller("alice");
  bob = await makeCaller("bob");
});

beforeEach(() => {
  caller = null;
});

afterAll(async () => {
  await prisma.spool.deleteMany({ where: { workshopId: { in: [alice.workshop.id, bob.workshop.id] } } });
  await prisma.filamentProduct.deleteMany({ where: { brand: { name: { startsWith: tag } } } });
  await prisma.brand.deleteMany({ where: { name: { startsWith: tag } } });
  await prisma.user.deleteMany({ where: { email: { startsWith: tag } } });
});

describe("createSpool", () => {
  it("creates spool, catalog product and an INITIAL ledger entry", async () => {
    const id = await createAs(alice);
    const spool = await prisma.spool.findUniqueOrThrow({ where: { id }, include: { ledger: true, product: true } });
    expect(spool.workshopId).toBe(alice.workshop.id);
    expect(spool.remainingG).toBe(1000);
    expect(spool.shortCode).toMatch(/^[0-9A-HJKMNP-TV-Z]{8}$/);
    expect(spool.ledger).toEqual([expect.objectContaining({ kind: "INITIAL", valueG: 1000, active: true })]);
    expect(spool.product.createdById).toBe(alice.user.id);
  });

  it("reuses the catalog entry when the same product is typed again (other workshop, other casing)", async () => {
    const first = await createAs(alice);
    const second = await createAs(bob, { "product.brandName": `${tag} BRAND ` });
    const [a, b] = await Promise.all([
      prisma.spool.findUniqueOrThrow({ where: { id: first } }),
      prisma.spool.findUniqueOrThrow({ where: { id: second } }),
    ]);
    expect(a.productId).toBe(b.productId);
  });

  it("refuses a guest", async () => {
    caller = null;
    await expect(createSpool(initial, form({ mode: "existing", productId: "x", initialNetG: "1", emptySpoolWeightG: "1" }))).rejects.toThrow(
      "redirect /auth/login",
    );
  });

  it("reports field errors instead of throwing", async () => {
    caller = alice;
    const result = await createSpool(initial, form({ mode: "new", initialNetG: "12,5", emptySpoolWeightG: "250" }));
    expect(result.ok).toBe(false);
    expect(result.fieldErrors?.["initialNetG"]).toBe("invalid_grams");
  });
});

describe("weighing and corrections", () => {
  it("subtracts the empty spool from the gross weight", async () => {
    const id = await createAs(alice);
    caller = alice;
    const result = await weighSpool(initial, form({ spoolId: id, grossG: "1062" }));
    expect(result).toEqual({ ok: true, value: 812 });
    expect((await prisma.spool.findUniqueOrThrow({ where: { id } })).remainingG).toBe(812);
  });

  it("a weighing wins over prints booked before it, prints after it count", async () => {
    const id = await createAs(alice);
    // Phase 3 will book prints through an action; here the entries go in directly.
    await prisma.spoolLedgerEntry.create({ data: { spoolId: id, kind: "PRINT", valueG: 80 } });
    caller = alice;
    await weighSpool(initial, form({ spoolId: id, grossG: "1190" })); // 940 net
    await prisma.spoolLedgerEntry.create({ data: { spoolId: id, kind: "PRINT", valueG: 18 } });
    // The old print is edited afterwards: it must not change the result.
    await prisma.spoolLedgerEntry.updateMany({ where: { spoolId: id, valueG: 80 }, data: { valueG: 120 } });
    const result = await correctSpool(initial, form({ spoolId: id, netG: "922" }));
    expect(result.value).toBe(922);
    const { computeRemaining } = await import("@spoolworks/core");
    const entries = await prisma.spoolLedgerEntry.findMany({ where: { spoolId: id } });
    // Without the correction anchor: 940 − 18.
    expect(computeRemaining(entries.filter((entry) => entry.kind !== "CORRECTION"))).toBe(922);
  });

  it("never goes below zero", async () => {
    const id = await createAs(alice);
    caller = alice;
    expect((await weighSpool(initial, form({ spoolId: id, grossG: "200" }))).value).toBe(0);
  });
});

describe("workshop isolation", () => {
  let spoolId: string;

  beforeAll(async () => {
    spoolId = await createAs(alice);
  });

  it("bob cannot read alice's spool", async () => {
    expect(await getSpool(bob.workshop.id, spoolId, 150)).toBeNull();
    expect((await listSpools(bob.workshop.id, 150)).some((spool) => spool.id === spoolId)).toBe(false);
  });

  it("bob cannot weigh, correct, edit, archive or delete it", async () => {
    caller = bob;
    expect(await weighSpool(initial, form({ spoolId, grossG: "300" }))).toEqual({ ok: false, error: "not_found" });
    expect(await correctSpool(initial, form({ spoolId, netG: "1" }))).toEqual({ ok: false, error: "not_found" });
    expect(await updateSpool(spoolId, initial, form({ emptySpoolWeightG: "1" }))).toEqual({ ok: false, error: "not_found" });
    expect(await setSpoolArchived(spoolId, true)).toEqual({ ok: false, error: "not_found" });
    expect(await deleteSpool(spoolId)).toEqual({ ok: false, error: "not_found" });

    const untouched = await prisma.spool.findUniqueOrThrow({ where: { id: spoolId }, include: { ledger: true } });
    expect(untouched.remainingG).toBe(1000);
    expect(untouched.emptySpoolWeightG).toBe(250);
    expect(untouched.status).toBe("ACTIVE");
    expect(untouched.ledger).toHaveLength(1);
  });

  it("alice can archive and delete her own spool", async () => {
    caller = alice;
    expect(await setSpoolArchived(spoolId, true)).toEqual({ ok: true });
    await expect(deleteSpool(spoolId)).rejects.toThrow("redirect /spools");
    expect(await prisma.spool.findUnique({ where: { id: spoolId } })).toBeNull();
    expect(await prisma.spoolLedgerEntry.count({ where: { spoolId } })).toBe(0);
  });
});
