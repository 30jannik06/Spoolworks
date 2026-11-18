import { connection } from "next/server";

import { getSharedPhoto } from "@/lib/queries/public";
import { notFoundResponse, photoResponse, photosEnabled } from "@/lib/photos";

/**
 * A shared print's photo for anyone with the link: /p/<token>/photos/<n>
 * (0 = cover), or ?size=thumb. No ids in the URL. Never cached, so stopping
 * the share hides the photos on the next request, like the page itself.
 */
export async function GET(request: Request, { params }: RouteContext<"/p/[token]/photos/[position]">) {
  await connection();
  if (!photosEnabled()) return notFoundResponse();
  const { token, position } = await params;
  const photo = await getSharedPhoto(token, position);
  if (!photo) return notFoundResponse();
  const thumb = new URL(request.url).searchParams.get("size") === "thumb";
  return photoResponse(thumb ? photo.thumbPathname : photo.pathname, photo.contentType, "private, no-store");
}
