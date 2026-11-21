# Agent handoff — SIRONIC ERP

**Last update: 2026-11-21** · branch `feat/erp-system-planning` (Phase 0 closed except the items in §2)

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
  Also: add a short user-guide note about "Belépés SIRONIC fiókkal" once OIDC is live.
- Decision #15 (see plan): where `erp/` lives long-term and husky wiring.
- OIDC needs an end-to-end check against a real `apps/auth`: register an OIDC client there with redirect
  URI `<AUTH_URL>/api/auth/callback/sironic`, set `OIDC_ISSUER` / `OIDC_CLIENT_ID` (/ `OIDC_CLIENT_SECRET`).
  Only the linking logic and provider wiring are tested (no live IdP in CI).
- Docker: Dockerfile COPY lines were corrected (feladat, jelzes, test-utils, .npmrc added; `.dockerignore`
  added). See the build note in the final report of the Phase 0 closing commit; re-run
  `docker build -f apps/erp/Dockerfile .` from `erp/` after adding packages (every workspace package
  `package.json` must be COPY'd in the `deps` stage).
- `erp/pnpm-lock.yaml` is committed (`erp/.gitignore` un-ignores it; the legacy root ignores it). CI and Docker use
  `--frozen-lockfile`: commit lockfile changes with any dependency change.

## 2a. Done in Phase 0 close-out

- **OIDC login (#2)**: `@erp/auth` registers an Auth.js OIDC provider `sironic` only when `OIDC_ISSUER` and
  `OIDC_CLIENT_ID` are set (`OIDC_CLIENT_SECRET` optional = public PKCE client). Credentials login stays
  (/setup admin, local dev, break-glass). Code: `packages/auth/src/oidc.ts` (pure decision + HU messages),
  `oidc-link.ts` (DB link), `config.ts` (`signIn` callback). `User.platformUserId` (partial unique index) stores the IdP `sub`.
- **Linking rule**: the IdP proves identity only; permissions always come from the local `User` + `Role`.
  1. A local user already linked to the `sub` logs in (email changes at the IdP do not matter).
  2. First login: the IdP email must be **verified** and match an existing local `User.email`; the `sub` is then linked.
  3. No local user -> rejected ("kérjen meghívót"): **never auto-created**. An invitee must first accept the invitation
     (creates the local user) or an admin creates the user; then OIDC login links it.
  4. Local user already linked to another `sub` -> rejected. Deactivated local user -> always rejected.
     Rejections redirect to `/login?oidc=<reason>` (Hungarian message). Login page button "Belépés SIRONIC fiókkal" only when configured.
- **/setup + login smoke test**: `apps/erp/src/app/(setup)/setup/setup-flow.integration.test.ts` (memory Mongo).
- **CI**: `.github/workflows/erp-ci.yml` (lint, typecheck, unit, integration, guard, build; Node 20/22; pnpm 9) and
  `erp-docker-publish.yml` (ghcr.io/<owner>/sironic-erp). `pnpm test` with `CI=true` skips `*.integration.test.ts`; CI runs
  `pnpm test:integration --concurrency=1`. (The old `test:integration` scripts used a glob filter that matched nothing; now `integration.test`.)

## 2b. Phase 6 (partner portal) — done

- `apps/portal` (port 3001), `@erp/portal-auth`, guard `scripts/verify-portal-isolation.mjs` (in `preflight` + CI), guide in
  `docs/portal-guide/`, decision #20 in the plan. Docker: `apps/portal/Dockerfile`, compose + portainer services, docker-publish matrix.
- **Open**: staff-side UI to invite the first partner admin (use `invitePortalUser` from `@erp/portal-auth` in `apps/erp`;
  set `PORTAL_URL`); add `@erp/portal-auth` to `apps/erp` deps when doing so. Shared-store rate limiter and OIDC
  login for the portal. `docker build -f apps/portal/Dockerfile .` was not run locally.

## 3. Traps

- Two `@types/react` copies → `.npmrc` hoist (see `erp/README.md`).
- Do not run the dev server against the legacy/prod DB.
