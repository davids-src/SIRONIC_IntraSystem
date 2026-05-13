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

export async function apiJson<T>(path: string, init?: RequestInit): Promise<T> {
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
    const msg =
      typeof data === "object" && data !== null && "error" in data
        ? String((data as { error: unknown }).error)
        : res.statusText || "Request failed";
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
