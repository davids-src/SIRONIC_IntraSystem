# SIRONIC IntraSystem

Internal CRM and Partner Portal monorepo scaffold with strict TypeScript, modular package boundaries, and RBAC-first architecture.

## Apps

- `apps/crm`
- `apps/partner-portal`

## Packages

- `packages/shared`
- `packages/ui`
- `packages/lib`
- `packages/types`
- `packages/auth`
- `packages/rbac`
- `packages/modules`

## Prerequisites

- **Node.js** 20 or newer (LTS recommended)
- **pnpm** 10.x (the repo pins `packageManager` in the root `package.json`; enable via `corepack enable` if needed)

## Quick Start

From the repository root:

1. `pnpm install`
2. `pnpm dev` — runs Turbo and starts both Next apps in parallel:
   - **CRM**: http://localhost:3000 (`@crm/crm-app`)
   - **Partner portal**: http://localhost:3003 (`@crm/partner-portal-app`)

If `pnpm dev` fails to resolve the Turbo binary (rare PATH/hoisting issues), use:

- `pnpm exec turbo run dev`

Or run a single app:

- `pnpm --filter @crm/crm-app dev`
- `pnpm --filter @crm/partner-portal-app dev`

## Quality Gates

- `pnpm typecheck`
- `pnpm test`
- `pnpm build`
