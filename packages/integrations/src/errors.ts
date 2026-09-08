import type { IntegrationProvider } from "@crm/types";

/** Thrown by every integration client. Never carries secrets — only `safeMessage` reaches the UI. */
export class IntegrationError extends Error {
  constructor(
    public provider: IntegrationProvider,
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
    provider: IntegrationProvider,
    httpStatus: number,
    safeMessage: string,
    retryable = false,
    cause?: unknown,
  ) {
    super(provider, `HTTP_${httpStatus}`, safeMessage, httpStatus, retryable, cause);
    this.name = "ProviderHttpError";
  }
}
