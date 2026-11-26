import { isEncryptedPayload } from "@erp/lib/utils";

/**
 * Pure legacy -> ERP mapping for one Secret row (docs/erp-rebuild, Phase 8). No DB, no env, no
 * decryption: the ciphertext is carried over **as is**.
 *
 * KEY REQUIREMENT: the legacy format (`packages/lib/src/secret-crypto.ts`) is the same
 * `iv:authTag:ciphertext` hex format `@erp/lib` produces, so the ERP deployment MUST be configured
 * with a `SECRETS_ENCRYPTION_KEY` byte-identical to the legacy one. With a different key every
 * migrated value would fail the GCM tag check on reveal. If the key must change, decrypt with the
 * old key and re-encrypt in a separate rotation step — this function never does that.
 */

export type LegacySecretRow = {
  _id: unknown;
  tenantId?: string;
  project_id?: string | null;
  contact_id?: string | null;
  key?: string;
  encrypted_value?: string;
  visibility?: "shared" | "private";
  created_by?: string;
  created_at?: Date | string;
  updated_at?: Date | string;
};

export type MigratedSecret = {
  legacyId: string;
  name: string;
  description?: string;
  valueEncrypted: string;
  partnerId?: string;
  ownerId: string;
  /** Legacy "shared" had no explicit audience: an admin must decide who gets a SecretShare. */
  needsShareReview: boolean;
  createdAt?: Date;
  updatedAt?: Date;
};

export type SecretMapResult =
  { ok: true; secret: MigratedSecret } | { ok: false; legacyId: string; reason: string };

export type SecretMapContext = {
  /** legacy `created_by` -> new user id (from the users migration's id map). */
  userIdMap: ReadonlyMap<string, string>;
  /** legacy contact id -> new partner id; unmapped contacts keep the legacy id string. */
  partnerIdMap?: ReadonlyMap<string, string>;
};

const toDate = (v: Date | string | undefined) => {
  if (!v) return undefined;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? undefined : d;
};

export function mapLegacySecret(
  row: LegacySecretRow,
  ctx: SecretMapContext,
): SecretMapResult {
  const legacyId = String(row._id);
  const name = row.key?.trim();
  if (!name) return { ok: false, legacyId, reason: "missing key" };
  const cipher = row.encrypted_value ?? "";
  if (!isEncryptedPayload(cipher)) {
    return {
      ok: false,
      legacyId,
      reason: "encrypted_value is not iv:authTag:ciphertext hex",
    };
  }
  const ownerId = row.created_by ? ctx.userIdMap.get(row.created_by) : undefined;
  if (!ownerId) return { ok: false, legacyId, reason: "created_by has no mapped user" };

  const partnerId = row.contact_id
    ? (ctx.partnerIdMap?.get(row.contact_id) ?? row.contact_id)
    : undefined;
  return {
    ok: true,
    secret: {
      legacyId,
      name,
      description: row.project_id
        ? `Régi projekt azonosító: ${row.project_id}`
        : undefined,
      valueEncrypted: cipher,
      partnerId,
      ownerId,
      needsShareReview: row.visibility !== "private",
      createdAt: toDate(row.created_at),
      updatedAt: toDate(row.updated_at),
    },
  };
}
