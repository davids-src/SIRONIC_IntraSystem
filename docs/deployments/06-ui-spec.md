# 06 — UI Specification

UI language: **Hungarian** (match existing CRM/portal). Components from `@crm/ui` only for form controls (see `.cursor/rules/sironic-ui.mdc`). Layout: `flex flex-col gap-6`, cards `p-6`.

---

## 1. CRM navigation

File: `apps/crm/app/crm-shell.tsx` — add to `crmNavItems`:

| Label               | Href           | Placement                           |
| ------------------- | -------------- | ----------------------------------- |
| Deployments         | `/deployments` | After Projects / near technical ops |
| (Settings children) |                |                                     |

Settings links (from `/settings` page):

- `/settings/integrations`
- `/settings/deployment-packages`
- `/settings/stack-templates`

Optional top-level **Számlázás / Deployments billing**: `/deployments/billing`.

---

## 2. CRM pages

### 2.1 `/deployments` — List

- `PageHeader` title “Deployments”
- Actions: “Új deployment”, “Import”, “Számlázás”
- Filters: search, status, partner (`ItemPickerModal` contact), billing badge
- `Table` columns: number, name, domain, partner, status, package, next billing, last paid, updated
- Row click → `/deployments/[id]`

### 2.2 `/deployments/new` — Wizard

Multi-step client wizard (useState; no react-hook-form — match codebase):

1. **Partner + identity** — contact, name, domain, www
2. **DNS** — A/CNAME + target (default `DEPLOYMENTS_PUBLIC_IP`)
3. **Proxy** — forward host/port/scheme
4. **Image + stack** — repository, tag, template select, stack name, env editor
5. **Billing** — package, cycle, price override
6. **Review** — POST create → redirect to detail

Allow “Mentés piszkozatként” after step 1.

### 2.3 `/deployments/[id]` — Detail

Header: name, domain, status badge, partner link, actions (Futtatás, Redeploy, Archiválás).

**Left/main: Step runner timeline**

For each of 8 steps:

- Status chip (pending/running/done/failed/skipped/adopted/manual_required)
- Message
- Actions: Terv, Futtatás, Adopt (modal: external id), Verify, Skip
- Expandable meta / last error

**Tabs:**

| Tab         | Content                                                          |
| ----------- | ---------------------------------------------------------------- |
| Áttekintés  | Summary cards, links to CF/NPM/Portainer if ids present          |
| DNS         | Zone id, NS list, records, activation status                     |
| SSL & Proxy | Cert id, proxy host forward target, force SSL                    |
| Stack       | Compose preview, containers list, logs drawer (tail), webhook id |
| Számlázás   | Package, cycle, price, payments table, mark paid                 |
| Események   | Infinite list of DeploymentEvent                                 |

### 2.4 `/deployments/import`

1. “Szkennelés” → scan results grouped by domain
2. Select candidate → pick contact → map adopts → Apply

### 2.5 `/deployments/billing`

Board: overdue / due soon / paid this period.  
Filters by contact. Links into deployment billing tab.

### 2.6 Settings pages

**`/settings/integrations`**

- List connections per provider
- Add/Edit modal (credentials write-only)
- Healthcheck button → toast

**`/settings/deployment-packages`**

- CRUD table for packages

**`/settings/stack-templates`**

- List; editor with textarea for YAML + placeholders table
- “Set default” toggle

---

## 3. Portal navigation

File: `apps/partner-portal/app/partner-shell.tsx`

| Label       | Href           | `portal_permissions` |
| ----------- | -------------- | -------------------- |
| Deployments | `/deployments` | `menu_deployments`   |
| Csapat      | `/team`        | `menu_team`          |

Update `filterNav` accordingly. Fix inventory gating if touching that file (currently tied to contracts — out of scope unless needed).

---

## 4. Portal pages

### 4.1 `/deployments`

Table: name, domain, status, package name, next/last paid (if billing visible).  
No env secrets.

### 4.2 `/deployments/[id]`

Read-only overview: status, domain, SSL/proxy summary (no admin ids required), recent events.  
If `access_level === "manage"`: Redeploy button.

### 4.3 `/team`

- List portal users (email, role, last invite)
- Invite form: email, role, multi-select deployments
- Per-user: edit roles, reset password, deployment access matrix (checkboxes)

Only `partner.admin`. Viewers redirected.

---

## 5. Organization detail (CRM)

On `/organizations/[id]`:

- New tab **Deployments** — list filtered by contact_id + “Új” deep link
- Portal permissions toggles: `menu_deployments`, `menu_team`
- DomainHosting banner if migrated records exist

---

## 6. Components to add in `@crm/ui` (if missing)

Prefer composition of existing Card/Table/Badge/Button. New candidates:

- `StatusTimeline` (optional) — or keep local to deployments feature folder under `apps/crm/app/(crm)/deployments/_components/`

Feature components stay in the app until reused by portal.

---

## 7. Toasts & copy

Use `sonner`. Examples:

- “Zone létrehozva”
- “NS delegálás: állítsd be a következő nameservereket a regisztrátornál: …”
- “NPM verzió túl régi (CVE-2024-39935)”
- “Import kész: DEP-000123”

---

## 8. Empty / forbidden states

Match existing HU patterns (“Nincs jogosultságod…”, empty table CTAs).
