import type {
  ActorContext,
  Deployment,
  DeploymentStepKey,
  DeploymentStepStatus,
  IntegrationConnection,
  IntegrationProvider,
} from "@crm/types";
import type {
  CloudflareClient,
  GithubClient,
  NpmClient,
  PortainerClient,
} from "@crm/integrations";

export interface StepClients {
  cloudflare?: CloudflareClient;
  npm?: NpmClient;
  portainer?: PortainerClient;
  github?: GithubClient;
}

export interface StepContext {
  tenantId: string;
  deployment: Deployment;
  actor: ActorContext;
  clients: StepClients;
  connections: Partial<Record<IntegrationProvider, IntegrationConnection>>;
  now: Date;
}

export interface StepPlan {
  summary: string;
  mutations: Array<{ provider: string; action: string; target: string }>;
  warnings: string[];
}

export interface StepResult {
  status: DeploymentStepStatus;
  external_id?: string | null;
  message?: string;
  meta?: Record<string, unknown>;
  external_ids_patch?: Partial<Deployment["external_ids"]>;
  /** Rare: patches outside `steps`/`external_ids`, e.g. resolved `image.tag` on adopt. Dot-path keys. */
  deployment_patch?: Record<string, unknown>;
}

export interface StepVerifyResult {
  ok: boolean;
  drift: string[];
  message: string;
}

export interface StepHandler {
  key: DeploymentStepKey;
  dependsOn: DeploymentStepKey[];
  canSkip: boolean;
  plan(ctx: StepContext, input?: Record<string, unknown>): Promise<StepPlan>;
  execute(ctx: StepContext, input?: Record<string, unknown>): Promise<StepResult>;
  adopt(
    ctx: StepContext,
    input: { external_id: string } & Record<string, unknown>,
  ): Promise<StepResult>;
  verify(ctx: StepContext): Promise<StepVerifyResult>;
}
