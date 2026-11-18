import { randomUUID } from "node:crypto";

import { generateShortCode } from "@spoolworks/core";
import { prisma } from "@spoolworks/database";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Account basics against the local database: admin-made reset links (the
 * password reset path without a mail service) and deleting an account with
 * all its data. Better Auth runs for real; only "who is calling" is mocked.
 */

type Caller = { user: { id: string; name: string; email: string }; workshop: { id: string } };
let caller: Caller | null = null;

class NotFoundSignal extends Error {}
class RedirectSignal extends Error {}

vi.mock("@/lib/session", () => ({
  requireWorkshop: async () => {
    if (!caller) throw new RedirectSignal("/auth/login");
    return caller;
  },
}));
vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new NotFoundSignal();
  },
  redirect: (url: string) => {
    throw new RedirectSignal(url);
  },
}));
// Better Auth's nextCookies plugin writes cookies after sign-in; there is no request here.
vi.mock("next/headers", () => ({
  cookies: async () => ({ set: () => {}, get: () => undefined, getAll: () => [] }),
  headers: async () => new Headers(),
}));

const { createResetLink } = await import("@/app/admin/actions");
const { auth } = await import("@/lib/auth");

const tag = `itest-${randomUUID().slice(0, 8)}`;
const adminEmail = `${tag}-admin@spoolworks.test`;
const OLD = "altes-passwort-1";
const NEW = "neues-passwort-2";
let admin: Caller;

async function signUp(name: string): Promise<Caller> {
  const email = `${tag}-${name}@spoolworks.test`;
  const result = await auth.api.signUpEmail({ body: { email, password: OLD, name } });
  const workshop = await prisma.workshop.findUniqueOrThrow({ where: { ownerId: result.user.id } });
  return { user: { id: result.user.id, name, email }, workshop: { id: workshop.id } };
}

async function canSignIn(email: string, password: string) {
  try {
    await auth.api.signInEmail({ body: { email, password } });
    return true;
  } catch {
    return false;
  }
}

function form(values: Record<string, string>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(values)) data.set(key, value);
  return data;
}

function tokenFrom(path: string | undefined): string {
  const token = new URL(path ?? "", "http://x").searchParams.get("token");
  expect(token).toMatch(/^[A-Za-z0-9_-]{22}$/);
  return token!;
}

beforeAll(async () => {
  process.env.ADMIN_EMAILS = `someone@example.com, ${adminEmail.toUpperCase()}`;
  admin = await signUp("admin");
});

beforeEach(() => {
  caller = null;
});

afterAll(async () => {
  await prisma.user.deleteMany({ where: { email: { startsWith: tag } } });
  await prisma.filamentProduct.deleteMany({ where: { brand: { name: { startsWith: tag } } } });
  await prisma.brand.deleteMany({ where: { name: { startsWith: tag } } });
});

describe("admin reset links", () => {
  it("lets the account owner set a new password exactly once", async () => {
    const user = await signUp("forgetful");
    caller = admin;
    const result = await createResetLink({ ok: false }, form({ email: `  ${user.user.email.toUpperCase()} ` }));
    expect(result.ok).toBe(true);
    const token = tokenFrom(result.text);

    await auth.api.resetPassword({ body: { newPassword: NEW, token } });
    expect(await canSignIn(user.user.email, NEW)).toBe(true);
    expect(await canSignIn(user.user.email, OLD)).toBe(false);
    await expect(auth.api.resetPassword({ body: { newPassword: "drittes-passwort", token } })).rejects.toMatchObject({
      body: { code: "INVALID_TOKEN" },
    });
  });

  it("invalidates older links when a new one is made", async () => {
    const user = await signUp("twice");
    caller = admin;
    const first = tokenFrom((await createResetLink({ ok: false }, form({ email: user.user.email }))).text);
    caller = admin;
    const second = tokenFrom((await createResetLink({ ok: false }, form({ email: user.user.email }))).text);
    await expect(auth.api.resetPassword({ body: { newPassword: NEW, token: first } })).rejects.toMatchObject({
      body: { code: "INVALID_TOKEN" },
    });
    await auth.api.resetPassword({ body: { newPassword: NEW, token: second } });
    expect(await canSignIn(user.user.email, NEW)).toBe(true);
  });

  it("does not exist for anyone else", async () => {
    const user = await signUp("curious");
    caller = user;
    await expect(createResetLink({ ok: false }, form({ email: admin.user.email }))).rejects.toBeInstanceOf(
      NotFoundSignal,
    );
    expect(await prisma.verification.count({ where: { value: admin.user.id } })).toBe(0);
  });

  it("reports unknown and malformed addresses", async () => {
    caller = admin;
    expect(await createResetLink({ ok: false }, form({ email: `${tag}-nobody@spoolworks.test` }))).toEqual({
      ok: false,
      error: "invalid_input",
      fieldErrors: { email: "account_not_found" },
    });
    caller = admin;
    expect(await createResetLink({ ok: false }, form({ email: "nope" }))).toMatchObject({
      fieldErrors: { email: "invalid_email" },
    });
  });

  it("keeps the public reset request switched off", async () => {
    await expect(
      auth.api.requestPasswordReset({ body: { email: admin.user.email } }),
    ).rejects.toMatchObject({ body: { code: "RESET_PASSWORD_DISABLED" } });
  });
});

describe("deleting an account", () => {
  it("removes the workshop with everything in it, but not the shared catalog", async () => {
    const user = await signUp("leaving");
    const brand = await prisma.brand.create({ data: { name: `${tag} Brand`, nameKey: `${tag} brand` } });
    const product = await prisma.filamentProduct.create({
      data: { brandId: brand.id, productLine: "PLA", material: "PLA", colorName: "Black", colorHex: "#000000", netWeightG: 1000, createdById: user.user.id },
    });
    const spool = await prisma.spool.create({
      data: { workshopId: user.workshop.id, productId: product.id, shortCode: generateShortCode(), emptySpoolWeightG: 200, remainingG: 900 },
    });
    await prisma.print.create({
      data: { workshopId: user.workshop.id, name: "Weg damit", status: "PRINTED", shareToken: `${tag}-token`.slice(0, 22), usages: { create: { spoolId: spool.id, grams: 10 } } },
    });
    const signIn = await auth.api.signInEmail({ body: { email: user.user.email, password: OLD }, returnHeaders: true });
    const cookie = signIn.headers.get("set-cookie")?.split(";")[0] ?? "";

    await expect(
      auth.api.deleteUser({ body: { password: "falsch-falsch" }, headers: new Headers({ cookie }) }),
    ).rejects.toMatchObject({ body: { code: "INVALID_PASSWORD" } });
    expect(await prisma.user.count({ where: { id: user.user.id } })).toBe(1);

    await auth.api.deleteUser({ body: { password: OLD }, headers: new Headers({ cookie }) });
    expect(await prisma.user.count({ where: { id: user.user.id } })).toBe(0);
    expect(await prisma.workshop.count({ where: { id: user.workshop.id } })).toBe(0);
    expect(await prisma.spool.count({ where: { id: spool.id } })).toBe(0);
    expect(await prisma.print.count({ where: { workshopId: user.workshop.id } })).toBe(0);
    expect(await prisma.session.count({ where: { userId: user.user.id } })).toBe(0);
    expect(await prisma.filamentProduct.findUnique({ where: { id: product.id } })).toMatchObject({ createdById: null });
  });
});
