import type { CrmClient } from "./http-client.js";
import type { Deployment, DeploymentEvent } from "@crm/types";

/** Mirrors apps/crm/app/api/deployments/route.ts's createSchema — the single-host shape
 * from the CRM wizard's "single" mode (apps/crm/app/(crm)/deployments/new/page.tsx). */
export interface CreateDeploymentInput {
  contact_id?: string | null;
  name: string;
  domain: string;
  www_redirect?: boolean;
  notes?: string | null;
  dns?: {
    record_type: "A" | "CNAME";
    name?: string;
    target: string;
    proxied?: boolean;
  };
  proxy?: {
    forward_host: string;
    forward_port: number;
    forward_scheme?: "http" | "https";
    websocket_support?: boolean;
  };
  image?: {
    repository: string;
    tag: string;
    workflow_id?: string | null;
  };
  stack?: {
    stack_name: string;
    template_id?: string | null;
    compose_yaml?: string | null;
    env?: Array<{ name: string; value: string }>;
  };
  package_id?: string | null;
  billing_cycle?: "monthly" | "quarterly" | "yearly" | null;
  price_override_huf?: number | null;
}

export function createDeployment(client: CrmClient, input: CreateDeploymentInput) {
  return client.post<Deployment>("/api/deployments", input);
}

export function getDeployment(client: CrmClient, id: string) {
  return client.get<Deployment>(`/api/deployments/${id}`);
}

export function listDeployments(
  client: CrmClient,
  query?: { q?: string; status?: string },
) {
  const params = new URLSearchParams();
  if (query?.q) params.set("q", query.q);
  if (query?.status) params.set("status", query.status);
  const qs = params.toString();
  return client.get<Deployment[]>(`/api/deployments${qs ? `?${qs}` : ""}`);
}

export interface RunResult {
  ran: string[];
  blocked: Array<{ key: string; reason: string }>;
  deployment: Deployment;
}

export function runNextSteps(client: CrmClient, id: string, maxSteps?: number) {
  return client.post<RunResult>(
    `/api/deployments/${id}/run`,
    maxSteps ? { max_steps: maxSteps } : {},
  );
}

export function redeploy(client: CrmClient, id: string, tag?: string) {
  return client.post<Deployment>(`/api/deployments/${id}/redeploy`, tag ? { tag } : {});
}

export function getEvents(client: CrmClient, id: string, cursor?: string, limit = 50) {
  const params = new URLSearchParams();
  if (cursor) params.set("cursor", cursor);
  params.set("limit", String(limit));
  return client.get<{ items: DeploymentEvent[]; next_cursor: string | null }>(
    `/api/deployments/${id}/events?${params.toString()}`,
  );
}
