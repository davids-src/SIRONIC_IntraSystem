/**
 * Legacy -> @erp/partner migration (skeleton, Phase 8 wires it into a runner).
 *
 * Idempotent: every legacy document is upserted by its legacy id (`regiForras` + `regiId`), so
 * re-running only refreshes migrated fields. The mapping itself is pure and unit-tested in
 * `packages/partner/src/migration-map.ts`; the upserts are covered by
 * `packages/partner/src/migration.integration.test.ts`.
 *
 * Safety: this file never reads a `.env`. Both connection strings must be passed explicitly,
 * and nothing is written without `--execute` (default is a dry run that only reports counts).
 *
 *   LEGACY_MONGODB_URI=<copy of legacy DB>  MONGODB_URI=<new ERP DB>  \
 *     <ts-runner> erp/scripts/migrate/partner.ts [--execute]
 *
 * Run it against a COPY of the legacy database first (docs/17 §1.5). Open points for Phase 8:
 *  - verify the legacy `tenantId` is a single distinct value before dropping it (decision #1);
 *  - supply `userIdMap` (legacy CrmUser id -> new User id) from the admin/users migration;
 *  - a TS runner (tsx) is not yet a workspace dependency.
 */
import mongoose from "mongoose";
import {
  mapContact,
  mapLead,
  mapSupplier,
  upsertErdeklodok,
  upsertPartnerek,
  type LegacyContact,
  type LegacyLead,
  type LegacySupplier,
} from "@erp/partner/migration";

const execute = process.argv.includes("--execute");
const legacyUri = process.env.LEGACY_MONGODB_URI;
const targetUri = process.env.MONGODB_URI;
const fallbackUserId = process.env.MIGRATION_FALLBACK_USER_ID;

async function main(): Promise<void> {
  if (!legacyUri)
    throw new Error("LEGACY_MONGODB_URI is required (use a copy of the legacy DB)");
  if (execute && (!targetUri || !fallbackUserId)) {
    throw new Error("--execute needs MONGODB_URI and MIGRATION_FALLBACK_USER_ID");
  }

  const legacy = await mongoose.createConnection(legacyUri).asPromise();
  try {
    const db = legacy.db!;
    const contacts = (await db
      .collection("contacts")
      .find({})
      .toArray()) as unknown as LegacyContact[];
    const suppliers = (await db
      .collection("suppliers")
      .find({})
      .toArray()) as unknown as LegacySupplier[];
    const leads = (await db
      .collection("leads")
      .find({})
      .toArray()) as unknown as LegacyLead[];

    const partnerek = [...contacts.map(mapContact), ...suppliers.map(mapSupplier)];
    console.log(
      `legacy: ${contacts.length} contact, ${suppliers.length} supplier, ${leads.length} lead`,
    );
    if (!execute) {
      console.log("dry run — nothing written (pass --execute)");
      return;
    }

    const partnerResult = await upsertPartnerek(partnerek);
    console.log("partnerek:", partnerResult);

    // TODO(Phase 8): build `userIdMap` / `partnerIdMap` from the id maps stored by earlier
    // migrations; until then leads keep no felelős and no partner link.
    const erdeklodok = leads.map((l) =>
      mapLead(l, {
        userId: () => undefined,
        partnerId: () => undefined,
        fallbackUserId: fallbackUserId!,
      }),
    );
    console.log("erdeklodok:", await upsertErdeklodok(erdeklodok, fallbackUserId!));
  } finally {
    await legacy.close();
    await mongoose.disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
