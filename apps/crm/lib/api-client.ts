export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public body?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

const defaultInit: RequestInit = {
  credentials: "include",
  headers: { Accept: "application/json" },
};

/** Server errors are either a plain string or a Zod `.flatten()` object — never show "[object Object]". */
function extractErrorMessage(data: unknown, fallback: string): string {
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

export async function apiJson<T>(
  path: string,
  init?: RequestInit & { parseJson?: true },
): Promise<T> {
  const res = await fetch(path, { ...defaultInit, ...init });
  const text = await res.text();
  let data: unknown = null;
  if (text) {
    try {
      data = JSON.parse(text) as unknown;
    } catch {
      data = text;
    }
  }
  if (!res.ok) {
    const msg = extractErrorMessage(data, res.statusText || "Request failed");
    throw new ApiError(msg, res.status, data);
  }
  return data as T;
}

export async function apiJsonBody<T>(
  path: string,
  method: "POST" | "PATCH" | "PUT" | "DELETE",
  body?: unknown,
  init?: Omit<RequestInit, "body" | "method">,
): Promise<T> {
  return apiJson<T>(path, {
    ...init,
    method,
    headers: {
      ...defaultInit.headers,
      "Content-Type": "application/json",
      ...init?.headers,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}
