/**
 * Pure helpers of the migration runner (no DB, no env access) — unit-tested in
 * `runner-lib.test.ts`. The safety rules live here so they can be tested:
 *
 *  - the source is the production legacy database `crm`, opened strictly read-only — it stays
 *    untouched as the backup of the original data;
 *  - the target is the ERP's own database `sironic_erp` (what `docker/portainer.stack.yml` runs on);
 *    the legacy databases (`crm`, `crm_dev`) and `sironic_auth` are refused as a target;
 *  - the legacy collections are never written: no model of the new ERP may use one of their names.
 */

export const LEGACY_DB = "crm";
export const TARGET_DB = "sironic_erp";
const MONGO_HOST = "mongodb://192.168.0.12:27017";
export const DEFAULT_LEGACY_URI = `${MONGO_HOST}/${LEGACY_DB}`;
export const DEFAULT_TARGET_URI = `${MONGO_HOST}/${TARGET_DB}`;
/** Never a target: the legacy data (the backup), the IdP and Mongo's own databases. */
const PROTECTED_DBS = ["crm", "crm_dev", "sironic_auth", "admin", "local", "config"];

/** Every collection of the legacy CRM (`crm`, and its `crm_dev` copy): read-only, never written. */
export const LEGACY_COLLECTIONS: readonly string[] = [
  "auditlogs",
  "checklisttemplates",
  "completioncertificates",
  "contacts",
  "contracts",
  "contracttemplates",
  "counters",
  "crmusers",
  "deliverylogs",
  "deliverynotes",
  "deploymentevents",
  "deploymentpackages",
  "deploymentpayments",
  "deployments",
  "documentrecords",
  "domainhostingrecords",
  "floorplans",
  "integrationconnections",
  "inventoryitems",
  "inventorytakings",
  "invoices",
  "leads",
  "maintenanceplans",
  "notificationpreferences",
  "notifications",
  "offers",
  "oidcauthorizationcodes",
  "oidcclients",
  "partnerdeploymentaccesses",
  "platformusers",
  "portalusers",
  "pricelistitems",
  "pricingsettings",
  "projectexpenses",
  "projects",
  "purchaseorders",
  "rmacases",
  "secrets",
  "secretshares",
  "servicecategories",
  "servicepricelistitems",
  "servicesubcategories",
  "settings",
  "stacktemplates",
  "stockitems",
  "stocktransactions",
  "suppliers",
  "tenants",
  "tickets",
  "tools",
  "tooltransactions",
  "warehouselocations",
  "warrantycards",
  "weeklyplans",
  "worklogs",
];

/** Collections the runner owns besides the new ERP's model collections. */
export const RUNNER_COLLECTIONS = ["_migration_idmap"] as const;

export function parseMongoUri(uri: string): { base: string; db: string } {
  const m = /^(mongodb:\/\/[^/]+)\/([^/?]+)(\?.*)?$/.exec(uri.trim());
  if (!m) throw new Error("Mongo URI must look like mongodb://host:port/<db>");
  return { base: m[1]!, db: m[2]! };
}

/**
 * Throws unless `db` is exactly the database of `role`. A target is additionally never one of
 * the protected databases (so a misconfigured constant can not turn the backup into a target).
 */
export function assertDbName(
  db: string | undefined,
  role: "legacy" | "target" = "target",
): void {
  const expected = role === "legacy" ? LEGACY_DB : TARGET_DB;
  if (!db || db !== expected || (role === "target" && PROTECTED_DBS.includes(db))) {
    throw new Error(`Refusing to run: ${role} database "${db}" is not "${expected}"`);
  }
}

/** Validates the URI and returns it (query string dropped). */
export function validateUri(uri: string, role: "legacy" | "target"): string {
  const { base, db } = parseMongoUri(uri);
  assertDbName(db, role);
  return `${base}/${db}`;
}

export function resolveUris(env: Record<string, string | undefined>): {
  legacyUri: string;
  targetUri: string;
} {
  const legacyUri = validateUri(
    env.LEGACY_MONGODB_URI?.trim() || DEFAULT_LEGACY_URI,
    "legacy",
  );
  const targetUri = validateUri(
    env.TARGET_MONGODB_URI?.trim() || DEFAULT_TARGET_URI,
    "target",
  );
  if (legacyUri === targetUri)
    throw new Error("Refusing to run: source and target are the same");
  return { legacyUri, targetUri };
}

/** Throws if any collection the runner would write is a legacy one. */
export function assertWritableCollections(names: Iterable<string>): void {
  const legacy = new Set(LEGACY_COLLECTIONS);
  const bad = [...names].filter((n) => legacy.has(n));
  if (bad.length > 0) {
    throw new Error(`Refusing to write legacy collections: ${bad.join(", ")}`);
  }
}

/** Trailing number of a document number ("OFF-2026-0007" -> 7, no digits -> 0). */
export function trailingNumber(s: string | undefined | null): number {
  const m = /(\d+)\s*$/.exec(s ?? "");
  return m ? Number.parseInt(m[1]!, 10) : 0;
}

export function maxTrailing(values: Array<string | undefined | null>): number {
  return values.reduce<number>((max, v) => Math.max(max, trailingNumber(v)), 0);
}

export type TenantRow = { _id: unknown; n: number };

/** Distinct tenant ids of the collections that hold data; `ok` only when exactly one. */
export function summarizeTenants(perCollection: Record<string, TenantRow[]>): {
  distinct: string[];
  ok: boolean;
  perCollection: Record<string, string[]>;
} {
  const all = new Set<string>();
  const per: Record<string, string[]> = {};
  for (const [col, rows] of Object.entries(perCollection)) {
    const ids = rows.filter((r) => r.n > 0).map((r) => String(r._id));
    per[col] = ids;
    for (const id of ids) all.add(id);
  }
  return { distinct: [...all], ok: all.size <= 1, perCollection: per };
}

/** Legacy `roleKeys` -> new role key (undefined = no mapping). */
export const ROLE_KEY_MAP: Readonly<Record<string, string>> = {
  "crm.admin": "admin",
};

export function mapRoleKeys(keys: string[] | undefined): {
  roleKeys: string[];
  unmapped: string[];
} {
  const roleKeys: string[] = [];
  const unmapped: string[] = [];
  for (const k of keys ?? []) {
    const m = ROLE_KEY_MAP[k];
    if (m) {
      if (!roleKeys.includes(m)) roleKeys.push(m);
    } else unmapped.push(k);
  }
  return { roleKeys, unmapped };
}

/** bcrypt hashes ($2a/$2b/$2y, 60 chars) are accepted by the new credentials login (bcryptjs). */
export function isBcryptHash(h: unknown): h is string {
  return typeof h === "string" && /^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/.test(h);
}

/** `status` / `statusHistory` / `assignee` / `notes` of a migrated status-tracked document. */
export function initialStatus(
  key: string,
  at: Date | undefined,
  fallbackUserId: string,
  assigneeUserId?: string,
) {
  const changedAt = at ?? new Date();
  const entry = {
    key,
    changedAt,
    changedBy: fallbackUserId,
    note: "Migrálva a régi rendszerből",
  };
  return {
    status: entry,
    statusHistory: [entry],
    assignee: assigneeUserId
      ? { userId: assigneeUserId, assignedAt: changedAt, assignedBy: fallbackUserId }
      : null,
    notes: [],
  };
}

export type ReportRow = {
  read: number;
  mapped: number;
  created: number;
  updated: number;
  unchanged: number;
  skipped: number;
  warnings: string[];
};

export class Report {
  readonly rows = new Map<string, ReportRow>();
  row(name: string): ReportRow {
    let r = this.rows.get(name);
    if (!r) {
      r = {
        read: 0,
        mapped: 0,
        created: 0,
        updated: 0,
        unchanged: 0,
        skipped: 0,
        warnings: [],
      };
      this.rows.set(name, r);
    }
    return r;
  }
  warn(name: string, msg: string): void {
    this.row(name).warnings.push(msg);
  }
  format(): string {
    const lines = [
      `${"collection".padEnd(34)} read mapped created updated unchanged skipped warn`,
    ];
    for (const [name, r] of this.rows) {
      lines.push(
        `${name.padEnd(34)} ${String(r.read).padStart(4)} ${String(r.mapped).padStart(6)} ${String(
          r.created,
        ).padStart(
          7,
        )} ${String(r.updated).padStart(7)} ${String(r.unchanged).padStart(9)} ${String(
          r.skipped,
        ).padStart(7)} ${String(r.warnings.length).padStart(4)}`,
      );
    }
    return lines.join("\n");
  }
}

/** Mongoose-style string id of an ObjectId-ish `_id`. */
export const idStr = (v: unknown): string => String(v);
