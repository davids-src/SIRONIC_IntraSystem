import type { IntegrationProvider } from "@crm/types";

/** Label for error/log attribution — includes non-settings-page callers of `httpRequest` like the admin-sync caller. */
export type HttpProviderLabel = IntegrationProvider | "deployment";

/** Thrown by every integration client. Never carries secrets — only `safeMessage` reaches the UI. */
export class IntegrationError extends Error {
  constructor(
    public provider: HttpProviderLabel,
    public code: string,
    public safeMessage: string,
    public httpStatus?: number,
    public retryable = false,
    public cause?: unknown,
  ) {
    super(safeMessage);
    this.name = "IntegrationError";
  }
}

export class ProviderHttpError extends IntegrationError {
  constructor(
    provider: HttpProviderLabel,
    httpStatus: number,
    safeMessage: string,
    retryable = false,
    cause?: unknown,
  ) {
    super(provider, `HTTP_${httpStatus}`, safeMessage, httpStatus, retryable, cause);
    this.name = "ProviderHttpError";
  }
}
