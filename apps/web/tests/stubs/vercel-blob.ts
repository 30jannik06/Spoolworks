/**
 * In-memory stand-in for @vercel/blob, aliased for every integration test.
 * The root .env holds the real store's token; no test may ever reach it
 * (writes count against the free monthly allowance, and the store is shared
 * with production).
 */

type Stored = { bytes: Uint8Array<ArrayBuffer>; contentType: string };

export const blobs = new Map<string, Stored>();

export async function put(
  pathname: string,
  body: Blob,
  options: { access: "private" | "public"; contentType?: string; allowOverwrite?: boolean },
) {
  if (options.access !== "private") throw new Error("test stub: photos must be private");
  if (blobs.has(pathname) && !options.allowOverwrite) throw new Error(`test stub: ${pathname} exists`);
  blobs.set(pathname, { bytes: new Uint8Array(await body.arrayBuffer()), contentType: options.contentType ?? "" });
  return { pathname, url: `https://blob.test/${pathname}` };
}

export async function get(pathname: string, options: { access: "private" | "public" }) {
  if (options.access !== "private") throw new Error("test stub: photos must be private");
  const stored = blobs.get(pathname);
  if (!stored) return null;
  return {
    statusCode: 200 as const,
    stream: new Blob([stored.bytes]).stream(),
    headers: new Headers(),
    blob: { pathname, contentType: stored.contentType, size: stored.bytes.length },
  };
}

export async function del(pathnames: string | string[]) {
  for (const pathname of Array.isArray(pathnames) ? pathnames : [pathnames]) blobs.delete(pathname);
}
