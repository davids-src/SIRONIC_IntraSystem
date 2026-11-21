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

## 1a. Phase 5 (cross-cutting wiring) — done

All wiring lives in `apps/erp/src/lib/` (domain packages still import neither each other nor engine services).

- **Stock ports**: `keszletBevetelPort` (`ertekesites-loaders.ts`: PO fulfil -> `keszletApi.bevetelez`, ref `beszerzesi_rendeles:<id>`,
  non-product lines skipped), `keszletKiadasPort` in `szerviz-loaders.ts` (worklog finalize) and `bizonylat-loaders.ts` (delivery note).
  Fulfil action always passes the port; `ujraBevetelezMegrendeloAction` + button retry a failed receipt. Proven end-to-end in
  `src/lib/keszlet-portok.integration.test.ts` (memory Mongo).
- **Event listeners** (`esemeny-figyelok.ts`, registered by `core-bootstrap.ts`, best-effort): `ajanlat.elfogadva` -> linked Feladat
  - push for the accepting user (contract prep, due +7 days); `teljesitesigazolas.elfogadva` -> draft invoice via `bizonylatApi.createSzamla`
    (actor = first user with `bizonylat:szamla:write`; no such user -> skipped + logged) + notify them; `keszlet.alacsony` (new payload in
    `@erp/core`, emitted by `keszletApi.kiad` after a real issue) -> Jelzés to users with `keszlet:keszlet:write`.
    Listeners are registered from `ensureCoreBootstrapped()` (dashboard layout), so events emitted from an unauthenticated route (the
    future public certificate sign-off page, Billingo webhook) only react once a dashboard page was rendered in that process: call
    `ensureCoreBootstrapped()` from those routes when they land.
- **Dashboard**: `DASHBOARD_PROVIDERS` in `lib/dashboard.ts` (partner, arlista, keszlet, ertekesites, szerviz, bizonylat x2, projekt,
  eszkoz, deployments x2); icon union extended (folder, receipt, server, briefcase). Activity comes from new `getTevekenyseg()` on
  ertekesites (ajanlat), szerviz (hibajegy) and bizonylat (szamla); other modules contribute tiles only.
- **Global search**: `search(query, viewer)` on partner, arlista, keszlet, ertekesites, szerviz, bizonylat, projekt, eszkoz,
  deployments, secrets facades (permission checked before any query, 5 hits per type, min 2 chars). `lib/kereses.ts` fans out;
  header form + `/kereses` page. `@erp/arlista` and `@erp/secrets` do not depend on `@erp/core`, so they declare the hit shape
  structurally. Feladat is not in the global search (it has its own list search).
- **Teendőim**: every module's `listMyAssignments` was already in `teendo-feed.ts`; `kategoriaOf` now maps module -> its own category
  (`teendo.ts` labels), "egyeb" only for unknown modules. `kapcsolat-allapot.ts` still resolves flow state for Feladat only.
- Help: `kereses.md` (new), `vezerlopult.md` rewritten for the ERP, `megrendelolapok.md` / `feladatok.md` updated.

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

## 2c. Data migration runner (legacy `crm_dev` -> new ERP, same DB) — done

- `pnpm migrate` (dry run) / `pnpm migrate --execute` (`scripts/migrate/run.ts` + `runner.ts`, pure helpers in
  `runner-lib.ts`). Source and target are both `crm_dev`: legacy collections are read-only (hard-coded denylist,
  asserted against every model collection before the first write), `crm` / `sironic_auth` are refused. Id maps live in
  `_migration_idmap`; counters in `erp_counters`. Re-runs never duplicate (transactional docs are insert-only).
- Users: legacy `crmusers` -> `users` keeping the bcrypt hash (login with the old password); `crm.admin` -> role `admin`.
  RBAC baseline is synced by the runner. `/setup` is skipped because an active admin exists.
- Run with `npx tsx --env-file=apps/erp/.env scripts/migrate/run.ts` to also get the secrets decrypt check.
  `scripts/migrate/verify.ts` counts collections and calls the facades. Not migrated (no adapter / by design): see the
  runner report (stock transaction history, portal users, empty legacy collections, certificates without partner).

## 2d. Header search v2 (live, menus + modules)

- `components/globalis-kereso.tsx` (client): menu/module entries filter in the browser (`lib/navigation/menu-kereses.ts`,
  entries built in the dashboard layout from the viewer's permissions), record hits come from `GET /api/kereses?q=`
  (debounced, abortable, same `globalisKereses` fan-out + per-facade permission checks). Ctrl/Cmd+K or `/` focuses it;
  Enter without a selection opens `/kereses`. No page reload (`router.push`). Mirrored in `recplus` (menu/module search).

## 3. Traps

- Two `@types/react` copies → `.npmrc` hoist (see `erp/README.md`).
- Do not run the dev server against the legacy/prod DB.
