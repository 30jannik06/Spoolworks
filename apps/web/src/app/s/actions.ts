"use server";

import { normalizeShortCode } from "@spoolworks/core";
import { redirect } from "next/navigation";

import type { ActionState } from "@/lib/action-state";
import { findSpoolIdByCode } from "@/lib/queries/spools";
import { requireWorkshop } from "@/lib/session";

/** "Code eingeben": the fallback when a label can't be scanned. Opens the spool or says why not. */
export async function openSpoolCode(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { workshop } = await requireWorkshop("/s");
  const input = formData.get("code");
  const code = typeof input === "string" ? normalizeShortCode(input) : null;
  if (!code) return { ok: false, fieldErrors: { code: "invalid_code" } };
  const spoolId = await findSpoolIdByCode(workshop.id, code);
  // Unknown and foreign codes look the same.
  if (!spoolId) return { ok: false, fieldErrors: { code: "code_not_found" } };
  redirect(`/spools/${spoolId}`);
}
