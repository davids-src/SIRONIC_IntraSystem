import { httpRequest, type HttpRequestOptions, type HttpResponse } from "../http";
import { zPortainerContainerList, zPortainerStack, zPortainerStackList } from "./schemas";
import type {
  ContainerSummary,
  PortainerClientConfig,
  PortainerStack,
  StackEnvVar,
} from "./types";

export class PortainerClient {
  constructor(private readonly config: PortainerClientConfig) {}

  private url(path: string): string {
    return `${this.config.baseUrl.replace(/\/$/, "")}${path}`;
  }

  private headers(): Record<string, string> {
    return { "X-API-Key": this.config.apiKey, "Content-Type": "application/json" };
  }

  private request(
    path: string,
    opts: Omit<HttpRequestOptions, "provider">,
  ): Promise<HttpResponse> {
    return httpRequest(this.url(path), {
      ...opts,
      provider: "portainer",
      insecureTls: this.config.insecureTls,
    });
  }

  /** Healthcheck probe (docs/deployments/03-integrations.md §6). */
  async getStatus(): Promise<{ ok: boolean }> {
    const res = await this.request("/api/endpoints", { headers: this.headers() });
    return { ok: res.status === 200 };
  }

  async listStacks(): Promise<PortainerStack[]> {
    const res = await this.request("/api/stacks", { headers: this.headers() });
    return zPortainerStackList.parse(res.json);
  }

  async createStackStandalone(
    name: string,
    compose: string,
    env: StackEnvVar[] = [],
  ): Promise<{ id: number; webhookId?: string }> {
    const res = await this.request(
      `/api/stacks/create/standalone/string?endpointId=${this.config.endpointId}`,
      {
        method: "POST",
        headers: this.headers(),
        body: { name, stackFileContent: compose, env },
      },
    );
    const parsed = zPortainerStack.parse(res.json);
    return { id: parsed.Id, webhookId: parsed.AutoUpdate?.Webhook };
  }

  async updateStack(
    id: number,
    compose: string,
    env: StackEnvVar[] = [],
    opts: { pullImage?: boolean; prune?: boolean } = {},
  ): Promise<void> {
    await this.request(`/api/stacks/${id}?endpointId=${this.config.endpointId}`, {
      method: "PUT",
      headers: this.headers(),
      body: {
        stackFileContent: compose,
        env,
        pullImage: opts.pullImage ?? true,
        prune: opts.prune ?? false,
      },
    });
  }

  async startStack(id: number): Promise<void> {
    await this.request(`/api/stacks/${id}/start?endpointId=${this.config.endpointId}`, {
      method: "POST",
      headers: this.headers(),
    });
  }

  async stopStack(id: number): Promise<void> {
    await this.request(`/api/stacks/${id}/stop?endpointId=${this.config.endpointId}`, {
      method: "POST",
      headers: this.headers(),
    });
  }

  async getStackFile(id: number): Promise<string> {
    const res = await this.request(`/api/stacks/${id}/file`, { headers: this.headers() });
    const data = res.json as { StackFileContent?: string } | null;
    return data?.StackFileContent ?? "";
  }

  async triggerWebhook(webhookId: string): Promise<void> {
    await this.request(`/api/stacks/webhooks/${webhookId}`, {
      method: "POST",
      retry: false,
    });
  }

  async listContainers(filters?: Record<string, string>): Promise<ContainerSummary[]> {
    const params = new URLSearchParams({ all: "true" });
    if (filters) params.set("filters", JSON.stringify(filters));
    const res = await this.request(
      `/api/endpoints/${this.config.endpointId}/docker/containers/json?${params.toString()}`,
      { headers: this.headers() },
    );
    return zPortainerContainerList.parse(res.json);
  }

  async getContainerLogs(containerId: string, tail = 200): Promise<string> {
    const res = await this.request(
      `/api/endpoints/${this.config.endpointId}/docker/containers/${containerId}/logs?stdout=true&stderr=true&tail=${tail}`,
      { headers: this.headers() },
    );
    return res.text;
  }
}
