# 09 — Import and Reconciliation

Goal: bring **already running** partner sites into CRM without recreating infra, then keep detecting drift.

---

## 1. Scan

`POST /api/deployments/import/scan` loads active `IntegrationConnection`s and fetches:

| Provider    | Data                                                                     |
| ----------- | ------------------------------------------------------------------------ |
| Cloudflare  | Zones (id, name, status, name_servers)                                   |
| NPM         | Proxy hosts (id, domain_names, forward_*, certificate_id) + certificates |
| Portainer   | Stacks (id, name, env summary)                                           |
| GitHub/GHCR | Optional: recent package versions for configured repos                   |

### Correlation key

Normalize domains (lowercase, strip trailing `.`, apex via publicsuffix best-effort or simple heuristic).

```text
candidate.domain = apex or first host domain
match:
  CF zone name === domain
  NPM host domain_names includes domain or www.domain
  Portainer stack name fuzzy OR env DOMAIN===domain OR compose label
```

Output shape:

```ts
type ImportCandidate = {
  domain: string;
  cloudflare_zone_id?: string;
  npm_proxy_host_id?: number;
  npm_certificate_id?: number;
  portainer_stack_id?: number;
  suggested_stack_name?: string;
  already_imported_deployment_id?: string; // if domain unique hit
  confidence: "high" | "medium" | "low";
};
```

---

## 2. Apply (bulk adopt)

UI selects candidate + `contact_id` + optional package.

Server:

1. `POST` creates Deployment `source: "imported"`, `status: "draft"`.
2. For each mapped external id, run orchestrator `adopt` for the matching step.
3. Mark remaining steps `skipped` or `pending` based on checklist UI.
4. Set `status` via derivation (`live` if proxy+stack adopted and verify ok).
5. Write `DeploymentEvent` kind `import`.

---

## 3. Partner matching UI

- Prefer search contacts by name / domain in notes / existing DomainHostingRecord label.
- Show DomainHostingRecord suggestions for same contact.
- Allow create-without-contact? **No** — contact required.

---

## 4. Ongoing reconciliation

### On-demand

`POST /api/deployments/:id/reconcile` — verify all non-skipped steps; return drift report; optional `{ apply: true }` re-executes drifted upsert-capable steps (DNS, proxy update).

### Scheduled (optional)

`GET /api/cron/deployment-reconcile` with `CRON_SECRET`:

- Sample N live deployments per run
- Verify; if drift, set `status: degraded` + event (do not auto-apply)

---

## 5. DomainHostingRecord bridge

During scan, if a DomainHosting row exists for domain:

- Pre-fill contact_id
- Link `migrated_from_domain_hosting_id` on apply
- After successful import, mark hosting record details with `migrated: true` in `details` JSON text or dedicated flag field added in migration script

---

## 6. Edge cases

| Case                                     | Handling                                 |
| ---------------------------------------- | ---------------------------------------- |
| Domain already has Deployment            | Block create; offer open existing        |
| NPM host without CF zone (DNS elsewhere) | Allow skip zone/NS/dns; adopt proxy only |
| Stack without NPM                        | Adopt stack; proxy step pending          |
| Multiple NPM hosts same domain           | Manual pick in UI                        |
| Confidence low                           | Require explicit confirm checkbox        |

---

## 7. Acceptance

- Scan returns known lab domain with high confidence.
- Apply creates DEP-* with adopted steps and no new CF zone created.
- Second scan marks candidate `already_imported`.
