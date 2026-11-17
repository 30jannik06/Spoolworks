/**
 * Only same-origin paths are honoured as a post-login destination. Otherwise
 * `?next=https://evil.example` would make the login form an open redirect.
 */
export function safeNext(next: string | null | undefined): string | null {
  if (!next) return null;
  // "//host" is protocol-relative and "/\host" is treated the same by browsers.
  return next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/\\")
    ? next
    : null;
}
