# SIRONIC ERP

The SIRONIC ERP: a single pnpm workspace (scope `@erp/`) — `apps/erp` (staff app), `apps/portal`
(partner portal) and the domain packages. The old CRM monorepo is no longer in the tree; it lives in
git history under the tag `legacy-crm-monorepo`. Rules: [`CLAUDE.md`](./CLAUDE.md).

```bash
pnpm install
pnpm preflight      # lint → typecheck → test → guard → build
```

- Husky hooks live in `.husky/` but are **not** auto-installed (`prepare` removed); run `pnpm exec husky` once if you want them.
- `.npmrc` hoists `@types/*`/`react` into `node_modules`.
- Never point `apps/erp/.env` at the legacy or production database.
- `SECRETS_ENCRYPTION_KEY` (Titoktár, AES-256-GCM): required, 64 hex chars or exactly 32 bytes, no
  fallback — without it creating/revealing secrets fails closed. Generate with
  `openssl rand -hex 32`, keep it in the password manager (losing it = all secrets lost), never
  commit it. A migrated legacy dataset needs the same key as the old CRM.
