import { Agent } from "undici";
import type { IntegrationProvider } from "@crm/types";
import { IntegrationError, ProviderHttpError } from "./errors";

const DEFAULT_TIMEOUT_MS = 30_000;
const MAX_RETRIES = 3;
const NON_RETRYABLE_STATUSES = new Set([400, 401, 403, 404, 409, 422]);

// Self-hosted admin panels (NPM, Portainer) are frequently reached over a self-signed
// certificate on an internal network. Shared across calls since it holds no per-request state.
let insecureAgent: Agent | null = null;
function getInsecureAgent(): Agent {
  if (!insecureAgent) {
    insecureAgent = new Agent({ connect: { rejectUnauthorized: false } });
  }
  return insecureAgent;
}

export interface HttpRequestOptions {
  provider: IntegrationProvider;
  method?: string;
  headers?: Record<string, string>;
  /** JSON-serializable body. Pass a string directly to send as-is (e.g. pre-built form bodies). */
  body?: unknown;
  timeoutMs?: number;
  /** Set false to disable the shared retry policy for this call (e.g. non-idempotent one-shot actions). */
  retry?: boolean;
  /**
   * Skip TLS certificate verification. Opt-in only, for self-hosted providers (NPM/Portainer) reached
   * over a self-signed certificate on a trusted internal network. Never used for Cloudflare/GitHub.
   */
  insecureTls?: boolean;
}

export interface HttpResponse {
  status: number;
  headers: Headers;
  text: string;
  json: unknown;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function backoffMs(attempt: number): number {
  return 250 * 2 ** attempt + Math.floor(Math.random() * 100);
}

function retryAfterMs(headers: Headers): number | null {
  const raw = headers.get("retry-after");
  if (!raw) return null;
  const seconds = Number(raw);
  if (Number.isFinite(seconds)) return seconds * 1000;
  const date = Date.parse(raw);
  if (!Number.isNaN(date)) return Math.max(0, date - Date.now());
  return null;
}

/** Best-effort extraction of a human-readable message from a provider's error JSON shape. */
function extractProviderMessage(json: unknown): string | null {
  if (!json || typeof json !== "object") return null;
  const obj = json as Record<string, unknown>;
  if (Array.isArray(obj.errors) && obj.errors.length > 0) {
    const first = obj.errors[0];
    if (first && typeof first === "object") {
      const msg = (first as Record<string, unknown>).message;
      if (typeof msg === "string") return msg;
    }
  }
  if (typeof obj.message === "string") return obj.message;
  if (typeof obj.error === "string") return obj.error;
  return null;
}

/** Node/undici network errors nest the real cause (ECONNREFUSED, self-signed cert, DNS, ...) under `.cause`. */
function describeNetworkError(err: unknown): string {
  if (err instanceof Error) {
    const cause = (err as Error & { cause?: unknown }).cause;
    const causeMessage =
      cause instanceof Error ? cause.message : typeof cause === "string" ? cause : null;
    return causeMessage ? `${err.message}: ${causeMessage}` : err.message;
  }
  return String(err);
}

async function parseBody(res: Response): Promise<{ text: string; json: unknown }> {
  const text = await res.text();
  if (!text) return { text, json: null };
  try {
    return { text, json: JSON.parse(text) };
  } catch {
    return { text, json: null };
  }
}

/**
 * Shared fetch wrapper: timeout, retry with exponential backoff + jitter on network error / 408 / 429 / 5xx,
 * honors `Retry-After` on 429. Never retries 400/401/403/404/409/422. Throws `IntegrationError` on final failure.
 */
export async function httpRequest(
  url: string,
  options: HttpRequestOptions,
): Promise<HttpResponse> {
  const {
    provider,
    method = "GET",
    headers = {},
    body,
    timeoutMs = DEFAULT_TIMEOUT_MS,
    retry = true,
    insecureTls = false,
  } = options;
  const maxAttempts = retry ? MAX_RETRIES + 1 : 1;

  let attempt = 0;
  let lastError: unknown = null;

  while (attempt < maxAttempts) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const init: RequestInit & { dispatcher?: Agent } = {
        method,
        headers,
        signal: controller.signal,
      };
      if (insecureTls) {
        init.dispatcher = getInsecureAgent();
      }
      if (body !== undefined) {
        init.body = typeof body === "string" ? body : JSON.stringify(body);
      }
      const res = await fetch(url, init);
      clearTimeout(timeout);
      const { text, json } = await parseBody(res);

      if (res.ok) {
        return { status: res.status, headers: res.headers, text, json };
      }

      const shouldRetry =
        retry &&
        attempt < maxAttempts - 1 &&
        !NON_RETRYABLE_STATUSES.has(res.status) &&
        (res.status === 408 || res.status === 429 || res.status >= 500);

      if (shouldRetry) {
        const wait =
          res.status === 429
            ? (retryAfterMs(res.headers) ?? backoffMs(attempt))
            : backoffMs(attempt);
        await sleep(wait);
        attempt += 1;
        continue;
      }

      const providerMessage = extractProviderMessage(json);
      throw new ProviderHttpError(
        provider,
        res.status,
        providerMessage
          ? `${provider} kérés sikertelen (HTTP ${res.status}): ${providerMessage}`
          : `${provider} kérés sikertelen (HTTP ${res.status})`,
        false,
        json ?? text,
      );
    } catch (err) {
      clearTimeout(timeout);
      if (err instanceof IntegrationError) throw err;

      lastError = err;
      const isAbort = err instanceof Error && err.name === "AbortError";
      const canRetry = retry && attempt < maxAttempts - 1;
      if (canRetry) {
        await sleep(backoffMs(attempt));
        attempt += 1;
        continue;
      }
      throw new IntegrationError(
        provider,
        isAbort ? "TIMEOUT" : "NETWORK_ERROR",
        isAbort
          ? `${provider} elérhetetlen (időtúllépés)`
          : `${provider} elérhetetlen: ${describeNetworkError(err)}`,
        undefined,
        false,
        err,
      );
    }
  }

  // Unreachable in practice — loop always returns or throws — but keeps TS happy.
  throw new IntegrationError(
    provider,
    "UNKNOWN",
    `${provider} kérés sikertelen`,
    undefined,
    false,
    lastError,
  );
}
