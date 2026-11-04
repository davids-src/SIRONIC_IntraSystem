---
name: deploy
description: >-
  Conversationally deploy or redeploy a partner site, or check a deployment's status,
  by driving packages/deploy-cli — never by calling the CRM API directly. Use when the
  user runs /deploy, or asks to deploy/redeploy a partner site or domain, or to check a
  deployment's status/events, outside the CRM web UI.
---

# /deploy

This skill is a thin conversational front end for `@sironic/deploy-cli`
(`packages/deploy-cli`). It holds the conversation; the CLI does every real step (auth,
validation, CRM API calls, the run loop). **Never call `apps/crm/app/api/deployments/*`
directly, and never re-implement the CLI's validation or business logic in this skill** —
if the CLI's output says something is wrong, relay that message and ask the user to
correct their answer; don't try to work around it.

All commands below assume the repo root as cwd and a built CLI at
`packages/deploy-cli/dist/cli.js`. If that file is missing, run
`pnpm --filter @sironic/deploy-cli build` first.

## 0. Preconditions

Run `./packages/deploy-cli/dist/cli.js whoami`.

- If it prints an email/tenant, the operator is logged in — continue.
- If it prints "Not logged in...", run `./packages/deploy-cli/dist/cli.js login` in the
  background (it opens a system browser and blocks until the login completes or times
  out after 5 minutes). Tell the user to finish logging in in the browser that opened,
  then poll `whoami` again before continuing.
- If either command errors about a missing environment variable
  (`SIRONIC_AUTH_URL`/`SIRONIC_CRM_URL`/`SIRONIC_CLI_CLIENT_ID`), stop and tell the user to
  set them first — see `packages/deploy-cli/README.md`. This skill cannot fix that for
  them (it's per-operator shell config, not something to silently default).

## 1. Figure out the intent

- "deploy a new site/page for X" / `/deploy` with no further context → go to **2. Create**.
- "redeploy X" / "ship a new image for X" → ask for the deployment id or domain (use
  `./dist/cli.js status -q <text>` to find it if they only gave a name/domain), then run
  `./packages/deploy-cli/dist/cli.js redeploy <id> [--tag <tag>]` and relay its output.
- "status of X" / "what's happening with X" → `./packages/deploy-cli/dist/cli.js status
[<id>]` (no id lists everything) and/or `events <id>`; relay output, don't reformat it
  into something fancier than it is.

## 2. Create — gather the same fields the CRM wizard asks for

Ask these conversationally, in this order, matching
`apps/crm/app/(crm)/deployments/new/page.tsx`'s single-host mode (the CLI's interactive
wizard asks the exact same things — you're doing its job in chat, not inventing new
fields):

1. **Partner** — ask for a name/search term; run `./dist/cli.js contacts --q <term>` and
   let the user pick from the JSON result's `name`/`contact_number`. No match / they say
   "skip" → `contact_id: null`.
2. **Name**, **domain** (required), **www redirect** (default yes).
3. **DNS** — record type (A/CNAME, default A), record name (default `@`), target (ask;
   mention `$DEPLOYMENTS_PUBLIC_IP` if that env var is set in the shell), proxied
   (default no). Omit the whole `dns` key if the user has no target to give.
4. **Image** (optional) — repository, tag (default `latest`), workflow id. Omit the whole
   `image` key if they skip it.
5. **Stack** (optional) — stack name (lowercase, `[a-z0-9-]+`); if given, run
   `./dist/cli.js templates` and let them pick a template (sets `template_id`) or decline
   and supply nothing (`compose_yaml: null`). Omit the whole `stack` key if no stack name.
6. **Proxy** (optional) — forward host; if given, forward port (default 3000), scheme
   (default http), websocket support (default yes). Omit the whole `proxy` key if no
   forward host.
7. **Billing** (optional) — run `./dist/cli.js packages` and let them pick, or skip
   (`package_id: null`). If a package was picked, ask billing cycle
   (monthly/quarterly/yearly). Price override (HUF) and notes, both optional.

Each optional group above is **all-or-nothing**, same as the wizard: if its anchor field
(dns target / image repository / stack name / proxy forward host) is empty, drop the
whole key rather than sending a half-filled object.

## 3. Confirm, write, run

1. Assemble the answers into one JSON object shaped like `CreateDeploymentInput`
   (`packages/deploy-cli/src/schema.ts`) — field names and nesting exactly as above.
2. Show the user a short plain-language summary (not raw JSON) and ask them to confirm.
3. Write the JSON to a file in your scratchpad directory (never the repo), e.g.
   `deploy-input.json`.
4. Run `./packages/deploy-cli/dist/cli.js deploy --file <scratchpad-path>/deploy-input.json --yes`.
   This creates the deployment and runs it to completion/blocked/manual-step in one call —
   don't call `redeploy` or re-run anything yourself afterward.
5. Relay the CLI's output as-is (it already reports what ran, what's blocked, and any
   manual step like `ns_delegation`'s nameserver instructions). If it printed a manual
   step, tell the user what to do and that `status <id>` will show progress once they've
   done it.

## Don'ts

- Don't add `--no-run` unless the user explicitly asked to create without starting the
  pipeline.
- Don't guess at a `contact_id`/`template_id`/`package_id` — always resolve it through the
  matching lookup command's JSON output.
- Don't retry a failed `deploy --file` call with "fixed" JSON without telling the user
  what was wrong and getting their corrected answer first.
