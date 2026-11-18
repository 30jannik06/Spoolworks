import "server-only";

import { randomBytes } from "node:crypto";

import { photoExtension, type PhotoType } from "@spoolworks/core";
import { prisma } from "@spoolworks/database";
import { del, get, put } from "@vercel/blob";

/**
 * Print photos in the private Vercel Blob store. Production, previews and
 * local development share one store but not one database, so:
 *
 * - every pathname is random and stored in its row; nothing is ever found or
 *   deleted by listing a prefix;
 * - blobs are deleted by the exact pathnames of the rows being deleted, before
 *   the rows go (del is safe to retry; a row without its blob would 404).
 *
 * Photos are never public in Blob: the app streams them after its own check
 * (owner session, or a shared print's token).
 */

/** Without a token the photo UI stays off, like mail without SMTP. */
export function photosEnabled(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

function envPrefix(): string {
  return process.env.VERCEL_ENV ?? "local";
}

export function newPhotoPathnames(workshopId: string, type: PhotoType) {
  const id = randomBytes(16).toString("base64url");
  const ext = photoExtension(type);
  const base = `${envPrefix()}/w/${workshopId}/${id}`;
  return { pathname: `${base}.${ext}`, thumbPathname: `${base}-thumb.${ext}` };
}

export async function storePhoto(pathname: string, body: Blob, contentType: PhotoType) {
  await put(pathname, body, { access: "private", contentType, addRandomSuffix: false, allowOverwrite: false });
}

export async function deleteBlobs(pathnames: string[]) {
  for (let i = 0; i < pathnames.length; i += 100) {
    const batch = pathnames.slice(i, i + 100);
    if (batch.length > 0) await del(batch);
  }
}

/** Every blob of a workshop's photos, e.g. before deleting the account. */
export async function workshopPhotoPathnames(workshopId: string): Promise<string[]> {
  const rows = await prisma.printPhoto.findMany({ where: { workshopId }, select: { pathname: true, thumbPathname: true } });
  return rows.flatMap((row) => [row.pathname, row.thumbPathname]);
}

const ALLOWED_TYPES = new Set<string>(["image/jpeg", "image/webp"]);

/**
 * Streams one blob as the response body. The content type comes from our own
 * row (and a whitelist), never from Blob or the uploader; nosniff stops the
 * browser from guessing anything else.
 */
export async function photoResponse(pathname: string, contentType: string, cacheControl: string): Promise<Response> {
  if (!ALLOWED_TYPES.has(contentType)) return notFoundResponse();
  const result = await get(pathname, { access: "private" });
  if (!result || result.statusCode !== 200) return notFoundResponse();
  return new Response(result.stream, {
    headers: {
      "Content-Type": contentType,
      "Content-Length": String(result.blob.size),
      "Cache-Control": cacheControl,
      "X-Content-Type-Options": "nosniff",
      "Content-Disposition": "inline",
      "Cross-Origin-Resource-Policy": "same-origin",
    },
  });
}

export function notFoundResponse(): Response {
  return new Response("Not found", { status: 404, headers: { "Cache-Control": "no-store" } });
}
