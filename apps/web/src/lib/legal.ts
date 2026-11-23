import { supportEmail } from "@/lib/mail";

/** AGPL-3.0: the running app offers its source in the imprint and the terms, not in every footer. */
export const SOURCE_URL = "https://github.com/30jannik06/Spoolworks";

export type Imprint = {
  name: string;
  /** Postal address, one entry per line. */
  address: string[];
  email: string | null;
};

/**
 * Provider details for the imprint and the privacy policy. They come from the
 * environment (IMPRINT_NAME, IMPRINT_ADDRESS with lines separated by commas,
 * contact SUPPORT_EMAIL) so a home address never lands in the public repo.
 * Null until a name is set; an empty address shows as "follows".
 */
export function imprint(): Imprint | null {
  const name = process.env.IMPRINT_NAME?.trim();
  const address = (process.env.IMPRINT_ADDRESS ?? "")
    .split(",")
    .map((line) => line.trim())
    .filter(Boolean);
  if (!name) return null;
  return { name, address, email: supportEmail() };
}
