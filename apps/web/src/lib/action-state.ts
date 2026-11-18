import type { ZodError } from "zod";

/**
 * What a form action returns to useActionState. Error values are keys from
 * de.errors, never English text and never raw exception messages.
 */
export type ActionState = {
  ok: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
  /** Optional payload for the client, e.g. the new remaining weight. */
  value?: number;
  /** Optional text payload, e.g. the path of a freshly created reset link. */
  text?: string;
};

export const initialActionState: ActionState = { ok: false };

/** First issue per field, keyed by the dotted path ("product.colorHex"). */
export function fieldErrorsFrom(error: ZodError): Record<string, string> {
  const result: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_form";
    if (!(key in result)) result[key] = issue.message;
  }
  return result;
}

/** FormData → plain object of strings; nested names use dots ("product.brandName"). */
export function formToObject(formData: FormData): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of formData.entries()) {
    if (typeof value !== "string" || key.startsWith("$ACTION")) continue;
    const parts = key.split(".");
    let target = result;
    for (const part of parts.slice(0, -1)) {
      target[part] ??= {};
      target = target[part] as Record<string, unknown>;
    }
    target[parts.at(-1) ?? key] = value;
  }
  return result;
}
