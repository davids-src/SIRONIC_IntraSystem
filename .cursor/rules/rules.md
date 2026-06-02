# CRM system architecture and development standards

Cursor / agent rule set for **Internal CRM + Partner Portal**. Treat this as the baseline for architecture, stack choices, and quality bar.

> **Note:** The original plan referenced **Next.js 15.x**; upgrading to **16.x** is deferred—revisit when you are ready to align docs and dependencies.

---

## Tech stack (strict)

| Layer                 | Choice                                                                                                                  |
| --------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Framework             | **Next.js 15+** (App Router)                                                                                            |
| Language              | **TypeScript** — `strict` mode, avoid `any`                                                                             |
| UI                    | **Tailwind CSS** + **shadcn/ui** — prefer shadcn primitives; avoid one-off custom components when a shadcn pattern fits |
| Data                  | **MongoDB** + **Mongoose**                                                                                              |
| Repo layout           | **Monorepo** — Turborepo or Nx style (this repo uses Turborepo + pnpm)                                                  |
| Validation            | **Zod**                                                                                                                 |
| Server state (client) | **TanStack Query / React Query** where appropriate                                                                      |
| Auth                  | **NextAuth.js** or **Clerk** (TBD) — must support **RBAC**                                                              |

---

## 1. Core architecture principles (non-negotiable)

1. **Clean architecture + modular design** — features live in clear modules, not spaghetti.
2. **High modularity and reusability** — maximize shared code between `crm` and `partner-portal` via packages (`@crm/shared`, `@crm/ui`, `@crm/lib`, `@crm/types`, `@crm/auth`, `@crm/db`, etc.).
3. **Strict separation of concerns**
   - `apps/crm`
   - `apps/partner-portal`
   - `packages/shared/*` — types, constants, utilities
   - `packages/ui` — shadcn-based shared UI
   - `packages/lib` — shared logic, helpers
   - `packages/types` — shared TypeScript types
   - `packages/db` — Mongoose models and DB access (persistence layer)
   - `packages/auth` — auth helpers / wiring
   - `packages/rbac` — RBAC engine, permissions, guards
   - `packages/modules` — shared module logic when applicable
4. **RBAC is foundational** — design APIs, UI, and data access with roles and permissions from day one.

---

## 2. Code quality and development standards

- **TypeScript:** `strict: true`, `noImplicitAny: true`, `noUncheckedIndexedAccess: true` (or project equivalent).
- **Clean code:** SOLID, DRY, KISS; prefer **composition** over inheritance.
- **Components**
  - Shared UI belongs in **`packages/ui`** (shadcn-first).
  - **Server Components by default.**
  - **`"use client"`** only when needed (interactivity, browser APIs, hooks)—justify in code or PR.
- **Business logic:** keep critical domain logic in **services / domain layers**, not buried only in API route handlers or React components.
- **Testing**
  - **High coverage** for business logic (original bar: **90%+** where practical).
  - **Jest** + **React Testing Library**; integration tests with **MongoMemoryServer** (or equivalent) where DB behavior matters.
  - New features/modules should ship with **tests before merge** when the feature touches business rules.

---

## 3. Monorepo and CI/CD

- **Husky + lint-staged**
  - **Pre-commit:** typecheck, lint, format (as configured in repo).
  - **Pre-push:** full build + tests must pass (when enabled).
- **GitHub Actions**
  - Non-`main` branches: tests + typecheck (and other CI gates you add).
  - `main`: build **two** Docker images (CRM + partner-portal) and publish to registry (e.g. **GHCR**) as you wire it.

---

## 4. Project structure (target layout)

```text
apps/
├── crm/
├── partner-portal/

packages/
├── shared/
├── ui/
├── lib/
├── types/
├── db/              # Mongoose models & DB connection (this repo)
├── auth/
├── rbac/
└── modules/
```

Adapt names to match the repo, but **keep the intent**: apps thin, packages thick, shared UI and types centralized.

---

## 5. RBAC and multi-tenant strategy (critical)

- **CRM:** internal staff with global / tenant-scoped roles as designed.
- **Partner portal**
  - Master company login at **organization** level.
  - Companies can define **roles** with granular permissions per module (view / write / admin).
- Every module should support **resource-based** and **role-based** checks.
- **Central RBAC service** (or package) used on:
  - **Backend** — API authorization, data scoping.
  - **Frontend** — hide/disable UI; never rely on UI alone for security.

---

## 6. First-phase product requirements (directional)

### Foundations

- Dashboards (CRM + portal).
- Organization / partner management (CRM).
- Partner profile management + validation flows.
- Robust **RBAC** (roles, permissions, org-scoped roles).
- **Module system** so new product areas plug in cleanly.

### Module 1 — inventory (example product schema)

Strict product shape (conceptual TypeScript):

```ts
{
  sku: string; // e.g. CATEGORYTAG-XXXXXX
  category: { _id; name; skuPrefix };
  part_number: string;
  net_price: number; // selling price to partners
  image?: string;
  metadata: {
    net_price: number; // internal purchase price
    seller: string;
    part_number: string;
    updated_at: Date;
  };
  metadata_history: Metadata[]; // audit trail
  created_at: Date;
  updated_at: Date;
}
```

**Features:** categories + SKU generation, product CRUD with metadata history, offers for partners, partner offer views, stats/follow-ups, full RBAC on both sides.

---

## 7. UI/UX

- Polished, professional UI using **shadcn + Tailwind**.
- Strong UX for internal CRM users and external partners.
- **One design system** across both apps.
- **Dark mode** supported from the start where the design system allows.

---

## 8. Developer experience

- Adding a **new module** should follow established patterns (folders, API, RBAC hooks, UI shell).
- **Strong typing** end-to-end.
- Smooth paths to add: models, RBAC permissions, CRM + portal pages, API routes with authorization.

---

## Enforcement

Every change should respect these principles—especially **modularity**, **RBAC readiness**, **TypeScript strictness**, **testing**, and **layering**. If a shortcut would violate them, **stop and refactor** (or split the work) instead of shipping debt.

This is a long-lived product (**5+ years** mindset): build for clarity, testability, and safe evolution.

---

## 9. Documentation Enforcement

- **SIRONIC_SYSTEM_MANUAL.md:** The root directory contains a highly detailed functional and technical manual (`SIRONIC_SYSTEM_MANUAL.md`).
- **Mandatory Updates:** Every time a new feature, database entity, UI page, or workflow is added or modified, you **MUST** update the `SIRONIC_SYSTEM_MANUAL.md` file to reflect these changes with microscopic technical and UI/UX detail. Failure to do so will result in an out-of-sync architecture.
