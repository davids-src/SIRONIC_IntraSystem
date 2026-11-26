/**
 * Legacy `IntegrationConnection` -> `deployments_integraciok` mapping (`@erp/infra`).
 *
 * The old deployments/packages/payments/templates are NOT migrated: the infra module syncs stacks
 * and sites live from Portainer, NPM and Cloudflare (`sironic-infra sync`), and billing was dropped.
 * Only the provider connections are carried over. Credentials stay ciphertext (same AES-256-GCM
 * envelope and SECRETS_ENCRYPTION_KEY). Idempotent key: (szolgaltato, cimke).
 */

type Datumszeru = Date | string | null | undefined;

const datum = (d: Datumszeru): Date | undefined => {
  if (d === null || d === undefined || d === "") return undefined;
  const v = d instanceof Date ? d : new Date(d);
  return Number.isNaN(v.getTime()) ? undefined : v;
};
const szoveg = (s: string | null | undefined): string | undefined => {
  const v = s?.trim();
  return v ? v : undefined;
};

export type IdMap = ReadonlyMap<string, string>;

export type LegacyIntegrationConnection = {
  provider: string;
  label: string;
  base_url: string;
  encrypted_credentials: string;
  meta?: Record<string, unknown>;
  is_active?: boolean;
  last_healthcheck_at?: Datumszeru;
  last_healthcheck_ok?: boolean | null;
  last_healthcheck_message?: string | null;
  created_by: string;
};

export function mapIntegracio(l: LegacyIntegrationConnection, ctx: { userIds: IdMap }) {
  return {
    szolgaltato: l.provider,
    cimke: l.label.trim(),
    alapUrl: l.base_url.trim(),
    // Ciphertext, same envelope and key: never decrypted or re-encrypted here.
    hitelesitoTitkositott: l.encrypted_credentials,
    meta: l.meta ?? {},
    aktiv: l.is_active ?? true,
    utolsoEllenorzes: datum(l.last_healthcheck_at),
    utolsoEllenorzesOk: l.last_healthcheck_ok ?? undefined,
    utolsoEllenorzesUzenet: szoveg(l.last_healthcheck_message),
    letrehozoId: ctx.userIds.get(l.created_by) ?? l.created_by,
  };
}
