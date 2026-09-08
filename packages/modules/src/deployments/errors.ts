/** Orchestrator-level errors — dependency/state problems, distinct from provider `IntegrationError`s. */
export class OrchestratorError extends Error {
  constructor(
    public code: string,
    message: string,
  ) {
    super(message);
    this.name = "OrchestratorError";
  }
}
