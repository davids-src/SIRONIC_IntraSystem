/**
 * Migration skeleton: legacy `Secret` -> `@erp/secrets` (Phase 8, idempotent per module).
 *
 * The mapping is the pure `mapLegacySecret` (unit-tested in packages/secrets). It re-uses the
 * ciphertext unchanged, so the ERP's SECRETS_ENCRYPTION_KEY MUST equal the legacy key — see the
 * header of packages/secrets/src/migrate.ts.
 *
 * The runner (reading a COPY of the legacy DB, writing `secrets_titkok` keyed by `legacyId` for
 * idempotency, storing the old->new id map) is written when Phase 8 starts. It must never be
 * pointed at the production DB without an explicit dry-run first.
 */
export {
  mapLegacySecret,
  type LegacySecretRow,
  type MigratedSecret,
  type SecretMapContext,
  type SecretMapResult,
} from "../../packages/secrets/src/migrate";
