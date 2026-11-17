import { randomUUID } from "node:crypto";

import { prisma } from "@spoolworks/database";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Printer, unit and slot actions against the local database. Same setup as
 * spools.test.ts: the session is mocked, rows are tagged and deleted afterwards.
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

const { createPrinter, deletePrinter, addUnit, removeUnit, assignSlot, updatePrinter } = await import(
  "@/app/printers/actions"
);
const { setSpoolArchived } = await import("@/app/spools/actions");

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

async function makeSpool(as: Caller): Promise<string> {
  const spool = await prisma.spool.create({
    data: {
      workshopId: as.workshop.id,
      productId,
      shortCode: randomUUID().replace(/-/g, "").slice(0, 8).toUpperCase(),
      emptySpoolWeightG: 250,
      remainingG: 1000,
    },
  });
  return spool.id;
}

/** Creates a printer as `as` with one unit of `firstUnit` slots; returns its id. */
async function printerAs(as: Caller, firstUnit = "4"): Promise<string> {
  caller = as;
  try {
    await createPrinter({ ok: false }, form({ name: "P2S", model: "Bambu Lab P2S", firstUnit }));
  } catch (error) {
    if (error instanceof RedirectSignal) return error.url.replace("/printers/", "");
    throw error;
  }
  throw new Error("createPrinter did not redirect");
}

async function slotsOf(printerId: string) {
  return prisma.amsSlot.findMany({
    where: { unit: { printerId } },
    orderBy: [{ unit: { position: "asc" } }, { position: "asc" }],
  });
}

async function slotOfSpool(spoolId: string) {
  return prisma.amsSlot.findUnique({ where: { spoolId } });
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
  await prisma.printer.deleteMany({ where: { workshopId: { in: [alice.workshop.id, bob.workshop.id] } } });
  await prisma.spool.deleteMany({ where: { workshopId: { in: [alice.workshop.id, bob.workshop.id] } } });
  await prisma.filamentProduct.deleteMany({ where: { brand: { name: { startsWith: tag } } } });
  await prisma.brand.deleteMany({ where: { name: { startsWith: tag } } });
  await prisma.user.deleteMany({ where: { email: { startsWith: tag } } });
});

describe("createPrinter", () => {
  it("creates the printer with a 4-slot unit", async () => {
    const id = await printerAs(alice);
    const printer = await prisma.printer.findUniqueOrThrow({ where: { id }, include: { units: { include: { slots: true } } } });
    expect(printer.workshopId).toBe(alice.workshop.id);
    expect(printer.units).toHaveLength(1);
    expect(printer.units[0]?.slots.map((slot) => slot.position).sort()).toEqual([1, 2, 3, 4]);
  });

  it("can start without a unit and rejects an empty name", async () => {
    const id = await printerAs(alice, "0");
    expect(await prisma.amsUnit.count({ where: { printerId: id } })).toBe(0);
    caller = alice;
    const result = await createPrinter({ ok: false }, form({ name: " ", firstUnit: "4" }));
    expect(result.fieldErrors?.["name"]).toBe("required");
  });
});

describe("assignSlot", () => {
  it("loads a spool, and moving it empties the old slot", async () => {
    const printerId = await printerAs(alice);
    const spoolId = await makeSpool(alice);
    const [first, second] = await slotsOf(printerId);

    expect(await assignSlot(first!.id, spoolId)).toEqual({ ok: true });
    expect((await slotOfSpool(spoolId))?.id).toBe(first!.id);

    expect(await assignSlot(second!.id, spoolId)).toEqual({ ok: true });
    const slots = await slotsOf(printerId);
    expect(slots[0]?.spoolId).toBeNull();
    expect(slots[1]?.spoolId).toBe(spoolId);
  });

  it("replacing sends the previous spool back to the shelf, empty clears", async () => {
    const printerId = await printerAs(alice);
    const a = await makeSpool(alice);
    const b = await makeSpool(alice);
    const [slot] = await slotsOf(printerId);

    await assignSlot(slot!.id, a);
    await assignSlot(slot!.id, b);
    expect(await slotOfSpool(a)).toBeNull();
    expect((await slotOfSpool(b))?.id).toBe(slot!.id);

    expect(await assignSlot(slot!.id, "")).toEqual({ ok: true });
    expect(await slotOfSpool(b)).toBeNull();
  });

  it("treats another workshop's slot or spool as missing", async () => {
    const alicePrinter = await printerAs(alice);
    const bobSpool = await makeSpool(bob);
    const aliceSpool = await makeSpool(alice);
    const [aliceSlot] = await slotsOf(alicePrinter);

    caller = alice;
    expect(await assignSlot(aliceSlot!.id, bobSpool)).toEqual({ ok: false, error: "not_found" });
    expect(await slotOfSpool(bobSpool)).toBeNull();

    caller = bob;
    expect(await assignSlot(aliceSlot!.id, "")).toEqual({ ok: false, error: "slot_not_found" });
    caller = alice;
    await assignSlot(aliceSlot!.id, aliceSpool);
    caller = bob;
    expect(await assignSlot(aliceSlot!.id, "")).toEqual({ ok: false, error: "slot_not_found" });
    expect((await slotOfSpool(aliceSpool))?.id).toBe(aliceSlot!.id);
  });

  it("refuses archived spools, and archiving unloads a spool", async () => {
    const printerId = await printerAs(alice);
    const spoolId = await makeSpool(alice);
    const [slot] = await slotsOf(printerId);

    await assignSlot(slot!.id, spoolId);
    expect(await setSpoolArchived(spoolId, true)).toEqual({ ok: true });
    expect(await slotOfSpool(spoolId)).toBeNull();
    expect(await assignSlot(slot!.id, spoolId)).toEqual({ ok: false, error: "spool_not_active" });
  });
});

describe("units and deletion", () => {
  it("adds units at the next free position and removing one keeps the spools", async () => {
    const printerId = await printerAs(alice);
    const spoolId = await makeSpool(alice);
    caller = alice;
    expect(await addUnit(printerId, "1")).toEqual({ ok: true });
    const units = await prisma.amsUnit.findMany({ where: { printerId }, orderBy: { position: "asc" } });
    expect(units.map((unit) => [unit.position, unit.slotCount])).toEqual([
      [1, 4],
      [2, 1],
    ]);

    const single = await prisma.amsSlot.findFirstOrThrow({ where: { unitId: units[1]!.id } });
    await assignSlot(single.id, spoolId);
    expect(await removeUnit(units[1]!.id)).toEqual({ ok: true });
    expect(await prisma.spool.count({ where: { id: spoolId } })).toBe(1);
    expect(await slotOfSpool(spoolId)).toBeNull();
  });

  it("stops at the unit limit and rejects odd unit sizes", async () => {
    const printerId = await printerAs(alice, "0");
    caller = alice;
    for (let i = 0; i < 8; i++) expect(await addUnit(printerId, "1")).toEqual({ ok: true });
    expect(await addUnit(printerId, "1")).toEqual({ ok: false, error: "too_many_units" });
    expect(await addUnit(printerId, "3")).toEqual({ ok: false, error: "invalid_input" });
  });

  it("deleting a printer keeps its spools; others cannot touch it", async () => {
    const printerId = await printerAs(alice);
    const spoolId = await makeSpool(alice);
    const [slot] = await slotsOf(printerId);
    await assignSlot(slot!.id, spoolId);

    caller = bob;
    expect(await deletePrinter(printerId)).toEqual({ ok: false, error: "printer_not_found" });
    expect(await addUnit(printerId, "4")).toEqual({ ok: false, error: "printer_not_found" });
    expect(await updatePrinter(printerId, { ok: false }, form({ name: "Mine now" }))).toEqual({
      ok: false,
      error: "printer_not_found",
    });

    caller = alice;
    await expect(deletePrinter(printerId)).rejects.toThrow("redirect /printers");
    expect(await prisma.printer.count({ where: { id: printerId } })).toBe(0);
    expect(await prisma.spool.count({ where: { id: spoolId } })).toBe(1);
  });
});
