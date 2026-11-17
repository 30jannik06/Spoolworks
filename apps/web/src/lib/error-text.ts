import { de } from "@/messages/de";

type ErrorKey = keyof typeof de.errors;

/** Translates an error key from an ActionState into German; unknown keys fall back. */
export function errorText(key: string | undefined): string | undefined {
  if (!key) return undefined;
  return key in de.errors ? de.errors[key as ErrorKey] : de.errors.fallback;
}
