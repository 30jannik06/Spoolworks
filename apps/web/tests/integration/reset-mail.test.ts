import { randomUUID } from "node:crypto";

import { prisma } from "@spoolworks/database";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * "Passwort vergessen" with SMTP configured: Better Auth stores the token and
 * hands the mail to lib/mail.ts. Sending itself is replaced by a recorder; the
 * mail text and the rest of the flow are real.
 */

const sent: { to: string; subject: string; text: string; html: string }[] = [];

vi.mock("@/lib/mail", async (importOriginal) => {
  const real = await importOriginal<typeof import("@/lib/mail")>();
  return { ...real, sendMail: async (mail: (typeof sent)[number]) => void sent.push(mail) };
});
vi.mock("next/headers", () => ({
  cookies: async () => ({ set: () => {}, get: () => undefined, getAll: () => [] }),
  headers: async () => new Headers(),
}));

// Must be set before lib/auth.ts is loaded: the reset sender is wired at start-up.
process.env.SMTP_USER = "spoolworks-test@example.com";
process.env.SMTP_PASSWORD = "not-a-real-app-password";
const { auth } = await import("@/lib/auth");

const tag = `itest-${randomUUID().slice(0, 8)}`;
const OLD = "altes-passwort-1";
const NEW = "neues-passwort-2";

beforeEach(() => {
  sent.length = 0;
});

afterAll(async () => {
  await prisma.user.deleteMany({ where: { email: { startsWith: tag } } });
  // process.env is shared with later test files in the same worker.
  delete process.env.SMTP_USER;
  delete process.env.SMTP_PASSWORD;
});

async function canSignIn(email: string, password: string) {
  try {
    await auth.api.signInEmail({ body: { email, password } });
    return true;
  } catch {
    return false;
  }
}

/** The token at the end of the reset link in a mail's plain-text part. */
function tokenOf(mail: (typeof sent)[number]): string {
  const url = mail.text.split("\n").find((line) => line.startsWith("http"))!;
  return new URL(url).pathname.split("/").at(-1)!;
}

describe("reset by mail", () => {
  it("mails a link that sets a new password once", async () => {
    const email = `${tag}-mail@spoolworks.test`;
    await auth.api.signUpEmail({ body: { email, password: OLD, name: "Mia <b>" } });

    await auth.api.requestPasswordReset({ body: { email: email.toUpperCase(), redirectTo: "/auth/reset" } });
    expect(sent).toHaveLength(1);
    const mail = sent[0]!;
    expect(mail.to).toBe(email);
    expect(mail.subject).toBe("SpoolWorks: Passwort zurücksetzen");
    const url = mail.text.split("\n").find((line) => line.startsWith("http"))!;
    expect(url).toMatch(/\/api\/auth\/reset-password\/[^?]+\?callbackURL=%2Fauth%2Freset$/);
    expect(mail.text).toContain("Hallo Mia <b>,");
    expect(mail.html).toContain("Hallo Mia &#60;b&#62;,"); // names are escaped in HTML
    expect(mail.html).not.toContain("<b>");

    const token = new URL(url).pathname.split("/").at(-1)!;
    await auth.api.resetPassword({ body: { newPassword: NEW, token } });
    expect(sent.map((m) => m.subject)).toEqual(["SpoolWorks: Passwort zurücksetzen", "SpoolWorks: Dein Passwort wurde geändert"]);
    expect(sent[1]!.to).toBe(email);
    expect(await canSignIn(email, NEW)).toBe(true);
    expect(await canSignIn(email, OLD)).toBe(false);
    await expect(auth.api.resetPassword({ body: { newPassword: "drittes-passwort", token } })).rejects.toMatchObject({
      body: { code: "INVALID_TOKEN" },
    });
  });

  it("only the newest mailed link works", async () => {
    const email = `${tag}-twice@spoolworks.test`;
    await auth.api.signUpEmail({ body: { email, password: OLD, name: "Twice" } });
    await auth.api.requestPasswordReset({ body: { email } });
    await auth.api.requestPasswordReset({ body: { email } });
    const [first, second] = sent.map(tokenOf);
    await expect(auth.api.resetPassword({ body: { newPassword: NEW, token: first! } })).rejects.toMatchObject({
      body: { code: "INVALID_TOKEN" },
    });
    await auth.api.resetPassword({ body: { newPassword: NEW, token: second! } });
    expect(await canSignIn(email, NEW)).toBe(true);
  });

  it("tells the owner when the password was changed in settings", async () => {
    const email = `${tag}-change@spoolworks.test`;
    await auth.api.signUpEmail({ body: { email, password: OLD, name: "Change" } });
    const signIn = await auth.api.signInEmail({ body: { email, password: OLD }, returnHeaders: true });
    const headers = new Headers({ cookie: signIn.headers.get("set-cookie")?.split(";")[0] ?? "" });
    sent.length = 0;

    await expect(
      auth.api.changePassword({ body: { currentPassword: "falsch-falsch", newPassword: NEW }, headers }),
    ).rejects.toMatchObject({ body: { code: "INVALID_PASSWORD" } });
    expect(sent).toHaveLength(0); // a failed attempt sends nothing

    await auth.api.changePassword({ body: { currentPassword: OLD, newPassword: NEW, revokeOtherSessions: true }, headers });
    expect(sent).toHaveLength(1);
    expect(sent[0]).toMatchObject({ to: email, subject: "SpoolWorks: Dein Passwort wurde geändert" });
    expect(sent[0]!.text).toContain("/auth/forgot");
  });

  it("answers the same for unknown addresses, without sending", async () => {
    const result = await auth.api.requestPasswordReset({ body: { email: `${tag}-nobody@spoolworks.test` } });
    expect(result).toMatchObject({ status: true });
    expect(sent).toHaveLength(0);
  });
});
