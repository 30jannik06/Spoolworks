import { prisma } from "@spoolworks/database";

import { notFoundResponse, photoResponse, photosEnabled } from "@/lib/photos";
import { getSession, getWorkshopForUser } from "@/lib/session";

/**
 * A photo for its owner: /photos/<id>, or ?size=thumb. Missing, foreign and
 * signed-out all answer 404. Photos never change (a new upload is a new id),
 * so the owner's browser may keep them; nothing in between may (private).
 */
export async function GET(request: Request, { params }: RouteContext<"/photos/[id]">) {
  if (!photosEnabled()) return notFoundResponse();
  const session = await getSession();
  if (!session) return notFoundResponse();
  const workshop = await getWorkshopForUser(session.user.id);
  const { id } = await params;
  const photo = await prisma.printPhoto.findFirst({
    where: { id, workshopId: workshop.id },
    select: { pathname: true, thumbPathname: true, contentType: true },
  });
  if (!photo) return notFoundResponse();
  const thumb = new URL(request.url).searchParams.get("size") === "thumb";
  return photoResponse(thumb ? photo.thumbPathname : photo.pathname, photo.contentType, "private, max-age=31536000, immutable");
}
