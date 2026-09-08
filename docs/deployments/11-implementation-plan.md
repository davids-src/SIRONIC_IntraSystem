# 11 — Implementation Plan (Track 1)

## Phase checklist

### P1 — Foundations

| Task                                            | Acceptance                               |
| ----------------------------------------------- | ---------------------------------------- |
| Promote `secret-crypto` to `@crm/lib`           | CRM Secrets still work                   |
| Add types + RBAC grants                         | typecheck green                          |
| `@crm/integrations` clients + fixtures          | unit tests pass mocked                   |
| `IntegrationConnection` model + CRM settings UI | healthcheck OK against lab NPM/Portainer |
| Orchestrator registry + `plan` only wired       | dry-run events written                   |

### P2 — Execute path

| Task                                    | Acceptance                                   |
| --------------------------------------- | -------------------------------------------- |
| All DB models + counters                | CRUD via API                                 |
| Step handlers execute/adopt/verify/skip | Greenfield domain → HTTPS + stack in staging |
| CRM list/wizard/detail UI               | Staff can run without provider tabs          |
| Redeploy via webhook or update          | New image tag live                           |

### P3 — Portal

| Task                     | Acceptance             |
| ------------------------ | ---------------------- |
| Portal permissions flags | Menus gated            |
| Portal deployments pages | Partner sees own       |
| `/team` + access matrix  | Invite + scoped viewer |

### P4 — Billing

| Task            | Acceptance            |
| --------------- | --------------------- |
| Packages CRUD   | Seed small/medium     |
| Payments + cron | Due/overdue/paid flow |
| Billing board   | Overdue visible       |

### P5 — Import

| Task                           | Acceptance             |
| ------------------------------ | ---------------------- |
| Scan + apply                   | Existing stack adopted |
| DomainHosting migration script | Records linked         |
| Reconcile drift                | Degraded on mismatch   |

---

## Test strategy

| Layer           | Tool                     | Scope                                                    |
| --------------- | ------------------------ | -------------------------------------------------------- |
| Unit            | Jest                     | orchestrator deps, price effective, redact, domain regex |
| Integration     | Jest + MongoMemoryServer | API adopt/execute with mocked clients                    |
| Client contract | Jest                     | Zod parse of fixture JSON                                |
| E2E             | Playwright (optional)    | Wizard → detail step UI with mocks                       |

CI: no live provider calls.  
Pre-prod: `INTEGRATIONS_SMOKE=1` script on VPN.

---

## Rollout sequence

1. Deploy CRM build with feature flag `DEPLOYMENTS_ENABLED=false` (env) — routes 404.
2. Configure integrations on production; healthchecks green.
3. Enable flag for crm.admin only.
4. Import 1–2 known partners; verify portal menus off until ready.
5. Enable portal `menu_deployments` per contact.
6. Turn on billing cron.
7. Document runbooks in SYSTEM_MANUAL (Hungarian).

---

## Suggested file touch list (implementation)

```text
packages/types/src/index.ts
packages/rbac/src/index.ts
packages/lib/src/secret-crypto.ts
packages/db/src/models/deployment*.ts
packages/db/src/models/integration-connection.ts
packages/db/src/models/stack-template.ts
packages/db/src/models/partner-deployment-access.ts
packages/db/src/index.ts
packages/integrations/**  (new)
packages/modules/src/deployments/**  (new)
apps/crm/app/(crm)/deployments/**
apps/crm/app/(crm)/settings/integrations/**
apps/crm/app/api/deployments/**
apps/crm/app/api/integrations/**
apps/crm/app/crm-shell.tsx
apps/partner-portal/app/deployments/**
apps/partner-portal/app/team/**
apps/partner-portal/app/api/**
apps/partner-portal/app/partner-shell.tsx
```

---

## Open confirmations before coding

| Item                               | Default in docs    |
| ---------------------------------- | ------------------ |
| Portainer mode                     | standalone         |
| Anniversary vs calendar billing    | anniversary        |
| partner.admin sees all deployments | yes                |
| Template repo                      | separate (Track 3) |
