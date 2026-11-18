import { describe, expect, it } from "vitest";

import { isAdminEmail, parseAdminEmails, resetLinkInput } from "./account";

describe("parseAdminEmails", () => {
  it("splits, trims and lower-cases", () => {
    expect([...parseAdminEmails(" Jannik@Example.com, b@example.com;c@example.com\nd@example.com ")]).toEqual([
      "jannik@example.com",
      "b@example.com",
      "c@example.com",
      "d@example.com",
    ]);
  });

  it("makes nobody admin when unset or junk", () => {
    expect(parseAdminEmails(undefined).size).toBe(0);
    expect(parseAdminEmails("").size).toBe(0);
    expect(parseAdminEmails("replace-me").size).toBe(0);
  });
});

describe("isAdminEmail", () => {
  const admins = parseAdminEmails("jannik@example.com");
  it("matches case-insensitively", () => {
    expect(isAdminEmail("Jannik@Example.com", admins)).toBe(true);
    expect(isAdminEmail("other@example.com", admins)).toBe(false);
    expect(isAdminEmail(undefined, admins)).toBe(false);
  });
});

describe("resetLinkInput", () => {
  it("normalizes the address", () => {
    expect(resetLinkInput.parse({ email: "  Someone@Example.COM " })).toEqual({ email: "someone@example.com" });
  });

  it("rejects empty and malformed input", () => {
    expect(resetLinkInput.safeParse({ email: "" }).error?.issues[0]?.message).toBe("required");
    expect(resetLinkInput.safeParse({ email: "nope" }).error?.issues[0]?.message).toBe("invalid_email");
  });
});
