import { randomUUID } from "node:crypto";

import { prisma } from "@spoolworks/database";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Prints and the spool ledger against the local database. The interesting
 * cases are the orderings: print, weigh, then edit or delete the print.
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

const { createPrint, updatePrint, deletePrint } = await import("@/app/prints/actions");
const { weighSpool, deleteSpool, setSpoolArchived } = await import("@/app/spools/actions");
const { createPrinter } = await import("@/app/printers/actions");

const tag = `itest-${randomUUID().slice(0, 8)}`;
let alice: Caller;
let bob: Caller;
let productId: string;

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

/** A spool with 1000 g net and an INITIAL anchor, like createSpool makes it. */
async function makeSpool(as: Caller, netG = 1000): Promise<string> {
  const spool = await prisma.spool.create({
    data: {
      workshopId: as.workshop.id,
      productId,
      shortCode: randomUUID().replace(/-/g, "").slice(0, 8).toUpperCase(),
      emptySpoolWeightG: 200,
      remainingG: netG,
      ledger: { create: { kind: "INITIAL", valueG: netG } },
    },
  });
  return spool.id;
}

async function remaining(spoolId: string) {
  return (await prisma.spool.findUniqueOrThrow({ where: { id: spoolId } })).remainingG;
}

function usageFields(usages: [string, number | string][]): Record<string, string> {
  return Object.fromEntries(
    usages.flatMap(([spoolId, grams], i) => [
      [`usages.${i}.spoolId`, spoolId],
      [`usages.${i}.grams`, String(grams)],
    ]),
  );
}

/** Runs an action that redirects on success; returns the target or the failed state. */
async function run(action: () => Promise<unknown>): Promise<string | unknown> {
  try {
    return await action();
  } catch (error) {
    if (error instanceof RedirectSignal) return error.url;
    throw error;
  }
}

async function printAs(as: Caller, usages: [string, number][], extra: Record<string, string> = {}): Promise<string> {
  caller = as;
  const target = await run(() =>
    createPrint({ ok: false }, form({ name: "Kabelhalter", status: "PRINTED", ...usageFields(usages), ...extra })),
  );
  if (typeof target !== "string") throw new Error(`createPrint failed: ${JSON.stringify(target)}`);
  return target.replace("/prints/", "");
}

async function edit(as: Caller, printId: string, usages: [string, number][], status = "PRINTED") {
  caller = as;
  return run(() => updatePrint(printId, { ok: false }, form({ name: "Kabelhalter", status, ...usageFields(usages) })));
}

async function weigh(as: Caller, spoolId: string, grossG: number) {
  caller = as;
  return weighSpool({ ok: false }, form({ spoolId, grossG: String(grossG) }));
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
  // Deleting the users cascades workshops, prints, usages and spools together.
  await prisma.user.deleteMany({ where: { email: { startsWith: tag } } });
  await prisma.filamentProduct.deleteMany({ where: { brand: { name: { startsWith: tag } } } });
  await prisma.brand.deleteMany({ where: { name: { startsWith: tag } } });
});

describe("booking prints", () => {
  it("deducts each spool, edits follow, deleting gives it back", async () => {
    const a = await makeSpool(alice);
    const b = await makeSpool(alice);
    const printId = await printAs(alice, [
      [a, 40],
      [b, 10],
    ]);
    expect([await remaining(a), await remaining(b)]).toEqual([960, 990]);

    expect(await edit(alice, printId, [[a, 55]])).toBe(`/prints/${printId}`);
    expect([await remaining(a), await remaining(b)]).toEqual([945, 1000]);

    caller = alice;
    expect(await run(() => deletePrint(printId))).toBe("/prints");
    expect(await remaining(a)).toBe(1000);
    expect(await prisma.spoolLedgerEntry.count({ where: { spoolId: a, kind: "PRINT" } })).toBe(0);
  });

  it("a weighing after the print wins: editing or deleting the print changes nothing", async () => {
    const a = await makeSpool(alice);
    const printId = await printAs(alice, [[a, 100]]);
    expect(await remaining(a)).toBe(900);

    await weigh(alice, a, 200 + 880); // the scale says 880 g net
    expect(await remaining(a)).toBe(880);

    await edit(alice, printId, [[a, 150]]);
    expect(await remaining(a)).toBe(880);
    caller = alice;
    await run(() => deletePrint(printId));
    expect(await remaining(a)).toBe(880);
  });

  it("planned prints book nothing; marking one printed after a weighing deducts", async () => {
    const a = await makeSpool(alice);
    const printId = await printAs(alice, [[a, 70]], { status: "PLANNED" });
    expect(await remaining(a)).toBe(1000);
    expect(await prisma.spoolLedgerEntry.count({ where: { spoolId: a, kind: "PRINT" } })).toBe(0);

    await weigh(alice, a, 200 + 990);
    await edit(alice, printId, [[a, 70]], "PRINTED");
    expect(await remaining(a)).toBe(920);

    await edit(alice, printId, [[a, 70]], "PLANNED");
    expect(await remaining(a)).toBe(990);
  });

  it("failed prints deduct what was entered", async () => {
    const a = await makeSpool(alice);
    await printAs(alice, [[a, 25]], { status: "FAILED" });
    expect(await remaining(a)).toBe(975);
  });
});

describe("isolation and rules", () => {
  it("treats another workshop's spool, printer or print as missing", async () => {
    const bobSpool = await makeSpool(bob);
    caller = alice;
    expect(
      await run(() => createPrint({ ok: false }, form({ name: "X", status: "PRINTED", ...usageFields([[bobSpool, 5]]) }))),
    ).toEqual({ ok: false, error: "not_found" });
    expect(await remaining(bobSpool)).toBe(1000);

    caller = bob;
    const bobPrinter = await run(() => createPrinter({ ok: false }, form({ name: "Bobs", firstUnit: "0" })));
    const bobPrinterId = String(bobPrinter).replace("/printers/", "");
    caller = alice;
    expect(await run(() => createPrint({ ok: false }, form({ name: "X", status: "PRINTED", printerId: bobPrinterId })))).toEqual({
      ok: false,
      error: "printer_not_found",
    });

    const alicePrint = await printAs(alice, [[await makeSpool(alice), 5]]);
    expect(await edit(bob, alicePrint, [[bobSpool, 5]])).toEqual({ ok: false, error: "print_not_found" });
    caller = bob;
    expect(await run(() => deletePrint(alicePrint))).toEqual({ ok: false, error: "print_not_found" });
    expect(await prisma.print.count({ where: { id: alicePrint } })).toBe(1);
  });

  it("archived spools cannot be newly booked but stay on prints that used them", async () => {
    const a = await makeSpool(alice);
    const printId = await printAs(alice, [[a, 30]]);
    caller = alice;
    await setSpoolArchived(a, true);

    expect(await edit(alice, printId, [[a, 35]])).toBe(`/prints/${printId}`);
    expect(await remaining(a)).toBe(965);
    caller = alice;
    expect(
      await run(() => createPrint({ ok: false }, form({ name: "Y", status: "PRINTED", ...usageFields([[a, 5]]) }))),
    ).toEqual({ ok: false, error: "spool_not_active" });
  });

  it("a spool with prints cannot be deleted, only archived", async () => {
    const a = await makeSpool(alice);
    await printAs(alice, [[a, 10]]);
    caller = alice;
    expect(await deleteSpool(a)).toEqual({ ok: false, error: "spool_has_prints" });
    expect(await prisma.spool.count({ where: { id: a } })).toBe(1);
  });
});
