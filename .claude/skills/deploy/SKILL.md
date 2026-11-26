---
name: deploy
description: >-
  Manage the self-hosted infrastructure (Portainer stacks, sites/domains, SSL) or check a
  service's status by driving the sironic-infra CLI/MCP tools. Use when the user runs /deploy,
  or asks to redeploy/re-pull a stack, add a domain to a service, renew SSL, or check what runs where.
---

# /deploy

A thin conversational front end for `packages/infra-cli` (`sironic-infra`). The CLI does every
real step; never call Portainer/NPM/Cloudflare directly and never re-implement its validation.
If the `sironic-infra` MCP server is configured, prefer its tools (same names as below, e.g. `stack_pull`).

Run from the repo root: `pnpm --filter @erp/infra-cli cli <command>`.

## Flow

1. `overview` — what runs, problems, expiring certificates. If empty/stale: `sync`.
2. Find the target: `stack list`, `stack get <stack>`, `site list`, `site get <host>`.
3. Act, one step at a time, confirming with the user before anything destructive:
   - re-pull images: `stack pull <stack>`; change image: `stack set-image`; env: `stack env-set/env-unset`
   - new domain on a service: `site create` (DNS → DNS-01 SSL → NPM proxy; idempotent)
   - SSL: `site check <host>`, `site ssl-renew <host>`
   - `stack delete` / `site delete` require typing the name (`--confirm-name`); ask the user first.
4. Verify: `site check <host>`, `stack logs <stack>`, `events`.

Secrets are masked in output; don't try to unmask them. Relay CLI error messages as-is.

## Other websites, logins and templates

- WordPress / FTP-hosted sites (not on Portainer): `web list|get|create|set|check`; assign a partner with `web set --partner`.
- Stored logins: `web get <site>` lists them without passwords. Only run `access password … --reveal` when the user
  explicitly needs the password (it is audited); never paste it into files or commit messages.
- New stack from a template: `template list`, then `stack create <name> --template <tpl>`.
- Per-container actions: `stack pull|start|stop <stack> --container <name>`, `stack restart`.
