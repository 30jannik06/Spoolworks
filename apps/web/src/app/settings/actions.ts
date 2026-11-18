"use server";

import { galleryInput, thresholdInput } from "@spoolworks/core";
import { Prisma, prisma } from "@spoolworks/database";
import { refresh } from "next/cache";

import { fieldErrorsFrom, formToObject, type ActionState } from "@/lib/action-state";
import { requireWorkshop } from "@/lib/session";

export async function updateThreshold(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { workshop } = await requireWorkshop("/settings");
  const parsed = thresholdInput.safeParse(formToObject(formData));
  if (!parsed.success) {
    return { ok: false, error: "invalid_input", fieldErrors: fieldErrorsFrom(parsed.error) };
  }
  await prisma.workshop.update({
    where: { id: workshop.id },
    data: { lowStockThresholdG: parsed.data.lowStockThresholdG },
  });
  refresh();
  return { ok: true, value: parsed.data.lowStockThresholdG };
}

/**
 * Public gallery switch and handle. Turning it on publishes every print that
 * is already shared; a new handle breaks old gallery links (the copy says so).
 */
export async function updateGallery(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { workshop } = await requireWorkshop("/settings");
  const parsed = galleryInput.safeParse(formToObject(formData));
  if (!parsed.success) {
    return { ok: false, error: "invalid_input", fieldErrors: fieldErrorsFrom(parsed.error) };
  }
  try {
    await prisma.workshop.update({
      where: { id: workshop.id },
      data: { publicHandle: parsed.data.publicHandle, galleryPublic: parsed.data.galleryPublic },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { ok: false, error: "invalid_input", fieldErrors: { publicHandle: "handle_taken" } };
    }
    throw error;
  }
  refresh();
  return { ok: true };
}
