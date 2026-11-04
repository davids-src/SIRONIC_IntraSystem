# @sironic/deploy-cli

CLI for deploying partner sites without the CRM web UI. It calls the same
`apps/crm/app/api/deployments/*` endpoints the CRM wizard uses — this is a client, not a
second implementation of the orchestrator (see `packages/modules/src/deployments/`).

## How login works

The CRM deployment API is still guarded by CRM's own NextAuth session (see
`docs/auth-platform/04-migration.md` — CRM hasn't moved to platform OIDC yet), so a CLI
can't just hold an apps/auth token and call it directly. This CLI does two hops:

1. **apps/auth login** — standard OIDC authorization_code + PKCE, loopback redirect
   (`http://127.0.0.1:<port>/callback`, trying `51739`, `51740`, `51741` in order). Opens
   your system browser to apps/auth's own login page (password/TOTP/passkey — whatever
   your platform account has configured) and gets a signed `id_token` back. No new auth-app
   code was needed for this — `/api/oidc/authorize` and `/api/oidc/token` already support a
   public PKCE client.
2. **CRM bridge exchange** — `POST ${SIRONIC_CRM_URL}/api/auth/cli/exchange` trades that `id_token`
   for a short-lived (12h) CRM-local bearer token, by verifying the token's signature and
   mapping its email to a `CrmUser` with `crm.admin`/`crm.staff`. Every later CLI → CRM
   request sends `Authorization: Bearer <that token>`.

**Your platform account's email must match a CrmUser's email** with `crm.admin` or
`crm.staff` in `roleKeys` — the bridge refuses the exchange otherwise. If you only have a
CRM login today and no apps/auth account, get one created first (apps/auth has no public
self-signup; an existing platform admin, or `/setup` if apps/auth has never been
initialized, creates it).

## One-time environment setup (per deployment, not per operator)

1. Register the CLI as an OIDC client (run once against the real `AUTH_MONGODB_URI`):
   ```
   pnpm --filter @crm/auth-app register-cli-client
   ```
   This prints a `client_id`. Set it as:
   - `CLI_OIDC_CLIENT_ID` in apps/crm's env (used by the exchange route to check the
     token's audience)
   - `SIRONIC_CLI_CLIENT_ID` for every CLI operator (below)
2. Set `CRM_CLI_TOKEN_SECRET` in apps/crm's env — any long random string, used only to sign
   the CLI's bearer token. Rotating it invalidates every logged-in CLI session.

## Operator setup

```
export SIRONIC_AUTH_URL=https://auth.src.co.hu
export SIRONIC_CRM_URL=https://crm.your-domain
export SIRONIC_CLI_CLIENT_ID=oidc_xxxxxxxxxxxxxxxxxxxxxxxx
```

Optional: `DEPLOYMENTS_PUBLIC_IP` prefills the DNS target prompt during `deploy`, matching
the CRM wizard's `NEXT_PUBLIC_DEPLOYMENTS_PUBLIC_IP` default.

The session token (not your password — the CLI never sees apps/auth credentials directly,
only what the browser login flow produces) is stored at
`~/.config/sironic-deploy-cli/session.json`, mode `0600`.

## Usage

```
pnpm --filter @sironic/deploy-cli build
./packages/deploy-cli/dist/cli.js login
./packages/deploy-cli/dist/cli.js deploy
./packages/deploy-cli/dist/cli.js status                  # list
./packages/deploy-cli/dist/cli.js status <deployment-id>   # one deployment's steps
./packages/deploy-cli/dist/cli.js events <deployment-id>
./packages/deploy-cli/dist/cli.js redeploy <deployment-id> [--tag <new-tag>]
./packages/deploy-cli/dist/cli.js logout
```

Or during development: `pnpm --filter @sironic/deploy-cli dev -- deploy`.

`deploy` mirrors the CRM wizard's **single-host** mode field-for-field (Partner → DNS →
Stack & Image → Proxy → Billing → Review), then creates the deployment and, if confirmed,
calls `run` repeatedly until it's blocked, needs a manual step (e.g. `ns_delegation`'s
nameserver instructions), or finishes. Multi-host creation (the wizard's "multi" mode) and
individual step actions (plan/adopt/skip/verify) aren't implemented here — use the CRM UI
for those; this CLI covers create → run → redeploy → status/events, per its original scope.

### Non-interactive `deploy` (scripted callers, e.g. the `/deploy` skill)

```
./dist/cli.js contacts --q acme     # resolve a contact_id
./dist/cli.js templates             # resolve a stack.template_id
./dist/cli.js packages              # resolve a package_id
./dist/cli.js deploy --file input.json --yes
```

`--file` takes a JSON object matching `CreateDeploymentInput` (`src/schema.ts` — the same
fields `deploy`'s wizard asks for, same optionality) and skips every prompt; `--yes` also
skips the create/run confirmations. `contacts`/`templates`/`packages` print JSON so a
caller can resolve the right `_id` without re-implementing CRM's search/list logic. This
exists so the `/deploy` Claude Code skill (`.claude/skills/deploy/SKILL.md`) can hold the
conversation itself and still have the CLI do all the real work — it never talks to the
CRM API directly.

## Package layout

- `src/auth/` — PKCE, the loopback callback server, the apps/auth login flow, and local
  session storage.
- `src/api/` — thin wrappers around the CRM deployment endpoints (create, run, redeploy,
  events) plus the contacts/stack-templates/packages lookups the wizard needs.
- `src/commands/` — one file per CLI subcommand.
- `src/prompts.ts` — minimal `readline`-based prompts (no extra TUI dependency).
