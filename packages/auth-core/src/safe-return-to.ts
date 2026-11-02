/**
 * Validates a `return_to` value is a same-origin path before following it after login.
 *
 * A prefix check (starts with "/", doesn't start with "//") is NOT enough: browsers treat a
 * backslash as a path separator for special schemes, so a string like "/\\evil.com" passes
 * that check yet resolves to "https://evil.com/" — this validates by actually resolving the
 * URL and comparing origins instead of pattern-matching the raw string.
 */
export function isSafeReturnTo(value: string, origin: string): boolean {
  if (!value.startsWith("/")) return false;
  try {
    return new URL(value, origin).origin === origin;
  } catch {
    return false;
  }
}
