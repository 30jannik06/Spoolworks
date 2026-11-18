import { randomUUID } from "node:crypto";

import { PRINT_PHOTO_LIMIT } from "@spoolworks/core";
import { prisma } from "@spoolworks/database";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { blobs } from "../stubs/vercel-blob";

/**
 * Print photos against the local database. @vercel/blob is the in-memory stub
 * (see vitest.config.ts), so the checks can look at exactly which blobs exist.
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
  getSession: async () => (caller ? { user: caller.user } : null),
  getWorkshopForUser: async () => caller!.workshop,
}));
vi.mock("next/cache", () => ({ refresh: vi.fn() }));
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new RedirectSignal(url);
  },
}));
vi.mock("next/server", () => ({ connection: async () => {} }));

process.env.BLOB_READ_WRITE_TOKEN = "test-token-never-used";

const { uploadPrintPhoto, setPrintCover, deletePrintPhoto } = await import("@/app/prints/photo-actions");
const { deletePrint, setPrintShared } = await import("@/app/prints/actions");
const { getSharedPrint } = await import("@/lib/queries/public");
const { GET: ownerPhoto } = await import("@/app/photos/[id]/route");
const { GET: publicPhoto } = await import("@/app/p/[token]/photos/[position]/route");
const { auth } = await import("@/lib/auth");

const tag = `itest-${randomUUID().slice(0, 8)}`;
let alice: Caller;
let bob: Caller;

const JPEG = (size = 64) => {
  const bytes = new Uint8Array(size);
  bytes.set([0xff, 0xd8, 0xff, 0xe0]);
  return bytes;
};
const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);

function photoForm(photo: Uint8Array<ArrayBuffer> = JPEG(), thumb: Uint8Array<ArrayBuffer> = JPEG(16), width = "1600", height = "1200") {
  const data = new FormData();
  data.set("photo", new File([photo], "photo.jpg", { type: "image/jpeg" }));
  data.set("thumb", new File([thumb], "thumb.jpg", { type: "image/jpeg" }));
  data.set("width", width);
  data.set("height", height);
  return data;
}

async function makeCaller(name: string): Promise<Caller> {
  const user = await prisma.user.create({ data: { name, email: `${tag}-${name}@spoolworks.test` } });
  const workshop = await prisma.workshop.create({ data: { ownerId: user.id } });
  return { user: { id: user.id, name }, workshop: { id: workshop.id, lowStockThresholdG: workshop.lowStockThresholdG } };
}

async function makePrint(as: Caller) {
  return prisma.print.create({ data: { workshopId: as.workshop.id, name: "Kabelhalter" } });
}

async function upload(as: Caller, printId: string, data = photoForm()) {
  caller = as;
  return uploadPrintPhoto(printId, data);
}

async function photosOf(printId: string) {
  return prisma.printPhoto.findMany({ where: { printId }, orderBy: { position: "asc" } });
}

const ownerGet = (id: string, query = "") =>
  ownerPhoto(new Request(`http://localhost/photos/${id}${query}`), { params: Promise.resolve({ id }) });
const publicGet = (token: string, position: string, query = "") =>
  publicPhoto(new Request(`http://localhost/p/${token}/photos/${position}${query}`), {
    params: Promise.resolve({ token, position }),
  });

beforeAll(async () => {
  alice = await makeCaller("alice");
  bob = await makeCaller("bob");
});

beforeEach(() => {
  caller = null;
});

afterAll(async () => {
  await prisma.user.deleteMany({ where: { email: { startsWith: tag } } });
});

describe("uploading", () => {
  it("stores photo and thumbnail privately under random pathnames", async () => {
    const print = await makePrint(alice);
    expect(await upload(alice, print.id)).toEqual({ ok: true });

    const [photo] = await photosOf(print.id);
    expect(photo).toMatchObject({ position: 0, contentType: "image/jpeg", width: 1600, height: 1200, bytes: 64 });
    expect(photo!.pathname).toMatch(new RegExp(`^local/w/${alice.workshop.id}/[A-Za-z0-9_-]{22}\\.jpg$`));
    expect(photo!.thumbPathname).toBe(photo!.pathname.replace(".jpg", "-thumb.jpg"));
    expect(blobs.get(photo!.pathname)?.bytes.length).toBe(64);
    expect(blobs.get(photo!.thumbPathname)?.bytes.length).toBe(16);
  });

  it("rejects anything that is not a JPEG or WebP by its bytes, whatever it claims", async () => {
    const print = await makePrint(alice);
    const before = blobs.size;
    expect(await upload(alice, print.id, photoForm(PNG))).toEqual({ ok: false, error: "photo_invalid" });
    expect(await upload(alice, print.id, photoForm(JPEG(), PNG))).toEqual({ ok: false, error: "photo_invalid" });
    expect(await upload(alice, print.id, photoForm(JPEG(800_000)))).toEqual({ ok: false, error: "photo_too_large" });
    expect(await upload(alice, print.id, photoForm(JPEG(), JPEG(16), "0"))).toEqual({ ok: false, error: "photo_invalid" });
    expect(await upload(alice, print.id, photoForm(JPEG(), JPEG(16), "5000"))).toEqual({ ok: false, error: "photo_invalid" });
    expect(blobs.size).toBe(before);
    expect(await photosOf(print.id)).toHaveLength(0);
  });

  it("stops at the limit and leaves no stray blobs behind", async () => {
    const print = await makePrint(alice);
    for (let i = 0; i < PRINT_PHOTO_LIMIT; i++) expect(await upload(alice, print.id)).toEqual({ ok: true });
    const before = blobs.size;
    expect(await upload(alice, print.id)).toEqual({ ok: false, error: "photo_limit" });
    expect(blobs.size).toBe(before);
    expect((await photosOf(print.id)).map((p) => p.position)).toEqual([0, 1, 2]);
  });

  it("treats a foreign print like a missing one", async () => {
    const print = await makePrint(alice);
    expect(await upload(bob, print.id)).toEqual({ ok: false, error: "print_not_found" });
    expect(await photosOf(print.id)).toHaveLength(0);
  });
});

describe("cover and delete", () => {
  it("moves the chosen photo to the front and keeps the others in order", async () => {
    const print = await makePrint(alice);
    for (let i = 0; i < 3; i++) await upload(alice, print.id);
    const [a, b, c] = await photosOf(print.id);

    caller = bob;
    expect(await setPrintCover(c!.id)).toEqual({ ok: false, error: "photo_not_found" });

    caller = alice;
    expect(await setPrintCover(c!.id)).toEqual({ ok: true });
    expect((await photosOf(print.id)).map((p) => p.id)).toEqual([c!.id, a!.id, b!.id]);
  });

  it("deletes the blobs and closes the gap", async () => {
    const print = await makePrint(alice);
    for (let i = 0; i < 3; i++) await upload(alice, print.id);
    const [a, b, c] = await photosOf(print.id);

    caller = bob;
    expect(await deletePrintPhoto(a!.id)).toEqual({ ok: false, error: "photo_not_found" });
    expect(blobs.has(a!.pathname)).toBe(true);

    caller = alice;
    expect(await deletePrintPhoto(a!.id)).toEqual({ ok: true });
    expect(blobs.has(a!.pathname)).toBe(false);
    expect(blobs.has(a!.thumbPathname)).toBe(false);
    expect((await photosOf(print.id)).map((p) => [p.id, p.position])).toEqual([
      [b!.id, 0],
      [c!.id, 1],
    ]);
  });

  it("removes every photo blob when the print is deleted", async () => {
    const print = await makePrint(alice);
    await upload(alice, print.id);
    await upload(alice, print.id);
    const pathnames = (await photosOf(print.id)).flatMap((p) => [p.pathname, p.thumbPathname]);

    caller = alice;
    await expect(deletePrint(print.id)).rejects.toThrow(RedirectSignal);
    for (const pathname of pathnames) expect(blobs.has(pathname)).toBe(false);
    expect(await photosOf(print.id)).toHaveLength(0);
  });
});

describe("serving", () => {
  it("serves a photo to its owner only, with a fixed type and nosniff", async () => {
    const print = await makePrint(alice);
    await upload(alice, print.id);
    const [photo] = await photosOf(print.id);

    caller = alice;
    const own = await ownerGet(photo!.id);
    expect(own.status).toBe(200);
    expect(own.headers.get("content-type")).toBe("image/jpeg");
    expect(own.headers.get("x-content-type-options")).toBe("nosniff");
    expect(own.headers.get("cache-control")).toMatch(/^private/);
    expect((await own.arrayBuffer()).byteLength).toBe(64);
    expect((await (await ownerGet(photo!.id, "?size=thumb")).arrayBuffer()).byteLength).toBe(16);

    caller = bob;
    expect((await ownerGet(photo!.id)).status).toBe(404);
    caller = null;
    expect((await ownerGet(photo!.id)).status).toBe(404);
    caller = alice;
    expect((await ownerGet("does-not-exist")).status).toBe(404);
  });

  it("serves shared photos by token and position, uncached, and stops when sharing stops", async () => {
    const print = await makePrint(alice);
    await upload(alice, print.id);
    await upload(alice, print.id);

    caller = alice;
    await setPrintShared(print.id, true);
    const { shareToken } = await prisma.print.findUniqueOrThrow({ where: { id: print.id } });
    const token = shareToken!;

    const shared = await getSharedPrint(token);
    expect(shared?.print.photos).toEqual([
      { width: 1600, height: 1200 },
      { width: 1600, height: 1200 },
    ]);
    expect(JSON.stringify(shared)).not.toMatch(/pathname|"id"/);

    caller = null;
    const cover = await publicGet(token, "0");
    expect(cover.status).toBe(200);
    expect(cover.headers.get("cache-control")).toBe("private, no-store");
    expect((await publicGet(token, "1", "?size=thumb")).status).toBe(200);
    expect((await publicGet(token, "2")).status).toBe(404);
    expect((await publicGet(token, "abc")).status).toBe(404);
    expect((await publicGet(token, "99")).status).toBe(404);

    caller = alice;
    await setPrintShared(print.id, false);
    caller = null;
    expect((await publicGet(token, "0")).status).toBe(404);
  });

  it("serves nothing for a print that was never shared", async () => {
    const print = await makePrint(alice);
    await upload(alice, print.id);
    caller = null;
    expect((await publicGet("a".repeat(22), "0")).status).toBe(404);
  });
});

describe("deleting the account", () => {
  it("removes every photo blob of the workshop before the user goes", async () => {
    const carol = await makeCaller("carol");
    const print = await makePrint(carol);
    await upload(carol, print.id);
    await upload(carol, print.id);
    const pathnames = (await photosOf(print.id)).flatMap((p) => [p.pathname, p.thumbPathname]);
    const others = (await prisma.printPhoto.findMany({ where: { workshopId: alice.workshop.id } })).length;

    const user = await prisma.user.findUniqueOrThrow({ where: { id: carol.user.id } });
    await auth.options.user!.deleteUser!.beforeDelete!(user as never);
    for (const pathname of pathnames) expect(blobs.has(pathname)).toBe(false);
    expect(await prisma.printPhoto.count({ where: { workshopId: alice.workshop.id } })).toBe(others);
  });
});
