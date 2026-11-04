export class CliHttpError extends Error {
  constructor(
    message: string,
    public status: number,
    public body?: unknown,
  ) {
    super(message);
    this.name = "CliHttpError";
  }
}

/** Mirrors apps/crm/lib/api-client.ts's extractErrorMessage — same server, same error
 * shape (plain string or a Zod `.flatten()` object) — so CLI errors read the same as the
 * ones the CRM web UI would show for the same mistake. */
export function extractErrorMessage(data: unknown, fallback: string): string {
  if (typeof data !== "object" || data === null || !("error" in data)) return fallback;
  const err = (data as { error: unknown }).error;
  if (typeof err === "string") return err;
  if (err && typeof err === "object") {
    const flat = err as { formErrors?: unknown; fieldErrors?: Record<string, unknown> };
    const parts: string[] = [];
    if (Array.isArray(flat.formErrors)) parts.push(...flat.formErrors.map(String));
    if (flat.fieldErrors && typeof flat.fieldErrors === "object") {
      for (const [field, messages] of Object.entries(flat.fieldErrors)) {
        if (Array.isArray(messages) && messages.length > 0) {
          parts.push(`${field}: ${messages.join(", ")}`);
        }
      }
    }
    if (parts.length > 0) return parts.join(" | ");
    try {
      return JSON.stringify(err);
    } catch {
      return fallback;
    }
  }
  return fallback;
}
