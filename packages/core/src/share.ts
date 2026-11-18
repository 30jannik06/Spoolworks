import { z } from "zod";

import type { RandomBytes } from "./short-code";

/**
 * Sharing: secret links for single prints (/p/<token>) and the public gallery
 * (/u/<handle>). The inventory is never public.
 */

const TOKEN_BYTES = 16; // 128 bits
const TOKEN_PATTERN = /^[A-Za-z0-9_-]{22}$/;
const BASE64URL = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";

const defaultRandom: RandomBytes = (count) => crypto.getRandomValues(new Uint8Array(count));

/** 128 random bits as 22 URL-safe characters. Not guessable, so the link itself is the permission. */
export function generateShareToken(random: RandomBytes = defaultRandom): string {
  const bytes = random(TOKEN_BYTES);
  let bits = 0;
  let value = 0;
  let token = "";
  for (const byte of bytes) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 6) {
      bits -= 6;
      token += BASE64URL[(value >> bits) & 63];
    }
  }
  if (bits > 0) token += BASE64URL[(value << (6 - bits)) & 63];
  return token;
}

/** Cheap shape check before a token reaches the database. */
export function isShareToken(input: string): boolean {
  return TOKEN_PATTERN.test(input);
}

/** Paths under the app root that a handle must not shadow in copy or links. */
const RESERVED_HANDLES = new Set([
  "admin",
  "api",
  "auth",
  "labels",
  "login",
  "new",
  "p",
  "printers",
  "prints",
  "s",
  "settings",
  "spoolworks",
  "spools",
  "u",
  "weigh",
]);

export const HANDLE_MIN = 3;
export const HANDLE_MAX = 30;

/** Handles are stored and looked up lower-case; the unique index is case-sensitive. */
export function normalizeHandle(input: string): string {
  return input.trim().toLowerCase();
}

const handle = z
  .string()
  .transform(normalizeHandle)
  .pipe(
    z
      .string()
      .min(HANDLE_MIN, "invalid_handle")
      .max(HANDLE_MAX, "invalid_handle")
      .regex(/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/, "invalid_handle")
      .refine((value) => !value.includes("--"), "invalid_handle")
      .refine((value) => !RESERVED_HANDLES.has(value), "handle_reserved"),
  );

/** Gallery settings form: an empty handle means "none"; a public gallery needs one. */
export const galleryInput = z
  .object({
    publicHandle: z
      .string()
      .optional()
      .transform((value) => (value === undefined || value.trim() === "" ? null : value))
      .pipe(handle.nullable()),
    galleryPublic: z
      .string()
      .optional()
      .transform((value) => value === "1" || value === "on"),
  })
  .superRefine((value, ctx) => {
    if (value.galleryPublic && value.publicHandle === null) {
      ctx.addIssue({ code: "custom", path: ["publicHandle"], message: "handle_required" });
    }
  });

export type GalleryInput = z.infer<typeof galleryInput>;
