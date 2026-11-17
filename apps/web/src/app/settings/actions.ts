"use server";

import { thresholdInput } from "@spoolworks/core";
import { prisma } from "@spoolworks/database";
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
