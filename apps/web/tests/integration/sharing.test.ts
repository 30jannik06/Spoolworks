import { randomUUID } from "node:crypto";

import { generateShortCode } from "@spoolworks/core";
import { prisma } from "@spoolworks/database";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Sharing against the local database. The public reads run without a session,
 * so the interesting checks are what they leave out, and that revoking works.
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

const { setPrintShared } = await import("@/app/prints/actions");
const { updateGallery } = await import("@/app/settings/actions");
const { getSharedPrint, getPublicGallery } = await import("@/lib/queries/public");

const tag = `itest-${randomUUID().slice(0, 8)}`;
let alice: Caller;
let bob: Caller;
let productId: string;

async function makeCaller(name: string): Promise<Caller> {
  const user = await prisma.user.create({ data: { name, email: `${tag}-${name}@spoolworks.test` } });
  const workshop = await prisma.workshop.create({ data: { ownerId: user.id } });
  return { user: { id: user.id, name }, workshop: { id: workshop.id, lowStockThresholdG: workshop.lowStockThresholdG } };
}

/** A print with one usage on a fresh spool. */
async function makePrint(as: Caller, name = "Kabelhalter", status: "PRINTED" | "PLANNED" = "PRINTED") {
  const spool = await prisma.spool.create({
    data: {
      workshopId: as.workshop.id,
      productId,
      shortCode: generateShortCode(),
      emptySpoolWeightG: 200,
      remainingG: 950,
      location: "Regal oben",
      notes: "geheime Spulennotiz",
    },
  });
  const print = await prisma.print.create({
    data: {
      workshopId: as.workshop.id,
      name,
      status,
      notes: "zweimal gedruckt",
      usages: { create: { spoolId: spool.id, grams: 50 } },
    },
  });
  return { print, spool };
}

async function share(as: Caller, printId: string, shared: boolean) {
  caller = as;
  return setPrintShared(printId, shared);
}

async function tokenOf(printId: string) {
  return (await prisma.print.findUniqueOrThrow({ where: { id: printId } })).shareToken;
}

function form(values: Record<string, string>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(values)) data.set(key, value);
  return data;
}

beforeAll(async () => {
  alice = await makeCaller("alice");
  bob = await makeCaller("bob");
  const brand = await prisma.brand.create({ data: { name: `${tag} Brand`, nameKey: `${tag} brand` } });
  const product = await prisma.filamentProduct.create({
    data: { brandId: brand.id, productLine: "PLA Matte", material: "PLA", colorName: "Marine Blue", colorHex: "#1f3a93", netWeightG: 1000 },
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

describe("sharing a print", () => {
  it("opens the print to anyone with the link, without private fields", async () => {
    const { print, spool } = await makePrint(alice);
    expect(await share(alice, print.id, true)).toEqual({ ok: true });
    const token = await tokenOf(print.id);
    expect(token).toMatch(/^[A-Za-z0-9_-]{22}$/);

    const shared = await getSharedPrint(token!);
    expect(shared?.print).toMatchObject({ name: "Kabelhalter", notes: "zweimal gedruckt", totalG: 50 });
    expect(shared?.print.usages).toEqual([
      { grams: 50, brand: `${tag} Brand`, productLine: "PLA Matte", material: "PLA", colorName: "Marine Blue", colorHex: "#1f3a93" },
    ]);
    const json = JSON.stringify(shared);
    for (const secret of [print.id, spool.id, spool.shortCode, alice.workshop.id, "950", "Regal oben", "geheime Spulennotiz"]) {
      expect(json).not.toContain(secret);
    }
  });

  it("kills the link when sharing stops, and sharing again gives a new one", async () => {
    const { print } = await makePrint(alice);
    await share(alice, print.id, true);
    const first = await tokenOf(print.id);
    await share(alice, print.id, true); // a double click keeps the link
    expect(await tokenOf(print.id)).toBe(first);

    await share(alice, print.id, false);
    expect(await tokenOf(print.id)).toBeNull();
    expect(await getSharedPrint(first!)).toBeNull();

    await share(alice, print.id, true);
    const second = await tokenOf(print.id);
    expect(second).not.toBe(first);
    expect(await getSharedPrint(second!)).not.toBeNull();
  });

  it("does not let anyone share someone else's print", async () => {
    const { print } = await makePrint(bob);
    expect(await share(alice, print.id, true)).toEqual({ ok: false, error: "print_not_found" });
    expect(await tokenOf(print.id)).toBeNull();
    await share(bob, print.id, true);
    expect(await share(alice, print.id, false)).toEqual({ ok: false, error: "print_not_found" });
    expect(await tokenOf(print.id)).not.toBeNull();
  });

  it("rejects malformed and unknown tokens", async () => {
    expect(await getSharedPrint("short")).toBeNull();
    expect(await getSharedPrint("A".repeat(22))).toBeNull();
  });
});

describe("public gallery", () => {
  it("is invisible until switched on, then shows exactly the shared prints", async () => {
    const shared = await makePrint(alice, "Geteilt");
    const planned = await makePrint(alice, "Geteilt, geplant", "PLANNED");
    await makePrint(alice, "Privat");
    const foreign = await makePrint(bob, "Bobs Druck");
    await share(alice, shared.print.id, true);
    await share(alice, planned.print.id, true);
    await share(bob, foreign.print.id, true);

    caller = alice;
    expect(await updateGallery({ ok: false }, form({ publicHandle: `${tag}-Alice` }))).toEqual({ ok: true });
    expect(await getPublicGallery(`${tag}-alice`)).toBeNull(); // handle set, gallery still off

    caller = alice;
    expect(await updateGallery({ ok: false }, form({ publicHandle: `${tag}-alice`, galleryPublic: "1" }))).toEqual({
      ok: true,
    });
    const gallery = await getPublicGallery(`${tag}-ALICE`);
    expect(gallery?.handle).toBe(`${tag}-alice`);
    const names = gallery?.prints.map((print) => print.name) ?? [];
    expect(names).toEqual(expect.arrayContaining(["Geteilt", "Geteilt, geplant"]));
    expect(names).not.toContain("Privat");
    expect(names).not.toContain("Bobs Druck");
    // Every listed print is shared (earlier tests in this file shared more of Alice's).
    expect(await prisma.print.count({ where: { workshopId: alice.workshop.id, shareToken: { not: null } } })).toBe(
      names.length,
    );
    expect((await getSharedPrint((await tokenOf(shared.print.id))!))?.galleryHandle).toBe(`${tag}-alice`);

    caller = alice;
    await updateGallery({ ok: false }, form({ publicHandle: `${tag}-alice` }));
    expect(await getPublicGallery(`${tag}-alice`)).toBeNull();
    expect((await getSharedPrint((await tokenOf(shared.print.id))!))?.galleryHandle).toBeNull();
  });

  it("keeps handles unique and requires one for a public gallery", async () => {
    caller = bob;
    expect(await updateGallery({ ok: false }, form({ publicHandle: `${tag}-alice` }))).toEqual({
      ok: false,
      error: "invalid_input",
      fieldErrors: { publicHandle: "handle_taken" },
    });
    caller = bob;
    expect(await updateGallery({ ok: false }, form({ publicHandle: "", galleryPublic: "1" }))).toMatchObject({
      ok: false,
      fieldErrors: { publicHandle: "handle_required" },
    });
  });
});
