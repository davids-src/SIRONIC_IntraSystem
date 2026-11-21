/**
 * Legacy `crm_dev` -> new ERP data migration runner (entrypoint).
 *
 *   pnpm migrate              # dry run (reads only, validates every mapped document)
 *   pnpm migrate --execute    # writes
 *
 * SAFETY (see `runner-lib.ts`): source and target are both `crm_dev`; the legacy collections are
 * strictly read-only and the runner only writes the new ERP's own collections (+ `_migration_idmap`
 * and `erp_counters`). `crm` (production) and `sironic_auth` are refused. Overrides are accepted
 * only through LEGACY_MONGODB_URI / TARGET_MONGODB_URI and must end in `/crm_dev`.
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
