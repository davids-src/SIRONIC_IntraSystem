# 03 — Provider Integrations

Package: **`@crm/integrations`** (`packages/integrations`).

All clients:

- Accept decrypted credentials + `base_url` from `IntegrationConnection`.
- Validate responses with **Zod**.
- Throw `IntegrationError` with `provider`, `code`, `httpStatus`, `retryable`, `safeMessage` (no secrets).
- Log via `redact()` — strip tokens, passwords, `Authorization`, `dns_provider_credentials`.

---

## 1. Shared HTTP / retry policy

| Setting      | Value                                        |
| ------------ | -------------------------------------------- |
| Timeout      | 30s default; NPM certificate create **180s** |
| Retry        | 3 attempts on network error, 408, 429, 5xx   |
| Backoff      | `250ms * 2^attempt + jitter(0–100ms)`        |
| Honor        | `Retry-After` on 429 when present            |
| Do not retry | 400, 401, 403, 404, 409, 422                 |

```ts
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
  }
}
```

---

## 2. Cloudflare

**Base URL:** `https://api.cloudflare.com/client/v4`  
**Auth:** `Authorization: Bearer <api_token>`  
**Docs:** [Cloudflare API](https://developers.cloudflare.com/api/)

### Token scopes (recommended)

| Token                              | Permissions                                                           |
| ---------------------------------- | --------------------------------------------------------------------- |
| **Orchestrator token** (CRM vault) | Zone: Zone Read, Zone Write; Zone: DNS Edit; Zone: Zone Settings Read |
| **NPM DNS-01 token** (separate)    | Zone: DNS Edit only — optionally locked to specific zones             |

### Endpoints used

#### Create zone

```http
POST /zones
Content-Type: application/json

{
  "name": "example.com",
  "account": { "id": "<account_id>" },  // from IntegrationConnection.meta.account_id if set
  "type": "full"
}
```

Success: `result.id` = zone id; `result.name_servers[]`; `result.status` often `pending`.

#### Get zone

```http
GET /zones/:zone_id
```

#### List zones (import)

```http
GET /zones?name=example.com&per_page=50&page=1
```

#### Activation check (after NS change)

```http
PUT /zones/:zone_id/activation_check
```

#### DNS records

```http
POST /zones/:zone_id/dns_records
{
  "type": "A",
  "name": "example.com",
  "content": "203.0.113.10",
  "ttl": 1,
  "proxied": false
}
```

```http
GET /zones/:zone_id/dns_records?type=A&name=example.com
PUT /zones/:zone_id/dns_records/:id
DELETE /zones/:zone_id/dns_records/:id
```

### Client methods

```ts
createZone(name: string): Promise<{ id: string; nameServers: string[]; status: string }>
getZone(zoneId: string): Promise<Zone>
listZones(query?: { name?: string }): Promise<Zone[]>
triggerActivationCheck(zoneId: string): Promise<void>
upsertDnsRecord(zoneId, record): Promise<{ id: string }>
listDnsRecords(zoneId, filter?): Promise<DnsRecord[]>
deleteDnsRecord(zoneId, recordId): Promise<void>
```

### Errors

| Cloudflare `errors[].code` | Mapping                 |
| -------------------------- | ----------------------- |
| 10000 / auth               | 401 → non-retryable     |
| 1061 zone already exists   | Map to adopt suggestion |
| Rate limit                 | 429 retryable           |

### Rate limits

Account-dependent; treat 429 as retryable. Prefer ≤ 4 req/s sustained.

---

## 3. Nginx Proxy Manager (NPM)

**Base URL:** from connection, e.g. `http://npm-host:81`  
**Image:** `jc21/nginx-proxy-manager:latest`  
**Auth:**

```http
POST /api/tokens
{ "identity": "admin@example.com", "secret": "password" }
```

Response includes JWT. Client caches token in memory until near expiry; on 401 refresh once.

Headers: `Authorization: Bearer <jwt>`

### Version gate (mandatory)

Before first write, `GET /api/` or equivalent health and require **≥ 2.11.3** (CVE-2024-39935 RCE via `dns_provider_credentials`). If below, healthcheck fails and certificate step refuses to execute.

### Domain name validation (before any cert/host create)

NPM schema regex (command-injection hardening):

```text
^[^&| @!#%^();:/\\}{=+?<>,~`'"]+$
```

Reject domains that fail this regex in our Zod layer with a clear Hungarian CRM error.

### Certificates — Let's Encrypt DNS-01 Cloudflare

```http
POST /api/nginx/certificates
Content-Type: application/json

{
  "provider": "letsencrypt",
  "domain_names": ["example.com", "www.example.com"],
  "meta": {
    "letsencrypt_email": "ops@sironic.eu",
    "letsencrypt_agree": true,
    "dns_challenge": true,
    "dns_provider": "cloudflare",
    "dns_provider_credentials": "dns_cloudflare_api_token = <NPM_SCOPED_TOKEN>\n",
    "propagation_seconds": 30
  }
}
```

**Critical quirks**

1. `dns_provider_credentials` is stored **plaintext** in NPM SQLite `certificate.meta` and on disk under `/etc/letsencrypt/credentials/`.
2. API **omits** credentials on GET — we must keep our own copy of which token was used (Secret / IntegrationConnection), never expect to read it back.
3. Use the **narrow NPM DNS token**, not the orchestrator token.
4. Long timeout; treat timeout as indeterminate — `verify` by listing certs for domain.

```http
GET /api/nginx/certificates
GET /api/nginx/certificates/:id
DELETE /api/nginx/certificates/:id
```

### Proxy hosts

```http
POST /api/nginx/proxy-hosts
{
  "domain_names": ["example.com", "www.example.com"],
  "forward_scheme": "http",
  "forward_host": "my-stack-app",
  "forward_port": 3000,
  "certificate_id": 12,
  "ssl_forced": true,
  "caching_enabled": false,
  "block_exploits": true,
  "allow_websocket_upgrade": true,
  "http2_support": true,
  "hsts_enabled": true,
  "hsts_subdomains": false,
  "meta": { "letsencrypt_agree": false },
  "advanced_config": "",
  "locations": []
}
```

```http
GET /api/nginx/proxy-hosts
PUT /api/nginx/proxy-hosts/:id
DELETE /api/nginx/proxy-hosts/:id
```

### Client methods

```ts
login(): Promise<void>
assertMinVersion(min: string): Promise<void>
createCertificate(input): Promise<{ id: number }>
listCertificates(): Promise<Cert[]>
createProxyHost(input): Promise<{ id: number }>
updateProxyHost(id, input): Promise<void>
listProxyHosts(): Promise<Host[]>
getProxyHost(id): Promise<Host>
deleteProxyHost(id): Promise<void>
```

### Rate / safety

Serialize certificate creates per process (mutex) — Certbot inside NPM is heavy. Max 1 concurrent LE request recommended.

---

## 4. Portainer (standalone)

**Base URL:** e.g. `https://portainer.example.com`  
**Auth:** `X-API-Key: <api_key>` (preferred over session JWT for automation)  
**Mode:** **standalone** (decision D8)

`endpointId` from `IntegrationConnection.meta.endpoint_id` (number).

### Create stack from compose string

```http
POST /api/stacks/create/standalone/string?endpointId={endpointId}
Content-Type: application/json

{
  "name": "partner-example",
  "stackFileContent": "services:\n  app:\n    image: ghcr.io/...\n",
  "env": [
    { "name": "IMAGE_TAG", "value": "abc123" }
  ]
}
```

Response includes stack `Id`, and may include `AutoUpdate.Webhook` UUID — **persist** as `external_ids.portainer_webhook_id`.

### Inspect / update / lifecycle

```http
GET /api/stacks
GET /api/stacks/{id}
GET /api/stacks/{id}/file
PUT /api/stacks/{id}?endpointId={endpointId}
  { "stackFileContent": "...", "env": [...], "pullImage": true, "prune": false }
POST /api/stacks/{id}/stop?endpointId={endpointId}
POST /api/stacks/{id}/start?endpointId={endpointId}
DELETE /api/stacks/{id}?endpointId={endpointId}&external=false
```

### Webhook redeploy

```http
POST /api/stacks/webhooks/{webhookID}
```

(Used from GitHub Actions after GHCR push, or from CRM.)

### Containers / logs (detail UI)

```http
GET /api/endpoints/{endpointId}/docker/containers/json?all=true
GET /api/endpoints/{endpointId}/docker/containers/{id}/logs?stdout=true&stderr=true&tail=200
```

Filter containers by compose project / stack name labels.

### Client methods

```ts
listStacks(): Promise<Stack[]>
createStackStandalone(name, compose, env): Promise<{ id: number; webhookId?: string }>
updateStack(id, compose, env, opts): Promise<void>
startStack(id): Promise<void>
stopStack(id): Promise<void>
getStackFile(id): Promise<string>
triggerWebhook(webhookId): Promise<void>
listContainers(filters?): Promise<ContainerSummary[]>
getContainerLogs(containerId, tail): Promise<string>
```

### Errors

| Case                | Handling                                      |
| ------------------- | --------------------------------------------- |
| Name already exists | Suggest adopt by listing stacks               |
| Invalid compose     | 400 non-retryable — surface Portainer message |
| Unauthorized        | 401 — refresh/rotate API key                  |

---

## 5. GitHub Actions + GHCR

**Base URL:** `https://api.github.com`  
**Auth:** `Authorization: Bearer <token>`, `Accept: application/vnd.github+json`, `X-GitHub-Api-Version: 2022-11-28`

### Workflow dispatch

```http
POST /repos/{owner}/{repo}/actions/workflows/{workflow_id}/dispatches
{
  "ref": "main",
  "inputs": { "image_tag": "optional" }
}
```

`workflow_id` can be file name e.g. `main-build-images.yml`.

### List / get runs

```http
GET /repos/{owner}/{repo}/actions/workflows/{workflow_id}/runs?per_page=5&branch=main
GET /repos/{owner}/{repo}/actions/runs/{run_id}
```

Poll until `status === "completed"`; success if `conclusion === "success"`.

### Packages (GHCR tags)

```http
GET /orgs/{org}/packages/container/{package_name}/versions
GET /users/{user}/packages/container/{package_name}/versions
```

Or use `GET /repos/{owner}/{repo}/packages` depending on visibility. Prefer versions API to pick digest for `image_digest`.

### Client methods

```ts
dispatchWorkflow(owner, repo, workflowId, ref, inputs?): Promise<void>
listWorkflowRuns(...): Promise<Run[]>
getWorkflowRun(...): Promise<Run>
waitForRun(runId, opts): Promise<Run>  // poll with timeout
listContainerVersions(owner, packageName): Promise<Version[]>
```

### Rate limits

5000 req/h for GITHUB_TOKEN/PAT typical; polling every 5–10s during build is fine.

---

## 6. Connection healthcheck matrix

| Provider   | Probe                                                |
| ---------- | ---------------------------------------------------- |
| Cloudflare | `GET /user/tokens/verify` or `GET /zones?per_page=1` |
| NPM        | Login + version check                                |
| Portainer  | `GET /api/status` or `GET /api/endpoints`            |
| GitHub     | `GET /user` or `GET /rate_limit`                     |

Exposed as `POST /api/integrations/:id/healthcheck` in CRM.

---

## 7. Testing strategy for clients

- Unit tests with **mocked `fetch`** fixtures for happy path + 401/429/5xx.
- Contract fixtures checked into `packages/integrations/src/**/__fixtures__/`.
- No live calls in CI.
- Optional local script `scripts/integrations-smoke.ts` gated by env `INTEGRATIONS_SMOKE=1` for staff machines.

---

## 8. Env vars (app)

| Var                      | Use                                                   |
| ------------------------ | ----------------------------------------------------- |
| `SECRETS_ENCRYPTION_KEY` | Decrypt `IntegrationConnection.encrypted_credentials` |
| `DEPLOYMENTS_PUBLIC_IP`  | Optional default DNS A target for wizard              |
| `CRON_SECRET`            | Billing rollover + future reconcile jobs              |
