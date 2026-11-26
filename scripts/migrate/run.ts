/**
 * Legacy `crm` (production CRM) -> new ERP `sironic_erp` data migration runner (entrypoint).
 *
 *   pnpm migrate              # dry run (reads only, validates every mapped document)
 *   pnpm migrate --execute    # writes into sironic_erp
 *
 * SAFETY (see `runner-lib.ts`): `crm` is opened read-only and is never written — it stays as the
 * backup of the original data; the runner writes only the ERP's own database `sironic_erp`
 * (+ `_migration_idmap` and `erp_counters` there). `crm` / `crm_dev` / `sironic_auth` are refused as
 * a target. Overrides go through LEGACY_MONGODB_URI (must end in `/crm`) and TARGET_MONGODB_URI
 * (must end in `/sironic_erp`). Re-runs are idempotent: a re-run right before the cut-over only
 * adds what was created in the CRM since the previous run.
 *
 * This file only prepares the environment (the DB layer reads MONGODB_URI/MONGODB_DB_NAME at import
 * time) and then loads the real runner.
 */
import { resolveUris, TARGET_DB } from "./runner-lib";

async function boot(): Promise<void> {
  const { legacyUri, targetUri } = resolveUris(process.env);
  // Never inherit the app's own settings: the runner pins the target explicitly.
  process.env.MONGODB_URI = targetUri;
  process.env.MONGODB_DB_NAME = TARGET_DB;
  const { main } = await import("./runner");
  await main({
    legacyUri,
    targetUri,
    execute: process.argv.includes("--execute"),
  });
}

boot().then(
  () => process.exit(process.exitCode ?? 0),
  (err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  },
);
