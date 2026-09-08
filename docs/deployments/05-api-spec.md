# 05 — API Specification

Patterns match existing CRM/portal handlers:

- CRM: `requireCrmAuth()` → `guard(actor, { module, action, scope: "global" })` → Zod → `withDb` → `serializeForJson` → `handleApiError`
- Portal: `requirePortalAuth()` → `guard` with `scope: "contact"` + `PartnerDeploymentAccess` checks

All paths prefixed as shown. JSON bodies unless noted.

---

## 1. RBAC quick reference

| Endpoint group           | Module               | Typical actions                                |
| ------------------------ | -------------------- | ---------------------------------------------- |
| Deployments CRUD / steps | `deployment`         | `view`, `write`, `provision`, `adopt`, `admin` |
| Packages / payments      | `deployment_billing` | `view`, `write`, `admin`                       |
| Integrations / templates | `integration`        | `view`, `write`, `admin`                       |
| Portal team              | `partner_team`       | `view`, `manage` (portal)                      |

---

## 2. CRM — Deployments

### `GET /api/deployments`

**Guard:** `deployment:view`  
**Query:** `contact_id?`, `status?`, `q?`, `billing_status?` (`due|overdue|ok`)

**Response:** `Deployment[]` (lean; omit huge event data)

### `POST /api/deployments`

**Guard:** `deployment:write`  
**Body (Zod):**

```ts
z.object({
  contact_id: z.string().min(1),
  name: z.string().min(1).max(200),
  domain: z
    .string()
    .min(3)
    .max(253)
    .transform((d) => d.toLowerCase()),
  www_redirect: z.boolean().optional(),
  dns: z
    .object({
      record_type: z.enum(["A", "CNAME"]),
      target: z.string().min(1),
      proxied: z.boolean().optional(),
    })
    .optional(),
  proxy: z
    .object({
      forward_host: z.string().min(1),
      forward_port: z.number().int().positive(),
      forward_scheme: z.enum(["http", "https"]).optional(),
      websocket_support: z.boolean().optional(),
    })
    .optional(),
  image: z
    .object({
      repository: z.string().min(1),
      tag: z.string().min(1),
      workflow_id: z.string().nullable().optional(),
      workflow_ref: z.string().optional(),
    })
    .optional(),
  stack: z
    .object({
      stack_name: z
        .string()
        .min(1)
        .regex(/^[a-z0-9-]+$/),
      template_id: z.string().nullable().optional(),
      env: z.array(z.object({ name: z.string(), value: z.string() })).optional(),
    })
    .optional(),
  package_id: z.string().nullable().optional(),
  billing_cycle: z.enum(["monthly", "quarterly", "yearly"]).nullable().optional(),
  price_override_huf: z.number().nonnegative().nullable().optional(),
  notes: z.string().nullable().optional(),
});
```

Creates counter `DEP-…`, default eight steps `pending`, `status: "draft"`.

### `GET /api/deployments/:id`

**Guard:** `deployment:view`

### `PATCH /api/deployments/:id`

**Guard:** `deployment:write`  
Updatable: name, notes, dns, proxy, image, stack (when not running), package/billing fields, www_redirect.  
Cannot change `domain` after `cloudflare_zone` is `done|adopted` without admin force.

### `DELETE /api/deployments/:id`

**Guard:** `deployment:admin`  
Soft-archive by default (`status: archived`); query `?hard=1` only if no external_ids (else 409).

---

## 3. CRM — Steps

### `POST /api/deployments/:id/steps/:key/plan`

**Guard:** `deployment:provision`  
**Body:** step-specific optional input + `{ dry_run?: true }`  
**Response:** `StepPlan`

### `POST /api/deployments/:id/steps/:key/execute`

**Guard:** `deployment:provision`  
**Body:**

```ts
z.object({
  force: z.boolean().optional(),
  dry_run: z.boolean().optional(),
  // step-specific fields optional
}).passthrough();
```

**Response:** updated `Deployment`

### `POST /api/deployments/:id/steps/:key/adopt`

**Guard:** `deployment:adopt`  
**Body:**

```ts
z.object({
  external_id: z.string().min(1),
  meta: z.record(z.unknown()).optional(),
});
```

### `POST /api/deployments/:id/steps/:key/verify`

**Guard:** `deployment:view`  
**Response:** `{ ok, drift, message, deployment? }` — may promote `ns_delegation` to `done`

### `POST /api/deployments/:id/steps/:key/skip`

**Guard:** `deployment:provision`  
**Body:** `{ reason?: string }`

### `POST /api/deployments/:id/steps/:key/unskip`

**Guard:** `deployment:provision`

### `POST /api/deployments/:id/run`

**Guard:** `deployment:provision`  
Runs next pending executable step(s) in dependency order until blocked or `{ max_steps?: number }`.  
**Body:** `{ max_steps: z.number().int().positive().max(8).optional() }`

### `POST /api/deployments/:id/redeploy`

**Guard:** `deployment:provision`  
Triggers `stack_deploy` (webhook or update). Optional new `tag`.

---

## 4. CRM — Events

### `GET /api/deployments/:id/events`

**Guard:** `deployment:view`  
**Query:** `cursor?`, `limit?` (default 50)

---

## 5. CRM — Import

### `POST /api/deployments/import/scan`

**Guard:** `deployment:adopt`  
**Body:** `{ providers?: IntegrationProvider[] }`  
**Response:** correlated candidates (see import doc)

### `POST /api/deployments/import/apply`

**Guard:** `deployment:adopt`  
**Body:**

```ts
z.object({
  contact_id: z.string(),
  name: z.string(),
  domain: z.string(),
  adopts: z.array(z.object({
    step_key: z.enum([...]),
    external_id: z.string(),
  })),
  package_id: z.string().nullable().optional(),
})
```

Creates deployment `source: "imported"` and runs adopt for each.

---

## 6. CRM — Packages

### `GET /api/deployment-packages` — `deployment_billing:view`

### `POST /api/deployment-packages` — `deployment_billing:write`

### `PATCH /api/deployment-packages/:id` — `deployment_billing:write`

### `DELETE /api/deployment-packages/:id` — `deployment_billing:admin` (soft `is_active: false`)

Body create:

```ts
z.object({
  code: z.string().min(1).max(64),
  name: z.string().min(1),
  description: z.string().nullable().optional(),
  price_huf: z.number().nonnegative(),
  default_cycle: z.enum(["monthly", "quarterly", "yearly"]),
  resources: z
    .object({
      vcpu: z.number().positive().nullable().optional(),
      ram_mb: z.number().positive().nullable().optional(),
      disk_gb: z.number().positive().nullable().optional(),
      bandwidth_gb: z.number().positive().nullable().optional(),
      custom: z.record(z.unknown()).optional(),
    })
    .optional(),
  sort_order: z.number().optional(),
});
```

---

## 7. CRM — Payments

### `GET /api/deployment-payments`

**Query:** `deployment_id?`, `contact_id?`, `status?`  
**Guard:** `deployment_billing:view`

### `POST /api/deployment-payments`

**Guard:** `deployment_billing:write` — manual period create (rare; cron usually)

### `POST /api/deployment-payments/:id/mark-paid`

**Guard:** `deployment_billing:write`  
**Body:** `{ paid_at?: string, invoice_id?: string, notes?: string }`  
Updates payment + `Deployment.last_paid_at`

### `POST /api/deployment-payments/:id/waive` — `deployment_billing:admin`

### `GET /api/cron/deployment-billing`

**Auth:** `Authorization: Bearer CRON_SECRET` (like maintenance cron)  
Rolls periods / marks overdue — see billing doc.

---

## 8. CRM — Stack templates

### `GET|POST /api/stack-templates`

### `GET|PATCH|DELETE /api/stack-templates/:id`

**Module:** `integration`  
DELETE = soft or hard if unused.

---

## 9. CRM — Integrations

### `GET /api/integrations` — `integration:view` (no secrets)

### `POST /api/integrations` — `integration:admin`

```ts
z.object({
  provider: z.enum(["cloudflare", "npm", "portainer", "github"]),
  label: z.string().min(1),
  base_url: z.string().url(),
  credentials: z.record(z.string()), // plaintext once; encrypted at rest
  meta: z.record(z.unknown()).optional(),
});
```

### `PATCH /api/integrations/:id` — rotate credentials (re-encrypt)

### `DELETE /api/integrations/:id` — `integration:admin`

### `POST /api/integrations/:id/healthcheck` — `integration:view`

**Response:** `{ ok: boolean, message: string }`

---

## 10. CRM — Teardown (dangerous)

### `POST /api/deployments/:id/teardown/:resource`

**Guard:** `deployment:admin`  
**Body:** `{ confirm_domain: string }` must match  
`resource`: `dns_records` | `proxy_host` | `certificate` | `stack` | `zone`

Each calls provider delete; updates step status back toward `pending` as documented per resource.

---

## 11. Portal — Deployments

### `GET /api/deployments`

Scoped: `tenantId` + `contactId` + access filter.  
**Guard:** `deployment:view` scope contact  
**Response:** sanitized (no stack env secrets, no integration ids)

### `GET /api/deployments/:id`

Must pass access check.

### `GET /api/deployments/:id/events`

Subset of events (no raw provider payloads); view only.

### `POST /api/deployments/:id/redeploy` (optional MVP+)

**Guard:** access_level `manage` + `partner.admin`  
Triggers redeploy only — no DNS/SSL mutations from portal.

---

## 12. Portal — Team

### `GET /api/team/users` — list `PortalUser` for `contactId`

### `POST /api/team/invite`

```ts
z.object({
  email: z.string().email(),
  display_name: z.string().optional(),
  roleKeys: z.array(z.enum(["partner.admin", "partner.viewer"])).min(1),
  deployment_ids: z.array(z.string()).optional(), // seed PartnerDeploymentAccess
});
```

**Guard:** `partner_team:manage` (partner.admin)  
Reuses invite email flow similar to CRM `contacts/[id]/invite`.

### `PATCH /api/team/users/:id` — roles

### `POST /api/team/users/:id/reset-password`

### `GET|PUT /api/team/users/:id/deployments`

```ts
// PUT body
z.object({
  items: z.array(
    z.object({
      deployment_id: z.string(),
      access_level: z.enum(["view", "manage"]),
    }),
  ),
});
```

---

## 13. Error shape

Unchanged from CRM:

| Status | Body                                                                |
| ------ | ------------------------------------------------------------------- |
| 400    | `{ error: ZodFlatten \| string }`                                   |
| 401    | `{ error: "Unauthorized" }`                                         |
| 403    | `{ error: "Forbidden" }` or HU message                              |
| 404    | `{ error: "Not found" }`                                            |
| 409    | `{ error: string, code?: string }`                                  |
| 502    | `{ error: string, code?: string }` provider failure surfaced safely |

---

## 14. OpenAPI

Optional later: generate from Zod. Not required for MVP; this doc is the contract.
