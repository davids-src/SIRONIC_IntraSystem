import { httpRequest } from "../http";
import { IntegrationError } from "../errors";
import {
  zNpmCertificate,
  zNpmCertificateList,
  zNpmHealth,
  zNpmProxyHost,
  zNpmProxyHostList,
  zNpmTokenResponse,
} from "./schemas";
import type {
  CreateCertificateInput,
  CreateProxyHostInput,
  NpmCertificate,
  NpmClientConfig,
  NpmProxyHost,
} from "./types";

/** NPM domain-name schema regex — hardens against the dns_provider_credentials command-injection surface. */
export const NPM_DOMAIN_REGEX = /^[^&| @!#%^();:/\\}{=+?<>,~`'"]+$/;

export function assertValidNpmDomain(domain: string): void {
  if (!NPM_DOMAIN_REGEX.test(domain)) {
    throw new IntegrationError(
      "npm",
      "INVALID_DOMAIN",
      `Érvénytelen domain formátum: "${domain}".`,
      400,
      false,
    );
  }
}

function parseVersion(v: string): [number, number, number] {
  const [major = 0, minor = 0, revision = 0] = v.split(".").map((n) => Number(n) || 0);
  return [major, minor, revision];
}

function versionAtLeast(
  actual: [number, number, number],
  min: [number, number, number],
): boolean {
  for (let i = 0; i < 3; i += 1) {
    const a = actual[i] ?? 0;
    const m = min[i] ?? 0;
    if (a > m) return true;
    if (a < m) return false;
  }
  return true;
}

export class NpmClient {
  private token: string | null = null;

  constructor(private readonly config: NpmClientConfig) {}

  private url(path: string): string {
    return `${this.config.baseUrl.replace(/\/$/, "")}${path}`;
  }

  async login(): Promise<void> {
    const res = await httpRequest(this.url("/api/tokens"), {
      provider: "npm",
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: { identity: this.config.email, secret: this.config.password },
      retry: false,
    });
    const parsed = zNpmTokenResponse.parse(res.json);
    this.token = parsed.token;
  }

  private async authHeaders(): Promise<Record<string, string>> {
    if (!this.token) await this.login();
    return { Authorization: `Bearer ${this.token}`, "Content-Type": "application/json" };
  }

  private async request(
    path: string,
    init: { method?: string; body?: unknown } = {},
  ): Promise<unknown> {
    let headers = await this.authHeaders();
    let res = await httpRequest(this.url(path), {
      provider: "npm",
      method: init.method,
      headers,
      body: init.body,
    });
    if (res.status === 401) {
      this.token = null;
      headers = await this.authHeaders();
      res = await httpRequest(this.url(path), {
        provider: "npm",
        method: init.method,
        headers,
        body: init.body,
      });
    }
    return res.json;
  }

  /** Healthcheck probe (docs/deployments/03-integrations.md §6) — login + version read. */
  async getVersion(): Promise<{ major: number; minor: number; revision: number } | null> {
    const res = await httpRequest(this.url("/api/"), { provider: "npm", retry: true });
    const parsed = zNpmHealth.safeParse(res.json);
    return parsed.success ? (parsed.data.version ?? null) : null;
  }

  /** Health/version gate — CVE-2024-39935 requires >= 2.11.3 before any cert/proxy-host mutation. */
  async assertMinVersion(min: string): Promise<void> {
    const version = await this.getVersion();
    if (!version) {
      throw new IntegrationError(
        "npm",
        "VERSION_UNKNOWN",
        "Nem sikerült megállapítani az NPM verzióját.",
        undefined,
        false,
      );
    }
    const { major, minor, revision } = version;
    if (!versionAtLeast([major, minor, revision], parseVersion(min))) {
      throw new IntegrationError(
        "npm",
        "VERSION_TOO_OLD",
        `Az NPM verziója túl régi (${major}.${minor}.${revision}) — legalább ${min} szükséges (CVE-2024-39935).`,
        undefined,
        false,
      );
    }
  }

  async createCertificate(input: CreateCertificateInput): Promise<{ id: number }> {
    input.domainNames.forEach(assertValidNpmDomain);
    const json = await this.request("/api/nginx/certificates", {
      method: "POST",
      body: {
        provider: "letsencrypt",
        domain_names: input.domainNames,
        meta: {
          letsencrypt_email: input.letsencryptEmail,
          letsencrypt_agree: true,
          dns_challenge: true,
          dns_provider: "cloudflare",
          dns_provider_credentials: input.dnsProviderCredentials,
          propagation_seconds: 30,
        },
      },
    });
    const parsed = zNpmCertificate.parse(json);
    return { id: parsed.id };
  }

  async listCertificates(): Promise<NpmCertificate[]> {
    const json = await this.request("/api/nginx/certificates");
    return zNpmCertificateList.parse(json);
  }

  async createProxyHost(input: CreateProxyHostInput): Promise<{ id: number }> {
    input.domainNames.forEach(assertValidNpmDomain);
    const json = await this.request("/api/nginx/proxy-hosts", {
      method: "POST",
      body: {
        domain_names: input.domainNames,
        forward_scheme: input.forwardScheme,
        forward_host: input.forwardHost,
        forward_port: input.forwardPort,
        certificate_id: input.certificateId,
        ssl_forced: input.sslForced ?? true,
        caching_enabled: false,
        block_exploits: true,
        allow_websocket_upgrade: input.allowWebsocketUpgrade ?? true,
        http2_support: true,
        hsts_enabled: true,
        hsts_subdomains: false,
        meta: { letsencrypt_agree: false },
        advanced_config: "",
        locations: [],
      },
    });
    const parsed = zNpmProxyHost.parse(json);
    return { id: parsed.id };
  }

  async updateProxyHost(id: number, input: Partial<CreateProxyHostInput>): Promise<void> {
    input.domainNames?.forEach(assertValidNpmDomain);
    await this.request(`/api/nginx/proxy-hosts/${id}`, {
      method: "PUT",
      body: {
        ...(input.domainNames ? { domain_names: input.domainNames } : {}),
        ...(input.forwardScheme ? { forward_scheme: input.forwardScheme } : {}),
        ...(input.forwardHost ? { forward_host: input.forwardHost } : {}),
        ...(input.forwardPort ? { forward_port: input.forwardPort } : {}),
        ...(input.certificateId ? { certificate_id: input.certificateId } : {}),
      },
    });
  }

  async listProxyHosts(): Promise<NpmProxyHost[]> {
    const json = await this.request("/api/nginx/proxy-hosts");
    return zNpmProxyHostList.parse(json);
  }

  async getProxyHost(id: number): Promise<NpmProxyHost> {
    const json = await this.request(`/api/nginx/proxy-hosts/${id}`);
    return zNpmProxyHost.parse(json);
  }

  async deleteProxyHost(id: number): Promise<void> {
    await this.request(`/api/nginx/proxy-hosts/${id}`, { method: "DELETE" });
  }
}
