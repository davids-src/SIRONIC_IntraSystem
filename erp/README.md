# SIRONIC ERP (`erp/`)

New ERP built on the tCrm-template engine. Self-contained pnpm workspace (scope `@erp/`),
deliberately **outside** the legacy root workspace (`apps/*`, `packages/*`) until cutover.
Plan: [`../docs/erp-rebuild/PROJECT_PLAN.md`](../docs/erp-rebuild/PROJECT_PLAN.md). Rules: [`CLAUDE.md`](./CLAUDE.md).

```bash
cd erp
pnpm install
pnpm preflight      # lint → typecheck → test → guard → build
```

- Husky hooks live in `.husky/` but are **not** auto-installed (`prepare` removed): `husky` would
  repoint the whole repo's `core.hooksPath`. Wire them at cutover or via a repo-level decision (#15).
- `.npmrc` hoists `@types/*`/`react` into `erp/node_modules`; otherwise TypeScript resolves a second
  `@types/react` from the legacy root `node_modules`.
- Never point `apps/erp/.env` at the legacy or production database.
- `SECRETS_ENCRYPTION_KEY` (Titoktár, AES-256-GCM): required, 64 hex chars or exactly 32 bytes, no
  fallback — without it creating/revealing secrets fails closed. Generate with
  `openssl rand -hex 32`, keep it in the password manager (losing it = all secrets lost), never
  commit it. A migrated legacy dataset needs the same key as the old CRM.
