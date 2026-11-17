/**
 * German messages for Better Auth error codes.
 *
 * Better Auth returns English `error.message`. Forms map the stable
 * `error.code` instead; never render `error.message`. Codes verified against
 * better-auth 1.7.25 (@better-auth/core BASE_ERROR_CODES).
 */
const MESSAGES: Record<string, string> = {
  // Sign-in: identical text for "wrong password" and "no such user", so nobody
  // can probe which emails have accounts.
  INVALID_EMAIL_OR_PASSWORD: "E-Mail oder Passwort ist falsch.",
  INVALID_PASSWORD: "E-Mail oder Passwort ist falsch.",
  USER_EMAIL_NOT_FOUND: "E-Mail oder Passwort ist falsch.",
  USER_NOT_FOUND: "E-Mail oder Passwort ist falsch.",
  CREDENTIAL_ACCOUNT_NOT_FOUND: "E-Mail oder Passwort ist falsch.",
  EMAIL_NOT_VERIFIED: "Bitte bestätige zuerst deine E-Mail-Adresse.",

  // Sign-up
  USER_ALREADY_EXISTS: "Für diese E-Mail gibt es bereits ein Konto.",
  USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL: "Für diese E-Mail gibt es bereits ein Konto.",
  INVALID_EMAIL: "Diese E-Mail-Adresse sieht nicht gültig aus.",
  PASSWORD_TOO_SHORT: "Das Passwort ist zu kurz.",
  PASSWORD_TOO_LONG: "Das Passwort ist zu lang.",
  FAILED_TO_CREATE_USER: "Das Konto konnte nicht erstellt werden.",

  // Session
  FAILED_TO_CREATE_SESSION: "Anmeldung fehlgeschlagen. Bitte versuch es erneut.",
  SESSION_EXPIRED: "Deine Sitzung ist abgelaufen. Bitte melde dich erneut an.",
};

const FALLBACK = "Etwas ist schiefgelaufen. Bitte versuch es erneut.";

export function authErrorMessage(
  error: { code?: string | undefined } | null | undefined,
): string {
  if (!error?.code) return FALLBACK;
  return MESSAGES[error.code] ?? FALLBACK;
}
