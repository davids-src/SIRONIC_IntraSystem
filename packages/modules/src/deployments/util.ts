import type { Deployment, DeploymentStep, DeploymentStepKey } from "@crm/types";
import type {
  CloudflareClient,
  GithubClient,
  NpmClient,
  PortainerClient,
} from "@crm/integrations";
import { OrchestratorError } from "./errors";
import type { StepClients, StepContext } from "./types";

export function getStep(deployment: Deployment, key: DeploymentStepKey): DeploymentStep {
  const step = deployment.steps.find((s) => s.key === key);
  if (!step) {
    throw new OrchestratorError(
      "STEP_NOT_FOUND",
      `A(z) "${key}" lépés nem található ezen a deploymenten.`,
    );
  }
  return step;
}

export function requireClient<K extends keyof StepClients>(
  clients: StepClients,
  key: K,
): NonNullable<StepClients[K]> {
  const client = clients[key];
  if (!client) {
    throw new OrchestratorError(
      "INTEGRATION_MISSING",
      `Nincs beállítva "${key}" integrációs kapcsolat ehhez a tenanthoz.`,
    );
  }
  return client as NonNullable<StepClients[K]>;
}

export function cloudflare(ctx: StepContext): CloudflareClient {
  return requireClient(ctx.clients, "cloudflare");
}

export function npm(ctx: StepContext): NpmClient {
  return requireClient(ctx.clients, "npm");
}

export function portainer(ctx: StepContext): PortainerClient {
  return requireClient(ctx.clients, "portainer");
}

export function github(ctx: StepContext): GithubClient {
  return requireClient(ctx.clients, "github");
}

export function requireInput<T extends Record<string, unknown>>(
  input: Record<string, unknown> | undefined,
  field: keyof T & string,
): T[keyof T & string] {
  const value = input?.[field];
  if (value === undefined || value === null || value === "") {
    throw new OrchestratorError("INPUT_REQUIRED", `Hiányzó mező: "${field}".`);
  }
  return value as T[keyof T & string];
}
