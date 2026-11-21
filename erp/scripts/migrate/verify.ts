/**
 * Post-migration check against `crm_dev` (read-only): collection counts plus calls to the real
 * facades. `pnpm tsx --env-file=apps/erp/.env scripts/migrate/verify.ts` (the env file is only
 * needed for nothing here; the target is pinned like in run.ts).
 */
import { TARGET_DB, assertDbName, resolveUris } from "./runner-lib";

async function main(): Promise<void> {
  const { targetUri } = resolveUris(process.env);
  process.env.MONGODB_URI = targetUri;
  process.env.MONGODB_DB_NAME = TARGET_DB;
  const mongoose = (await import("mongoose")).default;
  mongoose.set("autoIndex", false);
  mongoose.set("autoCreate", false);
  const { connectDB } = await import("@erp/db-core");
  await connectDB();
  assertDbName(mongoose.connection.db!.databaseName);
  const q = { page: 1, pageSize: 5, filters: {} } as never;
  const counts: Record<string, number> = {};
  for (const c of [
    "users",
    "roles",
    "permissions",
    "partnerek",
    "arlista_tetelek",
    "arlista_szolgaltatas_tetelek",
    "keszlet_tetelek",
    "keszlet_mozgasok",
    "projekt_projektek",
    "ertekesites_ajanlatok",
    "ertekesites_megrendelolapok",
    "szerviz_munkalapok",
    "bizonylat_szallitolevelek",
    "bizonylat_jotallasi_jegyek",
    "deployments_telepitesek",
    "deployments_esemenyek",
    "_migration_idmap",
  ])
    counts[c] = await mongoose.connection.db!.collection(c).countDocuments();
  console.table(counts);

  const { partnerApi } = await import("../../packages/partner/src/api");
  const { arlistaApi } = await import("../../packages/arlista/src/api");
  const { ARLISTA_PERMISSIONS } = await import("../../packages/arlista/src/constants");
  const { keszletApi } = await import("../../packages/keszlet/src/api");
  const { bizonylatApi } = await import("../../packages/bizonylat/src/api");
  const partners = await partnerApi.listPartnerek(q);
  console.log(
    "partnerApi.listPartnerek total:",
    partners.total,
    "first:",
    partners.data[0]?.nev,
  );
  const viewer = {
    userId: "verify",
    permissions: Object.values(ARLISTA_PERMISSIONS),
  } as never;
  const termekek = await arlistaApi.listTermekek(viewer, q);
  console.log(
    "arlistaApi.listTermekek total:",
    termekek.total,
    "first:",
    termekek.data[0]?.nev,
  );
  console.log("arlistaApi.listKategoriak:", (await arlistaApi.listKategoriak()).length);
  console.log(
    "keszletApi.listRaktarhelyek:",
    (await keszletApi.listRaktarhelyek()).length,
  );
  console.log(
    "bizonylatApi.listJotallasok total:",
    (await bizonylatApi.listJotallasok(q)).total,
  );
  await mongoose.disconnect();
}

main().then(
  () => process.exit(0),
  (e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  },
);
