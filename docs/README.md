# SIRONIC Platform Expansion — Documentation Index

Execution-ready specifications for three connected tracks that extend the SIRONIC IntraSystem (CRM + Partner Portal) into a full deployment orchestration, identity, and site-template platform.

**Status:** Documentation only. No application code ships with this tree. Implement from these docs in the phase order below.

---

## Tracks

| Track                            | Directory                            | Purpose                                                                                                                                      |
| -------------------------------- | ------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------- |
| **1 — Deployment Orchestration** | [`deployments/`](./deployments/)     | Drive Cloudflare, Nginx Proxy Manager, Portainer, and GitHub/GHCR from the CRM; bill partners; expose read/manage views on the portal        |
| **2 — Central Auth Platform**    | [`auth-platform/`](./auth-platform/) | Self-hosted identity provider (password, magic link, TOTP 2FA, WebAuthn passkeys, reset, lockout) that CRM, portal, and deployed sites share |
| **3 — Next.js Template**         | [`next-template/`](./next-template/) | Contract and design for a **separate** reusable Next.js repo consumed by Track 1 (not created in this monorepo)                              |

Deferred seams (not built now, but shape-locked):

| Topic                          | Directory                                                  |
| ------------------------------ | ---------------------------------------------------------- |
| Observability (metrics / logs) | [`deferred/observability.md`](./deferred/observability.md) |

---

## Start here

1. Read [`00-program-overview.md`](./00-program-overview.md) — vision, phases, glossary, decisions log.
2. Implement Track 1 using [`deployments/`](./deployments/) in file order `01` → `11`.
3. Implement Track 2 using [`auth-platform/`](./auth-platform/).
4. Spin up the template repo using [`next-template/`](./next-template/) when Track 1 needs a real image to provision.

---

## Document map

### Program

| File                                                 | Contents                                                     |
| ---------------------------------------------------- | ------------------------------------------------------------ |
| [`00-program-overview.md`](./00-program-overview.md) | Vision, three tracks, phase roadmap, glossary, decisions log |

### Deployments (`docs/deployments/`)

| File                                                                           | Contents                                             |
| ------------------------------------------------------------------------------ | ---------------------------------------------------- |
| [`01-architecture.md`](./deployments/01-architecture.md)                       | Components, sequence diagrams                        |
| [`02-data-model.md`](./deployments/02-data-model.md)                           | Mongoose schemas, ERD, DomainHostingRecord migration |
| [`03-integrations.md`](./deployments/03-integrations.md)                       | Cloudflare / NPM / Portainer / GitHub clients        |
| [`04-orchestrator.md`](./deployments/04-orchestrator.md)                       | Step registry, state machine, adopt/skip/verify      |
| [`05-api-spec.md`](./deployments/05-api-spec.md)                               | CRM + portal REST endpoints                          |
| [`06-ui-spec.md`](./deployments/06-ui-spec.md)                                 | Pages, wizards, nav registration                     |
| [`07-rbac-and-partner-access.md`](./deployments/07-rbac-and-partner-access.md) | Permissions, partner team + deployment access        |
| [`08-billing.md`](./deployments/08-billing.md)                                 | Packages, cycles, payments, invoice seam             |
| [`09-import-reconciliation.md`](./deployments/09-import-reconciliation.md)     | Import existing stacks, drift                        |
| [`10-security.md`](./deployments/10-security.md)                               | Credential vault, token scoping, audit               |
| [`11-implementation-plan.md`](./deployments/11-implementation-plan.md)         | Phased tasks, tests, rollout                         |

### Auth platform (`docs/auth-platform/`)

| File                                                                     | Contents                                      |
| ------------------------------------------------------------------------ | --------------------------------------------- |
| [`01-architecture.md`](./auth-platform/01-architecture.md)               | Service layout, flows                         |
| [`02-data-model.md`](./auth-platform/02-data-model.md)                   | Identity, credentials, sessions, links        |
| [`03-oidc-and-linking.md`](./auth-platform/03-oidc-and-linking.md)       | OIDC endpoints, account linking               |
| [`04-migration.md`](./auth-platform/04-migration.md)                     | CrmUser / PortalUser / NextAuth consolidation |
| [`05-implementation-plan.md`](./auth-platform/05-implementation-plan.md) | Phased build plan                             |

### Next template (`docs/next-template/`)

| File                                                             | Contents                                      |
| ---------------------------------------------------------------- | --------------------------------------------- |
| [`01-repo-and-cms.md`](./next-template/01-repo-and-cms.md)       | Separate-repo layout, plugin/CMS model        |
| [`02-auth-client.md`](./next-template/02-auth-client.md)         | Local users + platform identity link          |
| [`03-deploy-contract.md`](./next-template/03-deploy-contract.md) | Standalone, Dockerfile, GHCR, health, webhook |

### Living product docs (updated by this program)

| File                                                         | Change                          |
| ------------------------------------------------------------ | ------------------------------- |
| [`../SIRONIC_SYSTEM_MANUAL.md`](../SIRONIC_SYSTEM_MANUAL.md) | New Hungarian § for deployments |
| [`../DATABASE.md`](../DATABASE.md)                           | New entities + ERD edges        |

---

## Conventions

- **Prose in `docs/`:** English, with Hungarian domain terms kept where the product UI uses them (Partner, Munkalap, etc.).
- **Code / schema identifiers:** English (`snake_case` fields matching existing `@crm/db` style).
- **UI strings (when implemented):** Hungarian-first, matching current CRM/portal.
- **Architecture rules:** Follow [`../rules.md`](../rules.md) and [`.cursor/rules/sironic-ui.mdc`](../.cursor/rules/sironic-ui.mdc).
- **API pattern:** `requireCrmAuth()` / `requirePortalAuth()` → `guard()` → Zod → Mongoose → `serializeForJson()` → `handleApiError()`.
