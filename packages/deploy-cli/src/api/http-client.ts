import type { CliConfig } from "../config.js";
import { CliHttpError, extractErrorMessage } from "../http-error.js";

export interface CrmClient {
  get<T>(path: string): Promise<T>;
  post<T>(path: string, body?: unknown): Promise<T>;
}

export function createCrmClient(config: CliConfig, accessToken: string): CrmClient {
  async function request<T>(
    method: "GET" | "POST",
    path: string,
    body?: unknown,
  ): Promise<T> {
    const res = await fetch(new URL(path, config.crmUrl).toString(), {
      method,
      headers: {
        authorization: `Bearer ${accessToken}`,
        ...(body !== undefined ? { "content-type": "application/json" } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    const text = await res.text();
    let data: unknown = null;
    if (text) {
      try {
        data = JSON.parse(text);
      } catch {
        data = text;
      }
    }
    if (!res.ok) {
      if (res.status === 401) {
        throw new CliHttpError(
          "Session rejected by CRM — run: sironic-deploy login",
          401,
          data,
        );
      }
      throw new CliHttpError(
        extractErrorMessage(data, res.statusText || "Request failed"),
        res.status,
        data,
      );
    }
    return data as T;
  }

  return {
    get: (path) => request("GET", path),
    post: (path, body) => request("POST", path, body),
  };
}
