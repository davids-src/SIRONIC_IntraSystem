import { httpRequest, type HttpRequestOptions, type HttpResponse } from "../http";
import {
  zPortainerContainerList,
  zPortainerImageList,
  zPortainerStack,
  zPortainerStackList,
} from "./schemas";
import type {
  ContainerSummary,
  ImageSummary,
  PortainerClientConfig,
  PortainerStack,
  StackEnvVar,
} from "./types";

/**
 * Docker log streams are multiplexed (8-byte frame header: stream, 0, 0, 0, size[4]) unless the
 * container has a TTY. Strips the headers; returns the text unchanged when it is not framed.
 */
export function demuxDockerLog(raw: Uint8Array): string {
  const buf = Buffer.from(raw);
  let off = 0;
  const out: string[] = [];
  while (off + 8 <= buf.length) {
    const kind = buf[off]!;
    if (kind > 2 || buf[off + 1] !== 0 || buf[off + 2] !== 0 || buf[off + 3] !== 0) {
      return buf.toString("utf8"); // not a framed stream
    }
    const size = buf.readUInt32BE(off + 4);
    out.push(buf.subarray(off + 8, off + 8 + size).toString("utf8"));
    off += 8 + size;
  }
  return out.join("");
}

export class PortainerClient {
  constructor(private readonly config: PortainerClientConfig) {}

  get endpointId(): number {
    return this.config.endpointId;
  }

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

  private docker(path: string): string {
    return `/api/endpoints/${this.config.endpointId}/docker${path}`;
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

  async getStack(id: number): Promise<PortainerStack> {
    const res = await this.request(`/api/stacks/${id}`, { headers: this.headers() });
    return zPortainerStack.parse(res.json);
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
        retry: false,
      },
    );
    const parsed = zPortainerStack.parse(res.json);
    return { id: parsed.Id, webhookId: parsed.AutoUpdate?.Webhook };
  }

  /**
   * Replaces the compose file + env of a stack and redeploys it. NOTE: `env` REPLACES the stack's
   * env list — callers that only want to re-pull must pass the current env back.
   */
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
      retry: false,
      timeoutMs: 10 * 60_000, // image pulls can be slow
    });
  }

  async startStack(id: number): Promise<void> {
    await this.request(`/api/stacks/${id}/start?endpointId=${this.config.endpointId}`, {
      method: "POST",
      headers: this.headers(),
      retry: false,
    });
  }

  async stopStack(id: number): Promise<void> {
    await this.request(`/api/stacks/${id}/stop?endpointId=${this.config.endpointId}`, {
      method: "POST",
      headers: this.headers(),
      retry: false,
    });
  }

  async deleteStack(id: number): Promise<void> {
    await this.request(`/api/stacks/${id}?endpointId=${this.config.endpointId}`, {
      method: "DELETE",
      headers: this.headers(),
      retry: false,
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

  async listContainers(filters?: Record<string, string[]>): Promise<ContainerSummary[]> {
    const params = new URLSearchParams({ all: "true" });
    if (filters) params.set("filters", JSON.stringify(filters));
    const res = await this.request(this.docker(`/containers/json?${params.toString()}`), {
      headers: this.headers(),
    });
    return zPortainerContainerList.parse(res.json);
  }

  async listImages(): Promise<ImageSummary[]> {
    const res = await this.request(this.docker("/images/json"), {
      headers: this.headers(),
    });
    return zPortainerImageList.parse(res.json);
  }

  /** `docker pull`: downloads `repo[:tag]` on the endpoint (Portainer injects registry credentials). */
  async pullImage(image: string): Promise<void> {
    const at = image.lastIndexOf("@");
    const [ref, tag] =
      at >= 0
        ? [image.slice(0, at), undefined]
        : (() => {
            const i = image.lastIndexOf(":");
            return i > image.lastIndexOf("/")
              ? [image.slice(0, i), image.slice(i + 1)]
              : [image, "latest"];
          })();
    const q = new URLSearchParams({ fromImage: ref! });
    if (tag) q.set("tag", tag);
    await this.request(this.docker(`/images/create?${q.toString()}`), {
      method: "POST",
      headers: this.headers(),
      retry: false,
      timeoutMs: 10 * 60_000,
    });
  }

  async containerAction(
    containerId: string,
    action: "start" | "stop" | "restart",
  ): Promise<void> {
    await this.request(this.docker(`/containers/${containerId}/${action}`), {
      method: "POST",
      headers: this.headers(),
      retry: false,
      timeoutMs: 60_000,
    });
  }

  async getContainerLogs(containerId: string, tail = 200): Promise<string> {
    const url = this.url(
      this.docker(
        `/containers/${containerId}/logs?stdout=true&stderr=true&timestamps=true&tail=${tail}`,
      ),
    );
    const res = await httpRequest(url, {
      provider: "portainer",
      headers: this.headers(),
      insecureTls: this.config.insecureTls,
    });
    return demuxDockerLog(res.bytes);
  }
}
