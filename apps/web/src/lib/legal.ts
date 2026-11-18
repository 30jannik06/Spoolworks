import { supportEmail } from "@/lib/mail";

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
 * Null until name and address are set.
 */
export function imprint(): Imprint | null {
  const name = process.env.IMPRINT_NAME?.trim();
  const address = (process.env.IMPRINT_ADDRESS ?? "")
    .split(",")
    .map((line) => line.trim())
    .filter(Boolean);
  if (!name || address.length === 0) return null;
  return { name, address, email: supportEmail() };
}
