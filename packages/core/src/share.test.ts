import { describe, expect, it } from "vitest";

import { galleryInput, generateShareToken, isShareToken, normalizeHandle } from "./share";

describe("generateShareToken", () => {
  it("makes 22 URL-safe characters", () => {
    for (let i = 0; i < 50; i++) {
      const token = generateShareToken();
      expect(token).toMatch(/^[A-Za-z0-9_-]{22}$/);
      expect(isShareToken(token)).toBe(true);
    }
  });

  it("encodes all 128 bits", () => {
    expect(generateShareToken(() => new Uint8Array(16))).toBe("AAAAAAAAAAAAAAAAAAAAAA");
    expect(generateShareToken(() => new Uint8Array(16).fill(255))).toBe("_____________________w");
  });

  it("differs between calls", () => {
    expect(new Set(Array.from({ length: 20 }, () => generateShareToken())).size).toBe(20);
  });
});

describe("isShareToken", () => {
  it("rejects anything else", () => {
    expect(isShareToken("short")).toBe(false);
    expect(isShareToken("A".repeat(23))).toBe(false);
    expect(isShareToken("AAAAAAAAAAAAAAAAAAAA/=")).toBe(false);
  });
});

describe("galleryInput", () => {
  const parse = (values: Record<string, string>) => galleryInput.safeParse(values);
  const error = (values: Record<string, string>) => {
    const result = parse(values);
    return result.success ? null : result.error.issues[0]?.message;
  };

  it("stores the handle lower-case", () => {
    expect(normalizeHandle("  Jannik-3D ")).toBe("jannik-3d");
    expect(parse({ publicHandle: " Jannik-3D ", galleryPublic: "1" }).data).toEqual({
      publicHandle: "jannik-3d",
      galleryPublic: true,
    });
  });

  it("allows no handle while the gallery is off", () => {
    expect(parse({ publicHandle: "" }).data).toEqual({ publicHandle: null, galleryPublic: false });
  });

  it("needs a handle for a public gallery", () => {
    expect(error({ publicHandle: "", galleryPublic: "on" })).toBe("handle_required");
  });

  it("rejects bad handles", () => {
    expect(error({ publicHandle: "ab" })).toBe("invalid_handle");
    expect(error({ publicHandle: "a".repeat(31) })).toBe("invalid_handle");
    expect(error({ publicHandle: "-jannik" })).toBe("invalid_handle");
    expect(error({ publicHandle: "jan--nik" })).toBe("invalid_handle");
    expect(error({ publicHandle: "jan nik" })).toBe("invalid_handle");
    expect(error({ publicHandle: "jänik" })).toBe("invalid_handle");
    expect(error({ publicHandle: "Settings" })).toBe("handle_reserved");
  });
});
