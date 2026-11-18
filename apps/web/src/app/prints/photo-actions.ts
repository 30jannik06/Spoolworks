"use server";

import {
  coverOrder,
  PHOTO_MAX_BYTES,
  PHOTO_MAX_EDGE,
  PRINT_PHOTO_LIMIT,
  sniffPhotoType,
  THUMB_MAX_BYTES,
} from "@spoolworks/core";
import { prisma, Prisma } from "@spoolworks/database";
import { refresh } from "next/cache";

import type { ActionState } from "@/lib/action-state";
import { deleteBlobs, newPhotoPathnames, photosEnabled, storePhoto } from "@/lib/photos";
import { requireWorkshop } from "@/lib/session";

/**
 * Upload, cover and delete for print photos. The browser sends an already
 * shrunk and re-encoded JPEG/WebP plus its thumbnail; everything is checked
 * again here. Every action scopes by workshop: foreign and missing look alike.
 */

function dimension(value: FormDataEntryValue | null): number | null {
  const n = typeof value === "string" ? Number(value) : NaN;
  return Number.isInteger(n) && n >= 1 && n <= PHOTO_MAX_EDGE ? n : null;
}

async function readPhoto(entry: FormDataEntryValue | null, maxBytes: number) {
  if (!(entry instanceof File) || entry.size === 0) return { error: "photo_invalid" as const };
  if (entry.size > maxBytes) return { error: "photo_too_large" as const };
  const bytes = new Uint8Array(await entry.arrayBuffer());
  const type = sniffPhotoType(bytes);
  if (!type) return { error: "photo_invalid" as const };
  return { bytes, type };
}

export async function uploadPrintPhoto(printId: string, formData: FormData): Promise<ActionState> {
  const { workshop } = await requireWorkshop();
  if (!photosEnabled()) return { ok: false, error: "photos_disabled" };

  const photo = await readPhoto(formData.get("photo"), PHOTO_MAX_BYTES);
  if ("error" in photo) return { ok: false, error: photo.error };
  const thumb = await readPhoto(formData.get("thumb"), THUMB_MAX_BYTES);
  if ("error" in thumb) return { ok: false, error: thumb.error };
  if (thumb.type !== photo.type) return { ok: false, error: "photo_invalid" };
  const width = dimension(formData.get("width"));
  const height = dimension(formData.get("height"));
  if (!width || !height) return { ok: false, error: "photo_invalid" };

  const print = await prisma.print.findFirst({
    where: { id: printId, workshopId: workshop.id },
    select: { id: true, _count: { select: { photos: true } } },
  });
  if (!print) return { ok: false, error: "print_not_found" };
  const position = print._count.photos;
  if (position >= PRINT_PHOTO_LIMIT) return { ok: false, error: "photo_limit" };

  const { pathname, thumbPathname } = newPhotoPathnames(workshop.id, photo.type);
  await storePhoto(pathname, new Blob([photo.bytes], { type: photo.type }), photo.type);
  await storePhoto(thumbPathname, new Blob([thumb.bytes], { type: thumb.type }), thumb.type);

  try {
    await prisma.printPhoto.create({
      data: {
        workshopId: workshop.id,
        printId: print.id,
        position,
        pathname,
        thumbPathname,
        contentType: photo.type,
        width,
        height,
        bytes: photo.bytes.length,
      },
    });
  } catch (error) {
    // A parallel upload took the same slot (unique printId + position): undo ours.
    await deleteBlobs([pathname, thumbPathname]);
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { ok: false, error: "photo_limit" };
    }
    throw error;
  }
  refresh();
  return { ok: true };
}

/** Writes positions 0..n-1 in the given order; parks them negative first so the unique index never trips. */
async function writeOrder(tx: Prisma.TransactionClient, ids: string[]) {
  for (const [index, id] of ids.entries()) {
    await tx.printPhoto.update({ where: { id }, data: { position: -1 - index } });
  }
  for (const [index, id] of ids.entries()) {
    await tx.printPhoto.update({ where: { id }, data: { position: index } });
  }
}

async function siblings(tx: Prisma.TransactionClient, workshopId: string, photoId: string) {
  const photo = await tx.printPhoto.findFirst({ where: { id: photoId, workshopId }, select: { printId: true } });
  if (!photo) return null;
  // Lock the print row so concurrent reorders and deletes run one after another.
  await tx.$queryRaw`SELECT id FROM "Print" WHERE id = ${photo.printId} FOR UPDATE`;
  return tx.printPhoto.findMany({
    where: { printId: photo.printId },
    orderBy: { position: "asc" },
    select: { id: true, pathname: true, thumbPathname: true },
  });
}

export async function setPrintCover(photoId: string): Promise<ActionState> {
  const { workshop } = await requireWorkshop();
  const done = await prisma.$transaction(async (tx) => {
    const photos = await siblings(tx, workshop.id, photoId);
    if (!photos) return false;
    const ids = photos.map((p) => p.id);
    await writeOrder(tx, coverOrder(ids, ids.indexOf(photoId)));
    return true;
  });
  if (!done) return { ok: false, error: "photo_not_found" };
  refresh();
  return { ok: true };
}

export async function deletePrintPhoto(photoId: string): Promise<ActionState> {
  const { workshop } = await requireWorkshop();
  const photo = await prisma.printPhoto.findFirst({
    where: { id: photoId, workshopId: workshop.id },
    select: { pathname: true, thumbPathname: true },
  });
  if (!photo) return { ok: false, error: "photo_not_found" };
  // Blob first: if this fails, the row stays and the user can try again.
  await deleteBlobs([photo.pathname, photo.thumbPathname]);
  await prisma.$transaction(async (tx) => {
    const photos = await siblings(tx, workshop.id, photoId);
    if (!photos) return;
    await tx.printPhoto.delete({ where: { id: photoId } });
    await writeOrder(
      tx,
      photos.map((p) => p.id).filter((id) => id !== photoId),
    );
  });
  refresh();
  return { ok: true };
}
