const SENSITIVE_KEYS = [
  "token",
  "api_token",
  "api_key",
  "apikey",
  "password",
  "secret",
  "authorization",
  "dns_provider_credentials",
  "encrypted_credentials",
  "jwt",
];

function isSensitiveKey(key: string): boolean {
  const lower = key.toLowerCase();
  return SENSITIVE_KEYS.some((needle) => lower.includes(needle));
}

/** Deep-clones `value`, replacing any key that looks like a credential with "***". Safe for logs/events. */
export function redact(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => redact(item));
  }
  if (value !== null && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      out[key] = isSensitiveKey(key) ? "***" : redact(val);
    }
    return out;
  }
  return value;
}

/** Redacts a raw header bag (e.g. fetch request headers) before logging. */
export function redactHeaders(headers: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, val] of Object.entries(headers)) {
    out[key] = isSensitiveKey(key) ? "***" : val;
  }
  return out;
}
