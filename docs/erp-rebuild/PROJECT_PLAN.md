# SIRONIC ERP rebuild — Project Plan

**Status:** planning (nothing implemented). **Branch:** `feat/erp-system-planning`.
**Source of rules:** `~/programing/tCrm-templete` (engine docs 01–17, `templates/`). Chapter 17 is the
porting guide for this exact system; this plan makes its §3 conflicts and §4 mapping concrete.
**Pair with:** [INVENTORY_MAPPING.md](./INVENTORY_MAPPING.md) (old entity → new module).

Goal: re-implement the business logic of the current SIRONIC IntraSystem (CRM + partner portal) as a
module set on the tCrm-template engine (facade-per-module, DAG, RBAC-as-data, DataTable everywhere,
Feladat/Jelzés engine, user guide shipped with each feature), instead of the current
`apps/*` + `packages/{db,types,modules}` layout.

---

## 1. Scope

**In (business logic to carry over)** — full list in INVENTORY_MAPPING.md:
partners/contacts/suppliers/leads; price list + service pricing engine (fetch-and-freeze snapshots);
warehouse, stock, stock allocation, inventory taking, RMA; offers, contracts, purchase orders;
projects, weekly plans, tickets, worklogs, maintenance plans; delivery notes (stock-out), completion
certificates (portal sign-off), invoices (Billingo), warranties; tools tracking; secrets vault;
soft-delete/archive; draft-only editing rules; preflight checks; partner portal; deployments
orchestration + billing packages + central auth (the already-specified P1–P7 program).

**Out / unchanged for now:** `apps/auth` (IdP) and `packages/deploy-cli` keep working as they are
(just shipped, OIDC bridge in use); observability (deferred P8); native mobile.

## 2. Strategy

- **Build beside, cut over later.** New code goes in new `apps/erp` + `packages/<module>` under the
  **`@erp/`** scope on this branch. Legacy `apps/crm`, `apps/partner-portal`, `@crm/*` stay runnable and
  untouched until Phase 7 cutover. No big-bang rewrite of working code.
- **Vertical slices in DAG order**, each meeting the template's Definition of Done (docs/03): model →
  facade → pages → permissions → help article → tests → migration script.
- **Quality gates from day 1** (docs/12): Vitest, eslint(+boundaries), commitlint, `pnpm preflight`.
  Legacy has no lint/tests, so the engine gates are adopted wholesale, not retrofitted.
- **Migration is idempotent per module** with stored old→new id maps (docs/17 §1.5).

## 3. Phases

| Phase                         | Content                                                                                                                                                                                                                                                                                 | Depends     | Notes                                                                                                                    |
| ----------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------ |
| **0 — Foundation**            | Close decisions #1–#10. Engine packages (`db-core, auth, rbac, admin, core, lib, mail, media, ui, feladat, jelzes, test-utils, eslint-config, tsconfig`) copied from RecPlus with scope rename; `apps/erp` shell, `/setup`, branding, Docker/CI, hooks, `CLAUDE.md`, `AGENT_HANDOFF.md` | —           | Smallest risk, template-sourced. OIDC login against existing `apps/auth` wired here (#2)                                 |
| **1 — Independent modules**   | `@erp/partner` (contacts, suppliers, leads, pricing profile), `@erp/arlista` (product price list + service categories/items + multiplier matrix), `@erp/secrets` (Titoktár, from tCrm), `@erp/eszkoz` (tools + transaction log)                                                         | 0           | No cross-module deps → parallelisable. `arlista` exposes `calculateServicePrice` (port of `packages/modules/pricing`)    |
| **2 — Készlet**               | `@erp/keszlet`: warehouse locations, stock items, append-only `StockTransaction`, allocation, inventory taking, RMA, dashboard KPIs (value, low stock, dead stock 90d)                                                                                                                  | 1 (arlista) | First place where the **no-transaction invariant pattern** (§5) is proven                                                |
| **3 — Értékesítés & Projekt** | `@erp/ertekesites` (offers w/ wizard + totals recalculation, contracts generated/uploaded, purchase orders); `@erp/projekt` (projects, phases, checklists, expenses, weekly plans Kanban, staging links)                                                                                | 1, 2        | First real cross-module facade calls (offer lines → arlista snapshot; PO → keszlet receive) — validates boundary pattern |
| **4 — Szerviz & Bizonylatok** | `@erp/szerviz` (tickets w/ internal comments, worklogs + signature, maintenance plans); `@erp/bizonylat` or split: delivery notes (stock-out via keszlet), completion certificates (+portal sign-off), invoices + Billingo, warranties (counter + pdfmake)                              | 2, 3        | Preflight check becomes a facade method (`preflight(docId)`), not an ad-hoc route                                        |
| **5 — Cross-cutting**         | Teendőim feed (each module `listMyAssignments`), Feladatok linked to next steps (ticket owner, certificate awaiting signature, overdue invoice, maintenance due), Jelzések, dashboard KPIs, global search                                                                               | 3, 4        | Needs ≥2 live modules (met)                                                                                              |
| **6 — Partner portal**        | Second composition root `apps/portal` with its own, narrower RBAC; consumes the same facades via portal-scoped viewer (§5, #3)                                                                                                                                                          | 3, 4        | Replaces the known no-op `contact` scope (memory: RBAC gap) with an enforced `viewer → contactId` filter in facades      |
| **7 — Platform program**      | `@erp/deployments` + `@erp/integrations` (Cloudflare/NPM/Portainer/GitHub, step orchestrator on `@erp/core/folyamat`), billing packages/payments, central-auth alignment; follows `docs/deployments/*` and `docs/auth-platform/*`                                                       | 0, 1        | Largely already specified; split from `packages/modules` into separate facades (#7, #8, #9)                              |
| **8 — Migration & cutover**   | Per-module idempotent scripts, dry-run on DB copy, parallel read-only period, switch domains                                                                                                                                                                                            | all         | Final step, but scripts are written per phase                                                                            |
| **9 — Hardening**             | Full help coverage, tour, backup, prod deploy (Portainer stack), perf pass                                                                                                                                                                                                              | all         |                                                                                                                          |

Customer feedback rounds: `5a, 5b, …` (dated, per item) once Phase 3 is demoable.

## 4. Module DAG (proposed)

```
partner ─┬─→ ertekesites ──→ bizonylat (certificates, invoices, warranties)
arlista ─┤        │               ↑
         ├─→ keszlet ──→ (delivery notes via bizonylat → keszlet)
         └─→ projekt ──→ szerviz
eszkoz, secrets: leaves.   deployments → partner, secrets (crypto), integrations
Engine services (feladat, jelzes, media, mail): wired by apps/erp, never imported by domain packages.
```

Rule check: downstream→upstream sync facade calls only; reverse effects via domain events / hooks
(e.g. `certificate.accepted` → invoice draft task; `stock.low` → Jelzés).

## 5. Business-logic carry-over rules (where legacy and engine differ)

1. **No Mongo transactions in prod** (standalone Mongo; engine supports this via `runWithOptionalTransaction`).
   Legacy delivery-note issue, inventory taking and allocation use sessions — rewrite as
   _check-all → mutate-all_ with conditional atomic updates
   (`updateOne({ qty: { $gte: n } }, { $inc: { qty: -n } })`, check `matchedCount`), an append-only
   `StockTransaction` as source of truth, idempotent re-run keyed by `(referenceType, referenceId, line)`,
   and an integration test that simulates a mid-way failure.
2. **Snapshot (fetch-and-freeze)** stays: document lines store `priceSnapshot`; PDFs read only embedded values.
3. **Draft-only editing** → state-machine guard in each facade (`assertEditable(doc)`), not in routes/UI only.
4. **Soft-delete** (`is_archived`, reason) → shared mixin in the owning module; `issued` delivery notes cannot be archived (cancel first).
5. **Sequential numbers** (e.g. `JJY-000042`, offer/PO numbers) → `nextSequence('<module>:<type>')`.
6. **PDF**: stays client-side `html2pdf.js` (#11), behind a `PdfRenderer` seam; HTML builders become pure functions so they are unit-testable. Pdfmake is a later optional experiment.
7. **Sensitive data cut in facade**, not UI: PO `purchase_records`, internal notes/comments, purchase prices never reach portal viewers.
8. **Soft statuses → engine vocabulary**: every status gets `*_LABELS` + `*_TONES`; lifecycle entities use `withStatusTracking` (status history = audit log; replaces `AuditLog` for these).
9. **Language**: UI Hungarian and domain identifiers Hungarian (#12); migration scripts rename fields.

## 6. Domain-specific risks

- **Stock integrity without transactions** — highest risk; see §5.1. Mitigation: build and test in Phase 2 before documents depend on it.
- **Tenant collapse** — every legacy query is `tenantId`-scoped; migration drops it (#1). Verify prod has a single distinct `tenantId` first, or a second tenant's data would be merged.
- **Partner-portal isolation** — today relies on each route manually filtering `contact_id`. New design must make isolation structural (viewer-scoped facades + tests that fail if a facade omits the filter).
- **Billingo / NAV** — invoice flow and webhook HMAC verification must be preserved; NAV obligations unconfirmed (#13).
- **Concurrent work in this repo** — other sessions have been editing it (deployments track). New code lives in new dirs to avoid collisions; re-check `git status` before touching shared files (`package.json`, `turbo.json`, workspace config).
- **Scope** — ~52k LOC CRM + portal; Phases 1–4 are the bulk. Phase 7 is optional to schedule earlier if deployments is the business priority.

## 7. Decision log

Numbering is continuous and never reused. Recommended defaults are assumptions until the owner confirms.

1. **Multi-tenant vs single-tenant** — **decision (2026-11-21)**: the ERP is single-tenant (one instance = one DB = one organisation, per engine). The partner portal is not tenancy: partners see only their own data via a viewer→`contactId` filter in the facades (see Phase 6). Migration drops `tenantId`. Nyitva: confirm prod data holds only one tenant before migration (quick count of distinct `tenantId`).
2. **Auth** — _implemented in Phase 0 (2026-11-21), pending live IdP check_: keep `apps/auth` as IdP; `@erp/auth` signs in via OIDC and links to a local `User`+`Role` (permissions stay local). Reuses the just-built OIDC/CLI bridge.
3. **Apps** — _open, recommended_: two composition roots (`apps/erp` staff, `apps/portal` partners), shared domain packages, separate RBAC.
4. **Test runner** — _recommended_: Vitest (migrate the few Jest tests in `lib`/`modules`).
5. **Tooling** — _recommended_: adopt engine gates (turbo `preflight`, eslint, commitlint, husky); pnpm stays 10.
6. **`@crm/types`** — _recommended_: dissolve into per-module types; only shared DTOs in `@erp/core`.
7. **`packages/modules`** — _recommended_: split into `@erp/arlista` (pricing) and `@erp/deployments`.
8. **Integration secrets** — _recommended_: share AES-256-GCM `crypto.ts` with Titoktár; clients in `@erp/integrations`.
9. **Orchestrator states** — _recommended_: express step states with `@erp/core/folyamat` for unified UI/Teendőim.
10. **Lint-staged-only** — superseded by #5.
11. **PDF engine** — **decision (2026-11-21)**: keep client-side `html2pdf.js` for parity (no layout re-sign-off). Generation sits behind a small `PdfRenderer` seam per document type so server-side `pdfmake` can be tried later and compared. Nyitva: pdfmake trial after Phase 4, optional.
12. **Domain identifier language** — **decision (2026-11-21)**: Hungarian domain identifiers (`Partner`, `Ajanlat`, `Szallitolevel`, `Munkalap`, `Hibajegy`, `Teljesitesigazolas`, `Jotallas`…), matching the template and the team's vocabulary. The legacy→new name table lives in INVENTORY_MAPPING.md and is filled per module before its phase; migration scripts own the field renames (snake_case English → camelCase Hungarian).
13. **Invoicing/NAV scope** — **decision (2026-11-21)**: keep Billingo as issuer of record. The ERP stores invoice records, syncs to Billingo and handles the HMAC-verified webhook (paid → status). No native NAV reporting.
14. **Repo placement** — _decision (2026-11-21, assumed)_: build in this repo on a branch under `@erp/`, legacy untouched until cutover. Reason: shared history, shared `apps/auth`, no cross-repo drift. Open: move to a fresh repo at cutover if preferred.

15. **Workspace layout** — **decision (2026-11-21)**: the new system is a separate pnpm workspace in `erp/` (own `package.json`, `.npmrc`, turbo; scope `@erp/`), not part of the root workspace, so folder names (`packages/auth`, `ui`, `rbac`, …) never collide with legacy and legacy builds stay untouched. Husky is not auto-installed from `erp/` (it would repoint the repo-wide `core.hooksPath`). Nyitva: hoist `erp/` to the repo root at cutover.
16. **Heti terv (weekly plan): own entity vs. `@erp/feladat`** — **decision (2026-11-21, Phase 3 `@erp/projekt`)**: built as its own entity `HetiTerv` in `@erp/projekt`, not on `@erp/feladat`. Evaluated: (a) the weekly plan is keyed by ISO week/year and its Kanban is the primary UI, (b) its ownership rule is "self-only unless `projekt:hetiterv:delegal`" with read-for-all coordination, whereas Feladat models assignment/hand-over/accept/reject workflows, groups and chat (a delegated weekly item would wrongly enter an accept/reject flow), (c) it links to hibajegy/projekt/munkalap as opaque ids and must stay archivable with a reason like every other entity, (d) a Feladat dependency would force `projekt` to import an engine service (against "engine services are wired by apps/erp only"). Cost accepted: some duplicated status/priority vocabulary. Integration: `projektApi.listMyAssignments` returns open items as `TaskRef` (`kind: "task"`), so they appear in Teendőim without Feladat. Revisit when Phase 5 (cross-cutting Feladatok) lands: if the team wants weekly items to be promotable to real Feladatok, add a "Feladattá alakít" action in the composition root (app-level, via `feladatApi`), not a model merge.

## 8. Immediate next steps

1. Verify the distinct `tenantId` count in prod (read-only query, run by you or with your OK). #1, #11–#13 are decided; #2–#9 keep their recommended defaults unless you object.
2. ~~Phase 0 spike~~ **done (2026-11-21)**: engine packages + stripped app shell in `erp/`, lint/typecheck/test/guard/build green. OIDC login (#2), `/setup` smoke test, CI workflows and Dockerfile fixes now done (see `erp/docs/AGENT_HANDOFF.md`). Remaining: live-IdP check, Hungarian review of copied help articles, #15.
3. Deep per-module field-level mapping (legacy model → new model, incl. indexes) written _just before_ each phase starts, using INVENTORY_MAPPING.md as the skeleton.
