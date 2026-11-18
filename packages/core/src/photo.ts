/**
 * Print photos: limits and the server-side file check. The browser shrinks
 * and re-encodes every photo before upload (that also drops EXIF data such as
 * GPS); the server trusts none of that and checks bytes and size itself.
 */

/** Photos per print: a cover plus two more. Raise it here, nowhere else. */
export const PRINT_PHOTO_LIMIT = 3;

/** Longest edge of the stored photo and its thumbnail, in pixels. */
export const PHOTO_MAX_EDGE = 1600;
export const THUMB_MAX_EDGE = 480;

/** Hard caps the server enforces (photo and thumbnail travel in one request, under the 1 MB action limit). */
export const PHOTO_MAX_BYTES = 750_000;
export const THUMB_MAX_BYTES = 150_000;

export type PhotoType = "image/jpeg" | "image/webp";

/** Identifies JPEG and WebP by their magic bytes; anything else (PNG, SVG, HTML, HEIC …) is null. */
export function sniffPhotoType(bytes: Uint8Array): PhotoType | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (
    bytes.length >= 12 &&
    String.fromCharCode(bytes[0]!, bytes[1]!, bytes[2]!, bytes[3]!) === "RIFF" &&
    String.fromCharCode(bytes[8]!, bytes[9]!, bytes[10]!, bytes[11]!) === "WEBP"
  ) {
    return "image/webp";
  }
  return null;
}

export function photoExtension(type: PhotoType): string {
  return type === "image/webp" ? "webp" : "jpg";
}

/** Scales width × height so the longest edge is at most `maxEdge`; never upscales. */
export function fitWithin(width: number, height: number, maxEdge: number): { width: number; height: number } {
  const longest = Math.max(width, height);
  if (longest <= maxEdge) return { width, height };
  const scale = maxEdge / longest;
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
}

/** Positions after moving the photo at `from` to the front (it becomes the cover); others keep their order. */
export function coverOrder<T>(items: T[], from: number): T[] {
  if (from <= 0 || from >= items.length) return items;
  return [items[from]!, ...items.slice(0, from), ...items.slice(from + 1)];
}
