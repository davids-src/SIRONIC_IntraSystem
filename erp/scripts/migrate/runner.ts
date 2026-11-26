/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Migration runner implementation (see `run.ts` for the safety contract): legacy `crm` (read-only)
 * -> the ERP's own `sironic_erp`. Module order follows the
 * dependencies: users -> partner -> arlista -> keszlet -> projekt -> ertekesites -> szerviz ->
 * bizonylat -> eszkoz -> secrets -> deployments.
 *
 * Writes go through the new ERP's Mongoose models (validation, defaults, timestamps) and are
 * idempotent: every migrated document is recorded in `_migration_idmap` (kind + legacy id -> new id)
 * and is looked up by a natural key, so a re-run never duplicates. Transactional documents are
 * insert-only (a re-run never overwrites what users edited after the first run).
 */
import mongoose, { type Model } from "mongoose";
import {
  LEGACY_COLLECTIONS,
  LEGACY_DB,
  RUNNER_COLLECTIONS,
  Report,
  TARGET_DB,
  assertDbName,
  assertWritableCollections,
  idStr,
  initialStatus,
  isBcryptHash,
  mapRoleKeys,
  maxTrailing,
  summarizeTenants,
} from "./runner-lib";

export type RunOptions = { legacyUri: string; targetUri: string; execute: boolean };

type Row = Record<string, any>;
const NOT_BUSINESS = new Set(["tenants", "counters", "settings"]);

// ------------------------------------------------------------------ read-only legacy access

/**
 * The only way the runner reads: find/aggregate/count — there is no write method on purpose.
 * Used for the legacy source (`crm`) and for lookups in the target (id map, natural keys).
 */
class ReadOnlyDb {
  constructor(
    private readonly db: mongoose.mongo.Db,
    role: "legacy" | "target",
  ) {
    assertDbName(db.databaseName, role);
  }
  async collectionNames(): Promise<string[]> {
    return (await this.db.listCollections({}, { nameOnly: true }).toArray()).map(
      (c) => c.name,
    );
  }
  async find(col: string, filter: Row = {}): Promise<Row[]> {
    const docs = await this.db.collection(col).find(filter).toArray();
    return docs.map((d) => ({ ...d, _id: idStr(d._id) }));
  }
  async findOne(col: string, filter: Row): Promise<Row | null> {
    return this.db.collection(col).findOne(filter) as Promise<Row | null>;
  }
  async count(col: string, filter: Row = {}): Promise<number> {
    return this.db.collection(col).countDocuments(filter);
  }
  async tenantCounts(col: string): Promise<Array<{ _id: unknown; n: number }>> {
    return (await this.db
      .collection(col)
      .aggregate([{ $group: { _id: "$tenantId", n: { $sum: 1 } } }])
      .toArray()) as any;
  }
}

// ------------------------------------------------------------------ id map

class IdMap {
  private readonly maps = new Map<string, Map<string, string>>();
  constructor(private coll: mongoose.mongo.Collection | null) {}

  async load(ro: ReadOnlyDb, existing: string[]): Promise<void> {
    if (!existing.includes("_migration_idmap")) return;
    for (const d of await ro.find("_migration_idmap")) {
      this.kind(d.kind).set(d.legacyId, d.newId);
    }
  }
  kind(kind: string): Map<string, string> {
    let m = this.maps.get(kind);
    if (!m) this.maps.set(kind, (m = new Map()));
    return m;
  }
  get(kind: string, legacyId: string | null | undefined): string | undefined {
    return legacyId ? this.kind(kind).get(legacyId) : undefined;
  }
  async set(kind: string, legacyId: string, newId: string): Promise<void> {
    this.kind(kind).set(legacyId, newId);
    if (this.coll) {
      await this.coll.updateOne(
        { kind, legacyId },
        { $set: { newId, migratedAt: new Date() } },
        { upsert: true },
      );
    }
  }
  /** Union of several kinds as one legacy -> new map (e.g. contacts + suppliers = partners). */
  union(...kinds: string[]): Map<string, string> {
    const out = new Map<string, string>();
    for (const k of kinds) for (const [a, b] of this.kind(k)) out.set(a, b);
    return out;
  }
}

// ------------------------------------------------------------------ context + writer

type Ctx = {
  execute: boolean;
  /** The legacy source (`crm`), read-only. */
  ro: ReadOnlyDb;
  /** Reads of the target's own collections (what an earlier run already migrated). */
  tgt: ReadOnlyDb;
  report: Report;
  ids: IdMap;
  tenantId: string;
  fallbackUserId: string;
  userNames: Map<string, string>;
  /** legacy crmuser id -> display name */
  legacyUserNames: Map<string, string>;
  partnerNames: Map<string, string>;
  /** new árlista id -> denormalised name/code/unit (stock rows keep a snapshot) */
  arlista: Map<string, { nev: string; kod: string; egyseg: string }>;
  counters: Map<string, number>;
  note: (msg: string) => void;
};

const newId = () => new mongoose.Types.ObjectId().toString();

function seed(ctx: Ctx, key: string, max: number): void {
  if (max > 0) ctx.counters.set(key, Math.max(ctx.counters.get(key) ?? 0, max));
}

async function legacyRows(ctx: Ctx, col: string, report = col): Promise<Row[]> {
  const rows = await ctx.ro.find(col, { tenantId: ctx.tenantId });
  ctx.report.row(report).read += rows.length;
  return rows;
}

/** A populated legacy collection without an adapter is reported, never silently dropped. */
async function guardNoAdapter(ctx: Ctx, col: string, why: string): Promise<void> {
  const n = await ctx.ro.count(col, { tenantId: ctx.tenantId });
  const r = ctx.report.row(col);
  r.read += n;
  if (n > 0) {
    r.skipped += n;
    ctx.report.warn(col, `${n} rows NOT migrated: ${why}`);
  }
}

const PRESERVE_ON_UPDATE = ["azonosito", "status", "statusHistory", "assignee", "notes"];

/**
 * Validate, then insert or (mode "upsert") refresh one document. Returns the new id, or undefined
 * when the document was skipped. In a dry run nothing is written but the same checks run.
 */
async function writeDoc(
  ctx: Ctx,
  o: {
    target: string;
    kind: string;
    legacyId: string;
    model: Model<any>;
    natural?: Row;
    doc: Row;
    mode?: "insert" | "upsert";
  },
): Promise<string | undefined> {
  const r = ctx.report.row(o.target);
  const probe = new o.model({ ...o.doc });
  const invalid = await probe.validate().then(
    () => undefined,
    (e: Error) => e,
  );
  if (invalid) {
    r.skipped++;
    r.warnings.push(`${o.legacyId}: ${invalid.message.slice(0, 220)}`);
    return undefined;
  }
  r.mapped++;
  let existing = ctx.ids.get(o.kind, o.legacyId);
  if (!existing && o.natural) {
    const found = await ctx.tgt.findOne(o.model.collection.name, o.natural);
    if (found) existing = idStr(found._id);
  }
  if (existing) {
    if (o.mode === "upsert") {
      if (ctx.execute) {
        const set = { ...o.doc };
        for (const k of PRESERVE_ON_UPDATE) delete set[k];
        await o.model.updateOne({ _id: existing }, { $set: set });
      }
      r.updated++;
    } else r.unchanged++;
    await ctx.ids.set(o.kind, o.legacyId, existing);
    return existing;
  }
  const id = newId();
  if (ctx.execute) {
    try {
      await new o.model({ ...o.doc, _id: id }).save();
    } catch (err) {
      r.skipped++;
      r.warnings.push(
        `${o.legacyId}: ${(err instanceof Error ? err.message : String(err)).slice(0, 220)}`,
      );
      return undefined;
    }
  }
  r.created++;
  await ctx.ids.set(o.kind, o.legacyId, id);
  return id;
}

const created = (row: Row) => (row.created_at ? new Date(row.created_at) : undefined);

// ------------------------------------------------------------------ step: users

async function stepUsers(ctx: Ctx): Promise<void> {
  const { User, Role } = await import("@erp/db-core");
  const rows = await legacyRows(ctx, "crmusers", "users");
  rows.sort((a, b) => +(created(a) ?? 0) - +(created(b) ?? 0));
  const roleCache = new Map<string, string>();
  const roleId = async (key: string): Promise<string | undefined> => {
    if (roleCache.has(key)) return roleCache.get(key);
    let id: string | undefined;
    const doc = await ctx.tgt.findOne("roles", { key });
    if (doc) id = idStr(doc._id);
    else if (!ctx.execute) id = newId(); // dry run: RBAC sync would create it
    if (id) roleCache.set(key, id);
    return id;
  };
  const withPassword: string[] = [];
  const withoutPassword: string[] = [];
  for (const u of rows) {
    const email = String(u.email ?? "")
      .trim()
      .toLowerCase();
    if (!email) {
      ctx.report.row("users").skipped++;
      ctx.report.warn("users", `${u._id}: no email`);
      continue;
    }
    const { roleKeys, unmapped } = mapRoleKeys(u.roleKeys);
    for (const k of unmapped)
      ctx.report.warn("users", `${email}: unmapped legacy role "${k}"`);
    const roleIds: string[] = [];
    for (const k of roleKeys) {
      const id = await roleId(k);
      if (id) roleIds.push(id);
    }
    const hash = isBcryptHash(u.password_hash) ? u.password_hash : undefined;
    (hash ? withPassword : withoutPassword).push(email);
    const id = await writeDoc(ctx, {
      target: "users",
      kind: "user",
      legacyId: u._id,
      model: User as unknown as Model<any>,
      natural: { email },
      doc: {
        email,
        name: String(u.display_name ?? email).trim() || email,
        passwordHash: hash,
        roleIds,
        directPermissionKeys: [],
        isActive: u.is_active !== false,
        createdAt: created(u),
      },
    });
    ctx.legacyUserNames.set(u._id, String(u.display_name ?? email));
    if (id) ctx.userNames.set(id, String(u.display_name ?? email));
  }
  ctx.note(
    `users: ${withPassword.length} keep their existing bcrypt password hash (login works with the old password): ${withPassword.join(", ") || "-"}`,
  );
  if (withoutPassword.length)
    ctx.note(
      `users without a usable password hash: ${withoutPassword.join(", ")} -> admin sets one via Admin > Felhasználók (invitation / password reset)`,
    );
}

// ------------------------------------------------------------------ main

export async function main(opts: RunOptions): Promise<void> {
  const { execute } = opts;
  assertDbName(TARGET_DB, "target");
  const notes: string[] = [];
  const report = new Report();
  console.log(
    `[migrate] mode: ${execute ? "EXECUTE (writes)" : "dry run (read only)"} | source=${LEGACY_DB} target=${TARGET_DB}`,
  );

  // Raw read-only client on the legacy copy. No mongoose connection / index build in a dry run.
  const client = new mongoose.mongo.MongoClient(opts.legacyUri, {
    serverSelectionTimeoutMS: 10000,
  });
  await client.connect();
  // Separate read client on the target: what earlier runs migrated (id map, natural keys).
  const targetClient = new mongoose.mongo.MongoClient(opts.targetUri, {
    serverSelectionTimeoutMS: 10000,
  });
  await targetClient.connect();
  try {
    const ro = new ReadOnlyDb(client.db(LEGACY_DB), "legacy");
    const tgt = new ReadOnlyDb(targetClient.db(TARGET_DB), "target");
    const existing = await ro.collectionNames();
    const existingTarget = await tgt.collectionNames();
    console.log(
      `[target] ${TARGET_DB}: ${existingTarget.length} collections before this run`,
    );

    // ---- tenant check (STOP when business data spans several tenants)
    const perCollection: Record<string, Array<{ _id: unknown; n: number }>> = {};
    for (const c of existing.filter(
      (n) => LEGACY_COLLECTIONS.includes(n) && !NOT_BUSINESS.has(n),
    )) {
      const t = await ro.tenantCounts(c);
      if (t.some((x) => x._id != null)) perCollection[c] = t;
    }
    const tenants = summarizeTenants(perCollection);
    console.log(`[tenants] business collections by distinct tenantId:`);
    for (const [c, ids] of Object.entries(tenants.perCollection))
      if (ids.length) console.log(`  ${c.padEnd(26)} ${ids.join(", ")}`);
    for (const c of ["counters", "settings"]) {
      const t = (await ro.tenantCounts(c)).map((x) => `${x._id}:${x.n}`);
      console.log(`  ${c.padEnd(26)} ${t.join(", ")}  (informational, not migrated)`);
    }
    if (!tenants.ok) {
      console.error(
        `[tenants] STOP: business data spans ${tenants.distinct.length} tenants: ${tenants.distinct.join(", ")}. Nothing was written.`,
      );
      process.exitCode = 2;
      return;
    }
    const tenantId = tenants.distinct[0]!;
    console.log(`[tenants] single data tenant ${tenantId}`);

    // ---- target connection (execute only) + collection guard BEFORE any write / index build
    const rbac = await import("../../apps/erp/src/lib/rbac-bootstrap");
    await import("@erp/db-core");
    const modelCollections = Object.values(mongoose.models).map((m) => m.collection.name);
    assertWritableCollections([...modelCollections, ...RUNNER_COLLECTIONS]);
    console.log(
      `[guard] ${modelCollections.length} model collections checked against ${LEGACY_COLLECTIONS.length} legacy names: none clash`,
    );

    let idColl: mongoose.mongo.Collection | null = null;
    if (execute) {
      // The app builds its own indexes on first use; the runner must not fire ~50 concurrent
      // index builds (they exhaust the connect budget against the remote host).
      mongoose.set("autoIndex", false);
      mongoose.set("autoCreate", false);
      const { connectDB } = await import("@erp/db-core");
      await connectDB();
      console.log("[target] connected");
      const db = mongoose.connection.db!;
      assertDbName(db.databaseName, "target");
      assertWritableCollections(["_migration_idmap"]);
      idColl = db.collection("_migration_idmap");
      await idColl.createIndex({ kind: 1, legacyId: 1 }, { unique: true });
      console.log("[target] idmap index ok");
      await rbac.resyncRbac();
      notes.push("RBAC baseline synced (permissions + roles incl. admin)");
    } else {
      notes.push("dry run: RBAC baseline sync would run before the users step");
    }

    const ids = new IdMap(idColl);
    await ids.load(tgt, existingTarget);
    const ctx: Ctx = {
      execute,
      ro,
      tgt,
      report,
      ids,
      tenantId,
      fallbackUserId: newId(),
      userNames: new Map(),
      legacyUserNames: new Map(),
      partnerNames: new Map(),
      arlista: new Map(),
      counters: new Map(),
      note: (m) => notes.push(m),
    };

    await stepUsers(ctx);
    const adminLegacy = (await ro.find("crmusers", { tenantId })).find((u) =>
      (u.roleKeys ?? []).includes("crm.admin"),
    );
    const adminId = ids.get("user", adminLegacy?._id);
    if (adminId) ctx.fallbackUserId = adminId;

    await runModules(ctx);

    // ---- counters
    for (const [key, max] of ctx.counters) {
      if (execute) {
        const { Counter } = await import("@erp/db-core");
        await Counter.updateOne({ key }, { $max: { seq: max } }, { upsert: true });
      }
    }
    notes.push(
      `counters ${execute ? "seeded" : "would be seeded"} in erp_counters: ${[...ctx.counters].map(([k, v]) => `${k}>=${v}`).join(", ") || "-"}`,
    );

    console.log("\n" + report.format());
    for (const [name, r] of report.rows)
      for (const w of r.warnings.slice(0, 8)) console.log(`  [warn] ${name}: ${w}`);
    for (const n of notes) console.log(`[note] ${n}`);
    console.log(execute ? "[migrate] done" : "[migrate] dry run done — nothing written");
  } finally {
    await client.close();
    await targetClient.close();
    if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
  }
}

// ------------------------------------------------------------------ data modules

const M = (m: unknown) => m as Model<any>;
const strip = <T extends Row>(o: T, ...keys: string[]): Row => {
  const c: Row = { ...o };
  for (const k of keys) delete c[k];
  return c;
};
/** The mapped documents often miss the legacy creation time: take it from the source row. */
const withCreated = (doc: Row, src: Row | undefined): Row =>
  doc.createdAt || !src?.created_at
    ? doc
    : { ...doc, createdAt: new Date(src.created_at) };

/** Legacy-side key of the placeholder partner (not a real `contacts` id). */
const ISMERETLEN_PARTNER_ID = "migracio-ismeretlen-partner";
const ISMERETLEN_PARTNER_NEV = "Ismeretlen partner (migráció)";

/** The archived placeholder partner for legacy documents without a partner (idempotent). */
async function ismeretlenPartner(ctx: Ctx): Promise<string> {
  const known = ctx.ids.get("partner:contact", ISMERETLEN_PARTNER_ID);
  if (known) return known;
  let id = newId();
  if (ctx.execute) {
    const { upsertPartnerek } = await import("../../packages/partner/src/migration");
    const { Partner } = await import("../../packages/partner/src/models/Partner");
    await upsertPartnerek([
      {
        regiForras: "contact",
        regiId: ISMERETLEN_PARTNER_ID,
        tipus: "ceg",
        nev: ISMERETLEN_PARTNER_NEV,
        megjegyzes:
          "A régi CRM-ben partner nélkül rögzített bizonylatok gyűjtője (adatmigráció, 2026-11).",
        kapcsolattartok: [],
        cimkek: [],
        archivalt: true,
        archivalasOka: "Adatmigráció: partner nélküli régi bizonylatok",
        archivalasIdopont: new Date(),
      } as never,
    ]);
    const d = await Partner.findOne({
      regiForras: "contact",
      regiId: ISMERETLEN_PARTNER_ID,
    })
      .select("_id")
      .lean();
    id = String(d!._id);
  }
  await ctx.ids.set("partner:contact", ISMERETLEN_PARTNER_ID, id);
  ctx.partnerNames.set(id, ISMERETLEN_PARTNER_NEV);
  return id;
}

async function stepPartner(ctx: Ctx): Promise<void> {
  const { mapContact, mapSupplier, mapLead, upsertPartnerek, upsertErdeklodok } =
    await import("../../packages/partner/src/migration");
  const { Partner } = await import("../../packages/partner/src/models/Partner");
  const { partnerNevKulcs } = await import("../../packages/partner/src/text");
  const contacts = await legacyRows(ctx, "contacts", "partnerek (contacts)");
  const suppliers = await legacyRows(ctx, "suppliers", "partnerek (suppliers)");
  const mapped = [
    ...contacts.map((c) => mapContact(c as never)),
    ...suppliers.map((s) => mapSupplier(s as never)),
  ];
  const r = (src: string) => ctx.report.row(src);
  const known = new Map<string, string>();
  for (const d of await ctx.tgt.find("partnerek", {}))
    known.set(`${d.regiForras}:${d.regiId}`, d._id);
  let created = 0;
  let updated = 0;
  for (const p of mapped) {
    const src =
      p.regiForras === "contact" ? "partnerek (contacts)" : "partnerek (suppliers)";
    const invalid = await new Partner({
      ...strip(p, "archivalt"),
      archivalt: p.archivalt,
      nevKulcs: partnerNevKulcs(p.nev),
      azonosito: "P-000000",
    })
      .validate()
      .then(
        () => undefined,
        (e: Error) => e,
      );
    if (invalid) {
      r(src).skipped++;
      r(src).warnings.push(`${p.regiId}: ${invalid.message.slice(0, 200)}`);
      continue;
    }
    r(src).mapped++;
    if (known.has(`${p.regiForras}:${p.regiId}`)) updated++;
    else created++;
  }
  if (ctx.execute) {
    const res = await upsertPartnerek(mapped);
    created = res.created;
    updated = res.updated;
  }
  // distribute counts back onto the two source rows (by presence of known ids)
  r("partnerek (contacts)").created += mapped.filter(
    (p) => p.regiForras === "contact" && !known.has(`contact:${p.regiId}`),
  ).length;
  r("partnerek (contacts)").updated += mapped.filter(
    (p) => p.regiForras === "contact" && known.has(`contact:${p.regiId}`),
  ).length;
  r("partnerek (suppliers)").created += mapped.filter(
    (p) => p.regiForras === "supplier" && !known.has(`supplier:${p.regiId}`),
  ).length;
  r("partnerek (suppliers)").updated += mapped.filter(
    (p) => p.regiForras === "supplier" && known.has(`supplier:${p.regiId}`),
  ).length;
  void created;
  void updated;

  // id map (contact/supplier legacy id -> Partner _id) + name cache
  const byKey = new Map<string, { id: string; nev: string }>();
  if (ctx.execute) {
    for (const d of await Partner.find({ regiForras: { $in: ["contact", "supplier"] } })
      .select("_id regiForras regiId nev")
      .lean())
      byKey.set(`${d.regiForras}:${d.regiId}`, { id: String(d._id), nev: d.nev });
  }
  for (const p of mapped) {
    const hit = byKey.get(`${p.regiForras}:${p.regiId}`);
    const id = hit?.id ?? known.get(`${p.regiForras}:${p.regiId}`) ?? newId();
    await ctx.ids.set(`partner:${p.regiForras}`, p.regiId, id);
    ctx.partnerNames.set(id, hit?.nev ?? p.nev);
  }

  // leads (empty in the current copy, still handled through the existing upsert layer)
  const leads = await legacyRows(ctx, "leads", "erdeklodok (leads)");
  if (leads.length) {
    const rows = leads.map((l) =>
      mapLead(l as never, {
        userId: (id: string) => ctx.ids.get("user", id),
        partnerId: (id: string) => ctx.ids.union("partner:contact").get(id),
        fallbackUserId: ctx.fallbackUserId,
      }),
    );
    ctx.report.row("erdeklodok (leads)").mapped += rows.length;
    if (ctx.execute) {
      const res = await upsertErdeklodok(rows, ctx.fallbackUserId);
      ctx.report.row("erdeklodok (leads)").created += res.created;
      ctx.report.row("erdeklodok (leads)").updated += res.updated;
    }
  }
}

async function stepArlista(ctx: Ctx): Promise<void> {
  const { planArlistaMigration } = await import("./arlista");
  const { ArlistaTetel } = await import("../../packages/arlista/src/models/ArlistaTetel");
  const { ArazasiBeallitas } =
    await import("../../packages/arlista/src/models/ArazasiBeallitas");
  const { SzolgaltatasKategoria, SzolgaltatasAlkategoria } =
    await import("../../packages/arlista/src/models/SzolgaltatasKategoria");
  const { SzolgaltatasTetel } =
    await import("../../packages/arlista/src/models/SzolgaltatasTetel");
  const priceListItems = await legacyRows(ctx, "pricelistitems", "arlista_tetelek");
  const serviceCategories = await legacyRows(
    ctx,
    "servicecategories",
    "arlista_szolgaltatas_kategoriak",
  );
  const serviceSubCategories = await legacyRows(
    ctx,
    "servicesubcategories",
    "arlista_szolgaltatas_alkategoriak",
  );
  const servicePriceListItems = await legacyRows(
    ctx,
    "servicepricelistitems",
    "arlista_szolgaltatas_tetelek",
  );
  const settings = await legacyRows(
    ctx,
    "pricingsettings",
    "arlista_arazasi_beallitasok",
  );
  const plan = planArlistaMigration({
    priceListItems: priceListItems as never,
    serviceCategories: serviceCategories as never,
    serviceSubCategories: serviceSubCategories as never,
    servicePriceListItems: servicePriceListItems as never,
    pricingSettings: (settings[0] as never) ?? null,
  });
  for (const w of plan.figyelmeztetesek) ctx.report.warn("arlista_tetelek", w);
  const models: Record<string, Model<any>> = {
    arlista_tetelek: M(ArlistaTetel),
    arlista_szolgaltatas_kategoriak: M(SzolgaltatasKategoria),
    arlista_szolgaltatas_alkategoriak: M(SzolgaltatasAlkategoria),
    arlista_szolgaltatas_tetelek: M(SzolgaltatasTetel),
    arlista_arazasi_beallitasok: M(ArazasiBeallitas),
  };
  const catId = new Map<string, string>();
  const subId = new Map<string, string>();
  const kodToLegacy = new Map<string, string>();
  for (const l of priceListItems) kodToLegacy.set(`t:${l.item_number}`, l._id);
  for (const l of servicePriceListItems) kodToLegacy.set(`s:${l.sku}`, l._id);
  for (const op of plan.muveletek) {
    const ertek = op.ertek as Row;
    const legacyId =
      op.kollekcio === "arlista_tetelek"
        ? kodToLegacy.get(`t:${ertek.kod}`)!
        : op.kollekcio === "arlista_szolgaltatas_tetelek"
          ? kodToLegacy.get(`s:${ertek.kod}`)!
          : JSON.stringify(op.kulcs);
    let doc: Row = ertek;
    if (op.kollekcio === "arlista_szolgaltatas_alkategoriak") {
      doc = { ...ertek, kategoriaId: catId.get(ertek.kategoriaKodElotag) };
    } else if (op.kollekcio === "arlista_szolgaltatas_tetelek") {
      doc = {
        ...strip(ertek, "alkategoria"),
        kategoriaId: catId.get(ertek.kategoriaKodElotag),
        alkategoriaId: ertek.alkategoria
          ? subId.get(`${ertek.alkategoria.kategoriaKodElotag}|${ertek.alkategoria.nev}`)
          : undefined,
      };
    }
    const id = await writeDoc(ctx, {
      target: op.kollekcio,
      kind: op.kollekcio,
      legacyId,
      model: models[op.kollekcio]!,
      natural: op.kulcs,
      doc,
      mode: "upsert",
    });
    if (id && op.kollekcio === "arlista_szolgaltatas_kategoriak")
      catId.set(ertek.kodElotag, id);
    if (id && op.kollekcio === "arlista_szolgaltatas_alkategoriak")
      subId.set(`${ertek.kategoriaKodElotag}|${ertek.nev}`, id);
    if (
      id &&
      (op.kollekcio === "arlista_tetelek" ||
        op.kollekcio === "arlista_szolgaltatas_tetelek")
    ) {
      ctx.arlista.set(id, { nev: ertek.nev, kod: ertek.kod, egyseg: ertek.egyseg });
    }
  }
  // legacy price-list item id (product OR service) -> new árlista id
  ctx.ids.kind("arlista");
  for (const [k, v] of ctx.ids.kind("arlista_tetelek")) ctx.ids.kind("arlista").set(k, v);
  for (const [k, v] of ctx.ids.kind("arlista_szolgaltatas_tetelek"))
    ctx.ids.kind("arlista").set(k, v);
  // rebuild the denormalised cache for rows that were already migrated earlier
  for (const [, id] of ctx.ids.kind("arlista")) {
    if (ctx.arlista.has(id)) continue;
    const d =
      (await ctx.tgt.findOne("arlista_tetelek", {
        _id: new mongoose.Types.ObjectId(id),
      })) ??
      (await ctx.tgt.findOne("arlista_szolgaltatas_tetelek", {
        _id: new mongoose.Types.ObjectId(id),
      }));
    if (d) ctx.arlista.set(id, { nev: d.nev, kod: d.kod, egyseg: d.egyseg });
  }
}

async function stepKeszlet(ctx: Ctx): Promise<void> {
  const { migraljKeszlet } = await import("./keszlet");
  const { Raktarhely } = await import("../../packages/keszlet/src/models/Raktarhely");
  const { KeszletTetel } = await import("../../packages/keszlet/src/models/KeszletTetel");
  const { KeszletMozgas } =
    await import("../../packages/keszlet/src/models/KeszletMozgas");
  const helyek = await legacyRows(ctx, "warehouselocations", "keszlet_raktarhelyek");
  const tetelek = await legacyRows(ctx, "stockitems", "keszlet_tetelek");
  const tranzakciok = await legacyRows(
    ctx,
    "stocktransactions",
    "keszlet_elozmenyek (not stored)",
  );
  const leltarak = await legacyRows(ctx, "inventorytakings", "keszlet_leltarak");
  const rma = await legacyRows(ctx, "rmacases", "keszlet_rma_ugyek");
  const res = migraljKeszlet({
    helyek: helyek as never,
    tetelek: tetelek as never,
    tranzakciok: tranzakciok as never,
    leltarak: leltarak as never,
    rmaUgyek: rma as never,
    arlistaIdMap: ctx.ids.kind("arlista"),
  });
  for (const w of res.figyelmeztetesek) ctx.report.warn("keszlet_tetelek", w);
  for (const h of res.raktarhelyek)
    await writeDoc(ctx, {
      target: "keszlet_raktarhelyek",
      kind: "raktarhely",
      legacyId: h.legacyId,
      model: M(Raktarhely),
      natural: { kod: h.kod },
      doc: strip(h, "legacyId"),
      mode: "upsert",
    });
  for (const t of res.tetelek) {
    const snap = ctx.arlista.get(t.arlistaTermekId);
    if (!snap) {
      ctx.report.row("keszlet_tetelek").skipped++;
      ctx.report.warn(
        "keszlet_tetelek",
        `${t.legacyId}: árlista tétel adatai hiányoznak`,
      );
      continue;
    }
    const mozgas = t.nyitoMozgas;
    const kulcs = `${mozgas.tipus}:${mozgas.referenceType}:${mozgas.referenceId}:0`;
    const tetelId = await writeDoc(ctx, {
      target: "keszlet_tetelek",
      kind: "keszlet_tetel",
      legacyId: t.legacyId,
      model: M(KeszletTetel),
      natural: { arlistaTermekId: t.arlistaTermekId, raktarhelyKod: t.raktarhelyKod },
      doc: {
        arlistaTermekId: t.arlistaTermekId,
        raktarhelyKod: t.raktarhelyKod,
        ...snap,
        keszlet: t.keszlet,
        foglalt: t.foglalt,
        minimum: t.minimum,
        megjegyzes: t.megjegyzes,
        utolsoMozgasAt: t.createdAt,
        mozgasKulcsok: [kulcs],
        createdAt: t.createdAt,
      },
    });
    if (!tetelId) continue;
    await writeDoc(ctx, {
      target: "keszlet_mozgasok (opening)",
      kind: "keszlet_mozgas",
      legacyId: t.legacyId,
      model: M(KeszletMozgas),
      natural: { kulcs },
      doc: {
        kulcs,
        tipus: mozgas.tipus,
        tetelId,
        arlistaTermekId: t.arlistaTermekId,
        raktarhelyKod: t.raktarhelyKod,
        nev: snap.nev,
        kod: snap.kod,
        valtozas: mozgas.valtozas,
        foglaltValtozas: mozgas.foglaltValtozas,
        referenceType: mozgas.referenceType,
        referenceId: mozgas.referenceId,
        lineIndex: 0,
        actorId: ctx.fallbackUserId,
        jegyzet: "Nyitó készlet a régi rendszerből",
        createdAt: t.createdAt,
      },
    });
  }
  const tr = ctx.report.row("keszlet_elozmenyek (not stored)");
  tr.mapped += res.elozmenyek.length;
  tr.skipped += tranzakciok.length;
  if (tranzakciok.length)
    ctx.report.warn(
      "keszlet_elozmenyek (not stored)",
      `${tranzakciok.length} legacy stock transactions are history only: the new movement log starts from the opening balance (design decision in scripts/migrate/keszlet.ts)`,
    );
  for (const [col, n] of [
    ["keszlet_leltarak", res.leltarak.length],
    ["keszlet_rma_ugyek", res.rmaUgyek.length],
  ] as const)
    if (n) {
      ctx.report.row(col).skipped += n;
      ctx.report.warn(col, `${n} rows NOT migrated: no persistence adapter yet`);
    }
}

/** Legacy `Project.assigned_to` holds the display name, not an id: accept both. */
function userIdsWithNames(ctx: Ctx): Map<string, string> {
  const m = new Map(ctx.ids.kind("user"));
  for (const [id, name] of ctx.legacyUserNames) {
    const nid = ctx.ids.get("user", id);
    if (nid) m.set(name, nid);
  }
  return m;
}

async function stepProjekt(ctx: Ctx): Promise<void> {
  const { migraljProjekt } = await import("./projekt");
  const { Projekt } = await import("../../packages/projekt/src/models/Projekt");
  const { HetiTerv } = await import("../../packages/projekt/src/models/HetiTerv");
  const projects = await legacyRows(ctx, "projects", "projekt_projektek");
  const expenses = await legacyRows(ctx, "projectexpenses", "projekt_koltsegek");
  const weekly = await legacyRows(ctx, "weeklyplans", "projekt_hetiervek");
  const templates = await legacyRows(ctx, "checklisttemplates", "projekt_sablonok");
  const floorplans = await legacyRows(ctx, "floorplans", "projekt_alaprajzok");
  const res = migraljProjekt(
    {
      projects: projects as never,
      expenses: expenses as never,
      weeklyPlans: weekly as never,
      templates: templates as never,
      floorplans: floorplans as never,
    },
    { userIds: userIdsWithNames(ctx), partnerIds: ctx.ids.union("partner:contact") },
  );
  for (const w of res.figyelmeztetesek) ctx.report.warn("projekt_projektek", w);
  seed(ctx, "projekt:projekt", maxTrailing(projects.map((p) => p.project_number)));
  const byLegacy = new Map(projects.map((p) => [p._id, p]));
  for (const p of res.projektek) {
    const src = byLegacy.get(p.legacyId);
    const fazisok = p.fazisok.map((f) => ({
      ...f,
      befejezve: f.allapot === "kesz" ? (f.hatarido ?? undefined) : undefined,
    }));
    const szazalek = fazisok.length
      ? Math.round(fazisok.reduce((a, f) => a + f.szazalek, 0) / fazisok.length)
      : 0;
    await writeDoc(ctx, {
      target: "projekt_projektek",
      kind: "projekt",
      legacyId: p.legacyId,
      model: M(Projekt),
      natural: { azonosito: p.azonosito },
      doc: withCreated(
        {
          ...strip(
            p,
            "legacyId",
            "allapot",
            "felelosUserId",
            "ajanlatLegacyId",
            "stagingLinkek",
            "checklist",
          ),
          partnerNev: p.partnerId ? ctx.partnerNames.get(p.partnerId) : undefined,
          felelosNev: p.felelosUserId ? ctx.userNames.get(p.felelosUserId) : undefined,
          fazisok,
          szazalek,
          stagingLinkek: p.stagingLinkek.map((s) => ({
            ...strip(s, "hozzaadtaUserId"),
            hozzaadtaId: s.hozzaadtaUserId ?? ctx.fallbackUserId,
            hozzaadva: s.hozzaadva ?? new Date(),
          })),
          checklist: p.checklist.map((c) => ({
            ...strip(c, "legacyMellekletUrlok"),
            mellekletKotelezo: false,
          })),
          ...initialStatus(
            p.allapot,
            created(src ?? {}),
            ctx.fallbackUserId,
            p.felelosUserId,
          ),
        },
        src,
      ),
    });
  }
  for (const h of res.hetiTervek) {
    await writeDoc(ctx, {
      target: "projekt_hetiervek",
      kind: "hetiterv",
      legacyId: h.legacyId,
      model: M(HetiTerv),
      doc: {
        ...strip(
          h,
          "legacyId",
          "felelosUserId",
          "letrehozoUserId",
          "allapot",
          "hibajegyLegacyId",
          "projektLegacyId",
          "munkalapLegacyId",
        ),
        felelosNev: ctx.userNames.get(h.felelosUserId) ?? "Ismeretlen",
        letrehozoId: h.letrehozoUserId,
        projektId: ctx.ids.get("projekt", h.projektLegacyId),
        ...initialStatus(h.allapot, undefined, ctx.fallbackUserId, h.felelosUserId),
      },
    });
  }
  for (const [col, n] of [
    ["projekt_koltsegek", res.koltsegek.length],
    ["projekt_sablonok", res.sablonok.length],
    ["projekt_alaprajzok", res.alaprajzok.length],
  ] as const)
    if (n) {
      ctx.report.row(col).skipped += n;
      ctx.report.warn(col, `${n} rows NOT migrated: no persistence adapter yet`);
    }
}

async function stepErtekesites(ctx: Ctx): Promise<void> {
  const { tervezErtekesitesMigraciot } = await import("./ertekesites");
  const { Ajanlat } = await import("../../packages/ertekesites/src/models/Ajanlat");
  const { Megrendelolap } =
    await import("../../packages/ertekesites/src/models/Megrendelolap");
  const offers = await legacyRows(ctx, "offers", "ertekesites_ajanlatok");
  const orders = await legacyRows(ctx, "purchaseorders", "ertekesites_megrendelolapok");
  await guardNoAdapter(
    ctx,
    "contracts",
    "contracts need an adapter (contract templates / media upload)",
  );
  await guardNoAdapter(ctx, "contracttemplates", "no persistence adapter yet");
  const plan = tervezErtekesitesMigraciot({
    ajanlatok: offers as never,
    szerzodesSablonok: [],
    szerzodesek: [],
    megrendelok: orders as never,
    idMapok: {
      partnerek: ctx.ids.union("partner:contact", "partner:supplier"),
      felhasznalok: ctx.ids.kind("user"),
      arlistaTetelek: ctx.ids.kind("arlista"),
    },
  });
  for (const f of plan.figyelmeztetesek)
    ctx.report.warn("ertekesites_ajanlatok", `${f.legacyId}: ${f.uzenet}`);
  seed(ctx, "ertekesites:ajanlat", plan.szamlaloMax["ertekesites:ajanlat"]);
  seed(ctx, "ertekesites:megrendelo", plan.szamlaloMax["ertekesites:megrendelo"]);
  const skippedOffers = offers.length - plan.ajanlatok.length;
  ctx.report.row("ertekesites_ajanlatok").skipped += skippedOffers;
  const skippedOrders = orders.length - plan.megrendelok.length;
  ctx.report.row("ertekesites_megrendelolapok").skipped += skippedOrders;
  const bySrc = (rows: Row[]) => new Map(rows.map((r) => [r._id, r]));
  const offerSrc = bySrc(offers);
  for (const a of plan.ajanlatok) {
    const src = offerSrc.get(a.regiId);
    await writeDoc(ctx, {
      target: "ertekesites_ajanlatok",
      kind: "ajanlat",
      legacyId: a.regiId,
      model: M(Ajanlat),
      natural: { regiId: a.regiId },
      doc: withCreated(
        {
          ...strip(a, "letrehozoUserId", "allapot"),
          regiAzonosito: a.azonosito,
          partnerNev: ctx.partnerNames.get(a.partnerId) ?? "Ismeretlen partner",
          ...initialStatus(
            a.allapot,
            a.createdAt,
            a.letrehozoUserId ?? ctx.fallbackUserId,
          ),
        },
        src,
      ),
    });
  }
  const orderSrc = bySrc(orders);
  for (const m of plan.megrendelok) {
    const src = orderSrc.get(m.regiId);
    const at = m.createdAt ?? created(src ?? {}) ?? new Date();
    await writeDoc(ctx, {
      target: "ertekesites_megrendelolapok",
      kind: "megrendelo",
      legacyId: m.regiId,
      model: M(Megrendelolap),
      natural: { regiId: m.regiId },
      doc: withCreated(
        {
          ...strip(m, "letrehozoUserId", "allapot"),
          beszallitoNev: ctx.partnerNames.get(m.beszallitoId) ?? "Ismeretlen beszállító",
          projektId: ctx.ids.get("projekt", m.projektId) ?? undefined,
          ajanlatId: ctx.ids.get("ajanlat", m.ajanlatId) ?? undefined,
          // The legacy system already received the stock: never trigger the receipt again.
          bevetelezes:
            m.allapot === "teljesitve"
              ? {
                  ok: true,
                  idopont: at,
                  uzenet: "Migrált (régi rendszerben bevételezve)",
                }
              : undefined,
          ...initialStatus(m.allapot, at, m.letrehozoUserId ?? ctx.fallbackUserId),
        },
        src,
      ),
    });
  }
}

async function stepSzerviz(ctx: Ctx): Promise<void> {
  const { tervezSzervizMigraciot } = await import("./szerviz");
  const { Munkalap } = await import("../../packages/szerviz/src/models/Munkalap");
  const worklogs = await legacyRows(ctx, "worklogs", "szerviz_munkalapok");
  await guardNoAdapter(ctx, "tickets", "no hibajegy persistence adapter yet");
  await guardNoAdapter(ctx, "maintenanceplans", "no persistence adapter yet");
  const partners = new Map<string, { id: string; nev: string }>();
  for (const [l, id] of ctx.ids.union("partner:contact", "partner:supplier"))
    partners.set(l, { id, nev: ctx.partnerNames.get(id) ?? "Ismeretlen partner" });
  const users = new Map<string, { id: string; nev: string }>();
  for (const [l, id] of ctx.ids.kind("user"))
    users.set(l, { id, nev: ctx.userNames.get(id) ?? "Ismeretlen" });
  const plan = tervezSzervizMigraciot(
    { hibajegyek: [], munkalapok: worklogs as never, karbantartasiTervek: [] },
    {
      partnerek: partners,
      felhasznalok: users,
      arlistaTetelek: ctx.ids.kind("arlista"),
      projektek: ctx.ids.kind("projekt"),
    },
  );
  for (const w of plan.figyelmeztetesek) ctx.report.warn("szerviz_munkalapok", w);
  seed(ctx, "szerviz:munkalap", plan.szamlaloMax.munkalap);
  const src = new Map(worklogs.map((w) => [w._id, w]));
  for (const m of plan.munkalapok) {
    await writeDoc(ctx, {
      target: "szerviz_munkalapok",
      kind: "munkalap",
      legacyId: m.regiId,
      model: M(Munkalap),
      natural: { regiId: m.regiId },
      doc: withCreated(
        {
          ...strip(m, "allapot"),
          ...initialStatus(
            m.allapot,
            m.lezarva ?? m.munkaDatum,
            m.letrehozoId.length === 24 ? m.letrehozoId : ctx.fallbackUserId,
          ),
        },
        src.get(m.regiId),
      ),
    });
  }
}

async function stepBizonylat(ctx: Ctx): Promise<void> {
  const { migraljBizonylat } = await import("./bizonylat");
  const { Szallitolevel } =
    await import("../../packages/bizonylat/src/models/Szallitolevel");
  const { Teljesitesigazolas } =
    await import("../../packages/bizonylat/src/models/Teljesitesigazolas");
  const { JotallasiJegy } =
    await import("../../packages/bizonylat/src/models/JotallasiJegy");
  const { ALAP_JOTALLASI_SZOVEG } =
    await import("../../packages/bizonylat/src/constants");
  const notes = await legacyRows(ctx, "deliverynotes", "bizonylat_szallitolevelek");
  const certs = await legacyRows(
    ctx,
    "completioncertificates",
    "bizonylat_teljesitesigazolasok",
  );
  const warranties = await legacyRows(ctx, "warrantycards", "bizonylat_jotallasi_jegyek");
  await guardNoAdapter(ctx, "invoices", "no számla persistence adapter yet");
  // Certificates the CRM saved without a (known) partner go to an archived placeholder partner,
  // so they exist in the ERP too (decision 2026-11-26); every other document keeps the strict rule.
  const partnerek = ctx.ids.union("partner:contact");
  const arva = (c: Row) => !c.contact_id || !partnerek.has(idStr(c.contact_id));
  let igazolasok = certs;
  if (certs.some(arva)) {
    partnerek.set(ISMERETLEN_PARTNER_ID, await ismeretlenPartner(ctx));
    igazolasok = certs.map((c) =>
      arva(c) ? { ...c, contact_id: ISMERETLEN_PARTNER_ID } : c,
    );
    ctx.note(
      `${certs.filter(arva).length} teljesítésigazolás without a partner -> archived placeholder partner "${ISMERETLEN_PARTNER_NEV}"`,
    );
  }
  const res = migraljBizonylat({
    szallitolevelek: notes as never,
    igazolasok: igazolasok as never,
    szamlak: [],
    jotallasok: warranties as never,
    partnerek,
    termekek: ctx.ids.kind("arlista"),
    jogiSzoveg: ALAP_JOTALLASI_SZOVEG,
  });
  for (const w of res.figyelmeztetesek) ctx.report.warn("bizonylat_szallitolevelek", w);
  for (const [k, v] of Object.entries(res.maxSzamok)) seed(ctx, k, v);
  const pn = (id: string) => ctx.partnerNames.get(id) ?? "Ismeretlen partner";
  const srcOf = (rows: Row[]) => new Map(rows.map((r) => [r._id, r]));
  const noteSrc = srcOf(notes);
  ctx.report.row("bizonylat_szallitolevelek").skipped +=
    notes.length - res.szallitolevelek.length;
  for (const x of res.szallitolevelek) {
    const src = noteSrc.get(x.regiId);
    await writeDoc(ctx, {
      target: "bizonylat_szallitolevelek",
      kind: "szallitolevel",
      legacyId: x.regiId,
      model: M(Szallitolevel),
      natural: { regiId: x.regiId },
      doc: withCreated(
        {
          ...strip(x, "regiSzam", "allapot"),
          azonosito: x.regiSzam,
          partnerNev: pn(x.partnerId),
          projektId: ctx.ids.get("projekt", x.projektId) ?? undefined,
          keszletKiadas: x.keszletKiadas
            ? { ...x.keszletKiadas, idopont: created(src ?? {}) ?? new Date() }
            : undefined,
          ...initialStatus(x.allapot, created(src ?? {}), ctx.fallbackUserId),
        },
        src,
      ),
    });
  }
  const certSrc = srcOf(certs);
  ctx.report.row("bizonylat_teljesitesigazolasok").skipped +=
    certs.length - res.igazolasok.length;
  for (const x of res.igazolasok) {
    const src = certSrc.get(x.regiId);
    await writeDoc(ctx, {
      target: "bizonylat_teljesitesigazolasok",
      kind: "igazolas",
      legacyId: x.regiId,
      model: M(Teljesitesigazolas),
      natural: { regiId: x.regiId },
      doc: withCreated(
        {
          ...strip(x, "regiSzam", "allapot"),
          azonosito: x.regiSzam,
          partnerNev: pn(x.partnerId),
          projektId: ctx.ids.get("projekt", x.projektId) ?? undefined,
          ajanlatId: ctx.ids.get("ajanlat", x.ajanlatId) ?? undefined,
          munkalapIds: x.munkalapIds
            .map((id) => ctx.ids.get("munkalap", id))
            .filter((id): id is string => Boolean(id)),
          ...initialStatus(x.allapot, created(src ?? {}), ctx.fallbackUserId),
        },
        src,
      ),
    });
  }
  const warSrc = srcOf(warranties);
  ctx.report.row("bizonylat_jotallasi_jegyek").skipped +=
    warranties.length - res.jotallasok.length;
  for (const x of res.jotallasok) {
    const src = warSrc.get(x.regiId);
    await writeDoc(ctx, {
      target: "bizonylat_jotallasi_jegyek",
      kind: "jotallas",
      legacyId: x.regiId,
      model: M(JotallasiJegy),
      natural: { regiId: x.regiId },
      doc: withCreated(
        {
          ...strip(x, "regiSzam", "allapot"),
          azonosito: x.regiSzam,
          partnerNev: pn(x.partnerId),
          ...initialStatus(x.allapot, created(src ?? {}), ctx.fallbackUserId),
        },
        src,
      ),
    });
  }
}

async function stepEszkoz(ctx: Ctx): Promise<void> {
  await guardNoAdapter(ctx, "tools", "no eszköz persistence adapter yet");
  await guardNoAdapter(ctx, "tooltransactions", "no persistence adapter yet");
}

/**
 * Secrets: the legacy `secrets` collection is empty in the current copy (guarded otherwise). The
 * ciphertext format is shared with the new app (same SECRETS_ENCRYPTION_KEY), so one real record
 * (a secret, else an integration credential) is decrypted to prove the key matches. Output is
 * only OK/FAIL — never the plaintext.
 */
async function stepSecrets(ctx: Ctx): Promise<void> {
  await guardNoAdapter(
    ctx,
    "secrets",
    "no Secret persistence adapter yet (ciphertext would be copied unchanged)",
  );
  await guardNoAdapter(ctx, "secretshares", "no persistence adapter yet");
  const candidates: Array<[string, Row | null, string]> = [
    [
      "secrets.encrypted_value",
      await ctx.ro.findOne("secrets", { tenantId: ctx.tenantId }),
      "encrypted_value",
    ],
    [
      "integrationconnections.encrypted_credentials",
      await ctx.ro.findOne("integrationconnections", { tenantId: ctx.tenantId }),
      "encrypted_credentials",
    ],
  ];
  const [label, doc, field] = candidates.find(([, d]) => d) ?? ["none", null, ""];
  if (!doc) {
    ctx.note("secrets decrypt check: no encrypted record in the source (skipped)");
    return;
  }
  try {
    const { decryptSecret, encryptSecret } = await import("@erp/lib/utils");
    const plain = decryptSecret(String(doc[field]));
    const again = decryptSecret(encryptSecret(plain));
    ctx.note(
      `secrets decrypt round-trip on ${label}: ${again === plain ? "OK" : "FAIL"}`,
    );
  } catch (err) {
    const missing = /SECRETS_ENCRYPTION_KEY|encryption key/i.test(
      String((err as Error).message),
    );
    ctx.note(
      `secrets decrypt round-trip on ${label}: ${missing ? "SKIPPED (SECRETS_ENCRYPTION_KEY not in this process env)" : "FAIL"}`,
    );
  }
}

async function stepDeployments(ctx: Ctx): Promise<void> {
  // Infra module: only the provider connections are migrated. Stacks and sites are synced live
  // (`sironic-infra sync`); packages, payments and templates were dropped with the billing scope.
  const d = await import("./deployments");
  const egyeb = await import("../../packages/infra/src/models");
  const integrations = await legacyRows(
    ctx,
    "integrationconnections",
    "deployments_integraciok",
  );
  for (const g of [
    "deployments",
    "deploymentevents",
    "deploymentpackages",
    "deploymentpayments",
    "stacktemplates",
    "partnerdeploymentaccesses",
    "domainhostingrecords",
  ])
    await guardNoAdapter(ctx, g, "replaced by the live infra sync (not migrated)");
  const userIds = ctx.ids.kind("user");
  for (const l of integrations) {
    const m = d.mapIntegracio(l as never, { userIds });
    await writeDoc(ctx, {
      target: "deployments_integraciok",
      kind: "integracio",
      legacyId: l._id,
      model: M(egyeb.IntegracioKapcsolat),
      natural: { szolgaltato: m.szolgaltato, cimke: m.cimke },
      doc: withCreated(m, l),
    });
  }
}

async function runModules(ctx: Ctx): Promise<void> {
  await stepPartner(ctx);
  await stepArlista(ctx);
  await stepKeszlet(ctx);
  await stepProjekt(ctx);
  await stepErtekesites(ctx);
  await stepSzerviz(ctx);
  await stepBizonylat(ctx);
  await stepEszkoz(ctx);
  await stepSecrets(ctx);
  await stepDeployments(ctx);
  const portal = await ctx.ro.count("portalusers", { tenantId: ctx.tenantId });
  if (portal) {
    ctx.report.row("portalusers").read += portal;
    ctx.report.row("portalusers").skipped += portal;
    ctx.report.warn(
      "portalusers",
      `${portal} portal users NOT migrated: partners are re-invited through @erp/portal-auth (staff UI pending)`,
    );
  }
}
