# Agent handoff — SIRONIC ERP

**Last update: 2026-11-21** · branch `feat/erp-system-planning` (uncommitted at time of writing)

## 1. What happened last

- Phase 0 started: engine packages copied from RecPlus (`db-core, auth, rbac, admin, core, lib, mail,
media, ui, feladat, jelzes, test-utils, eslint-config, tsconfig`), scope `@recplus/` → `@erp/`,
  branding → SIRONIC, DB name default `sironic_erp`.
- `apps/erp` shell copied and **stripped of all RecPlus domain code** (gepeszet, vallalkozas,
  termeles, hr, gazdasag pages/routes/libs). Composition-root files (`rbac-bootstrap`, `core-bootstrap`,
  `feladat-kapcsolat`, `kapcsolat-allapot`, `vedett-media`, `teendo-feed`) now have empty module lists
  with a comment where each new module registers itself. Sidebar menu: `src/lib/navigation/modules.tsx`;
  dashboard: `src/lib/dashboard.ts`.
- `Ertesites` type moved into `@erp/core`.

## 2. Open

- `docs/user-guide/*` were copied from RecPlus and still mention RecPlus modules in places
  (`feladatok*.md`, `jelzesek.md`, `fiok.md`, `admin-*.md`, `vezerlopult.md`): do a Hungarian review pass.
- Decision #15 (see plan): where `erp/` lives long-term and husky wiring.
- Phase 0 remaining: OIDC login against `apps/auth` (#2), `/setup` smoke test with memory Mongo,
  `scripts/` guards verified, CI workflow (`templates/ci.yml`), Docker build check.

## 3. Traps

- Two `@types/react` copies → `.npmrc` hoist (see `erp/README.md`).
- Do not run the dev server against the legacy/prod DB.
