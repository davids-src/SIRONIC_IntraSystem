/**
 * Platform OIDC login (central IdP `apps/auth`) — pure parts: env config, the linking decision and
 * the Hungarian messages. No DB / Node imports, so it is unit-testable and edge-safe.
 *
 * Linking rule (see docs/erp-rebuild/PROJECT_PLAN.md #2): the IdP only proves WHO someone is.
 * What they may do always comes from the LOCAL `User` + `Role`. Unknown identities are never
 * auto-created: a local user with the same VERIFIED email must already exist (created by an admin
 * or via an accepted invitation). Deactivated local users are always refused.
 */

export const OIDC_PROVIDER_ID = "sironic";

export interface OidcEnvConfig {
  issuer: string;
  clientId: string;
  /** Optional — a public PKCE client has none. */
  clientSecret?: string;
}

/** Returns the OIDC config only when OIDC_ISSUER and OIDC_CLIENT_ID are set (secret optional). */
export function getOidcConfig(
  env: Record<string, string | undefined> = process.env,
): OidcEnvConfig | null {
  const issuer = env.OIDC_ISSUER?.trim();
  const clientId = env.OIDC_CLIENT_ID?.trim();
  if (!issuer || !clientId) return null;
  const clientSecret = env.OIDC_CLIENT_SECRET?.trim();
  return { issuer, clientId, ...(clientSecret ? { clientSecret } : {}) };
}

export function isOidcConfigured(
  env: Record<string, string | undefined> = process.env,
): boolean {
  return getOidcConfig(env) !== null;
}

export interface OidcIdentity {
  /** Stable IdP subject (PlatformUser id). */
  sub: string;
  email?: string | null;
  emailVerified?: boolean | null;
}

export interface LocalUserSnapshot {
  id: string;
  isActive: boolean;
  platformUserId?: string | null;
}

export type OidcRejectReason =
  | "no_subject"
  | "email_unverified"
  | "unknown_identity"
  | "deactivated"
  | "link_conflict";

export type OidcLinkDecision =
  | { ok: true; userId: string; action: "existing" | "link" }
  | { ok: false; reason: OidcRejectReason };

/**
 * Pure decision. `bySub` = local user already linked to this `sub`; `byEmail` = local user with the
 * identity's (lower-cased) email.
 */
export function decideOidcLink(input: {
  identity: OidcIdentity;
  bySub: LocalUserSnapshot | null;
  byEmail: LocalUserSnapshot | null;
}): OidcLinkDecision {
  const { identity, bySub, byEmail } = input;
  if (!identity.sub) return { ok: false, reason: "no_subject" };

  if (bySub) {
    return bySub.isActive
      ? { ok: true, userId: bySub.id, action: "existing" }
      : { ok: false, reason: "deactivated" };
  }

  // First login for this sub: the only way in is a verified email matching a local account.
  if (!identity.email || identity.emailVerified !== true) {
    return { ok: false, reason: "email_unverified" };
  }
  if (!byEmail) return { ok: false, reason: "unknown_identity" };
  if (byEmail.platformUserId && byEmail.platformUserId !== identity.sub) {
    return { ok: false, reason: "link_conflict" };
  }
  if (!byEmail.isActive) return { ok: false, reason: "deactivated" };
  return { ok: true, userId: byEmail.id, action: "link" };
}

export const OIDC_ERROR_MESSAGES: Record<OidcRejectReason | "failed", string> = {
  no_subject: "A központi bejelentkezés nem adott vissza azonosítót. Próbálja újra.",
  email_unverified:
    "A központi fiók e-mail címe nincs megerősítve, ezért nem lehet belépni. Erősítse meg az e-mail címét a központi fiókban.",
  unknown_identity:
    "Ehhez az e-mail címhez nem tartozik fiók az ERP-ben. Kérjen meghívót a rendszergazdától.",
  deactivated: "A fiók le van tiltva. Forduljon a rendszergazdához.",
  link_conflict:
    "Ez az ERP-fiók már egy másik központi fiókhoz van kötve. Forduljon a rendszergazdához.",
  failed: "A központi bejelentkezés sikertelen. Próbálja újra, vagy használjon jelszót.",
};

/** Maps the `?oidc=` query value of the login page to a Hungarian message (null if absent). */
export function oidcErrorMessage(code: string | null | undefined): string | null {
  if (!code) return null;
  return (
    OIDC_ERROR_MESSAGES[code as keyof typeof OIDC_ERROR_MESSAGES] ??
    OIDC_ERROR_MESSAGES.failed
  );
}
