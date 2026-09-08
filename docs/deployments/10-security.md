# 10 — Security

## 1. Credential vault

Reuse AES-256-GCM from [`apps/crm/lib/secret-crypto.ts`](../../apps/crm/lib/secret-crypto.ts):

1. Move to `packages/lib/src/secret-crypto.ts` and re-export.
2. `IntegrationConnection.encrypted_credentials` uses same `iv:authTag:ciphertext` hex format.
3. Env: `SECRETS_ENCRYPTION_KEY` (64 hex chars = 32 bytes) — already required for Secrets module.

**Rules**

- Plaintext credentials only in memory during request.
- Never log credentials; use `redact()` in `@crm/integrations`.
- GET integrations returns `{ has_credentials: true }` never secret material.
- Rotation: PATCH replaces ciphertext; old value unrecoverable.

---

## 2. Provider token scoping

| Secret                          | Scope                                         | Where used                                      |
| ------------------------------- | --------------------------------------------- | ----------------------------------------------- |
| Cloudflare orchestrator token   | Zone + DNS broad                              | CRM Cloudflare client                           |
| Cloudflare **NPM DNS-01** token | DNS Edit only; prefer single-zone if possible | Passed into NPM `dns_provider_credentials` only |
| NPM admin password              | NPM instance                                  | Token mint only                                 |
| Portainer API key               | Least privilege stack/container               | Portainer client                                |
| GitHub PAT / App                | `actions:write`, `packages:read` as needed    | GitHub client                                   |

**Never** reuse the orchestrator CF token as the NPM DNS credential.

---

## 3. NPM-specific threats

| Risk                                   | Mitigation                                                             |
| -------------------------------------- | ---------------------------------------------------------------------- |
| CVE-2024-39935 RCE via DNS credentials | Version gate ≥ 2.11.3 before cert create                               |
| Credentials plaintext in NPM DB/disk   | Narrow token; rotate regularly; restrict NPM admin UI network exposure |
| Domain command injection               | Enforce NPM domain regex client-side                                   |
| Admin port `:81` exposure              | Document: bind to VPN/private network only                             |

---

## 4. Audit logging

Every provider mutation → `DeploymentEvent` with:

- actor id/type
- step key
- safe message
- redacted detail (ids, status codes, durations — not tokens)

CRM Secrets reveal already audited lightly; integrations healthcheck should event at connection level (optional `IntegrationEvent` or reuse DeploymentEvent with null deployment for system — prefer small `integration_events` only if needed; MVP: store last health on connection).

---

## 5. Portal data minimization

Portal responses omit:

- `encrypted_*`
- stack env values that look secret (`PASSWORD`, `SECRET`, `TOKEN`, `MONGO`)
- integration connection ids
- Portainer webhook UUIDs (optional allow for manage — default hide)

---

## 6. Teardown confirmations

Destructive routes require `confirm_domain` matching `deployment.domain` and `deployment:admin`.

---

## 7. SSRF considerations

`IntegrationConnection.base_url` must be validated:

- HTTPS preferred (HTTP allowed only for private NPM/Portainer hosts)
- Block link-local / metadata IPs if CRM ever runs in cloud; on self-hosted LAN, allow RFC1918 but **forbid** user-controlled forward URLs in proxy step from untrusted portal input (portal cannot set forward_host in MVP)

---

## 8. Auth platform foreshadow

When Track 2 lands, OIDC clients (deployments) get client_id/client_secret stored encrypted per deployment or globally. Treat like integrations. See [`../auth-platform/`](../auth-platform/).
