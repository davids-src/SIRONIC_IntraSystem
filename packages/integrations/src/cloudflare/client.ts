import { httpRequest } from "../http";
import { IntegrationError } from "../errors";
import {
  zCfEnvelope,
  zCfEnvelopeBase,
  zDnsRecordListResult,
  zZone,
  zZoneListResult,
} from "./schemas";
import type {
  CloudflareClientConfig,
  DnsRecord,
  UpsertDnsRecordInput,
  Zone,
} from "./types";

const CF_ZONE_ALREADY_EXISTS = 1061;

export class CloudflareClient {
  constructor(private readonly config: CloudflareClientConfig) {}

  private headers(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.config.apiToken}`,
      "Content-Type": "application/json",
    };
  }

  private url(path: string): string {
    return `${this.config.baseUrl.replace(/\/$/, "")}${path}`;
  }

  private throwIfError(json: unknown, fallbackMessage: string): void {
    const envelope = zCfEnvelopeBase.safeParse(json);
    if (envelope.success && !envelope.data.success) {
      const first = envelope.data.errors[0];
      if (first?.code === CF_ZONE_ALREADY_EXISTS) {
        throw new IntegrationError(
          "cloudflare",
          "ZONE_EXISTS",
          "A zóna már létezik ezen a Cloudflare fiókon — használd az Adopt műveletet.",
          409,
          false,
        );
      }
      throw new IntegrationError(
        "cloudflare",
        "API_ERROR",
        first?.message ?? fallbackMessage,
        undefined,
        false,
      );
    }
  }

  /** Healthcheck probe (docs/deployments/03-integrations.md §6). */
  async verifyToken(): Promise<{ ok: boolean }> {
    const res = await httpRequest(this.url("/user/tokens/verify"), {
      provider: "cloudflare",
      headers: this.headers(),
    });
    const parsed = zCfEnvelopeBase.safeParse(res.json);
    return { ok: parsed.success && parsed.data.success };
  }

  async createZone(
    name: string,
  ): Promise<{ id: string; nameServers: string[]; status: string }> {
    const body: Record<string, unknown> = { name, type: "full" };
    if (this.config.accountId) body.account = { id: this.config.accountId };
    const res = await httpRequest(this.url("/zones"), {
      provider: "cloudflare",
      method: "POST",
      headers: this.headers(),
      body,
    });
    this.throwIfError(res.json, "Cloudflare zóna létrehozása sikertelen.");
    const parsed = zCfEnvelope(zZone).parse(res.json);
    if (!parsed.result) {
      throw new IntegrationError(
        "cloudflare",
        "EMPTY_RESULT",
        "Cloudflare üres választ adott.",
      );
    }
    return {
      id: parsed.result.id,
      nameServers: parsed.result.name_servers,
      status: parsed.result.status,
    };
  }

  async getZone(zoneId: string): Promise<Zone> {
    const res = await httpRequest(this.url(`/zones/${zoneId}`), {
      provider: "cloudflare",
      headers: this.headers(),
    });
    this.throwIfError(res.json, "Cloudflare zóna lekérése sikertelen.");
    const parsed = zCfEnvelope(zZone).parse(res.json);
    if (!parsed.result) {
      throw new IntegrationError("cloudflare", "NOT_FOUND", "A zóna nem található.", 404);
    }
    return parsed.result;
  }

  async listZones(query?: { name?: string }): Promise<Zone[]> {
    const params = new URLSearchParams({ per_page: "50" });
    if (query?.name) params.set("name", query.name);
    const res = await httpRequest(this.url(`/zones?${params.toString()}`), {
      provider: "cloudflare",
      headers: this.headers(),
    });
    this.throwIfError(res.json, "Cloudflare zónák listázása sikertelen.");
    const parsed = zCfEnvelope(zZoneListResult).parse(res.json);
    return parsed.result ?? [];
  }

  async triggerActivationCheck(zoneId: string): Promise<void> {
    const res = await httpRequest(this.url(`/zones/${zoneId}/activation_check`), {
      provider: "cloudflare",
      method: "PUT",
      headers: this.headers(),
    });
    this.throwIfError(res.json, "Cloudflare aktiválás-ellenőrzés sikertelen.");
  }

  async upsertDnsRecord(
    zoneId: string,
    record: UpsertDnsRecordInput,
  ): Promise<{ id: string }> {
    const existing = await this.listDnsRecords(zoneId, {
      type: record.type,
      name: record.name,
    });
    const match = existing[0];
    const body = {
      type: record.type,
      name: record.name,
      content: record.content,
      ttl: record.ttl ?? 1,
      proxied: record.proxied ?? false,
    };
    if (match) {
      const res = await httpRequest(
        this.url(`/zones/${zoneId}/dns_records/${match.id}`),
        {
          provider: "cloudflare",
          method: "PUT",
          headers: this.headers(),
          body,
        },
      );
      this.throwIfError(res.json, "Cloudflare DNS rekord frissítése sikertelen.");
      return { id: match.id };
    }
    const res = await httpRequest(this.url(`/zones/${zoneId}/dns_records`), {
      provider: "cloudflare",
      method: "POST",
      headers: this.headers(),
      body,
    });
    this.throwIfError(res.json, "Cloudflare DNS rekord létrehozása sikertelen.");
    const parsed = zCfEnvelope(zDnsRecordListResult.element).parse(res.json);
    if (!parsed.result) {
      throw new IntegrationError(
        "cloudflare",
        "EMPTY_RESULT",
        "Cloudflare üres választ adott.",
      );
    }
    return { id: parsed.result.id };
  }

  async listDnsRecords(
    zoneId: string,
    filter?: { type?: string; name?: string },
  ): Promise<DnsRecord[]> {
    const params = new URLSearchParams();
    if (filter?.type) params.set("type", filter.type);
    if (filter?.name) params.set("name", filter.name);
    const qs = params.toString();
    const res = await httpRequest(
      this.url(`/zones/${zoneId}/dns_records${qs ? `?${qs}` : ""}`),
      {
        provider: "cloudflare",
        headers: this.headers(),
      },
    );
    this.throwIfError(res.json, "Cloudflare DNS rekordok listázása sikertelen.");
    const parsed = zCfEnvelope(zDnsRecordListResult).parse(res.json);
    return parsed.result ?? [];
  }

  async deleteDnsRecord(zoneId: string, recordId: string): Promise<void> {
    const res = await httpRequest(this.url(`/zones/${zoneId}/dns_records/${recordId}`), {
      provider: "cloudflare",
      method: "DELETE",
      headers: this.headers(),
    });
    this.throwIfError(res.json, "Cloudflare DNS rekord törlése sikertelen.");
  }
}
