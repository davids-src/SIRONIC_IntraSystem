export { PlatformUserModel } from "./models/platform-user";
export { connectAuthDb } from "./connection";
export { hashPassword, verifyPassword } from "./password";
export {
  createSessionToken,
  verifySessionToken,
  SESSION_COOKIE_NAME,
  SESSION_TTL_SECONDS,
  type SessionPayload,
} from "./session";
export {
  hashToken,
  generateVerificationToken,
  isTokenValid,
  MAGIC_LINK_TTL_MS,
  PASSWORD_RESET_TTL_MS,
  type VerificationToken,
} from "./magic-link";
export {
  generateTotpSecret,
  totpKeyUri,
  verifyTotpCode,
  generateRecoveryCodes,
  hashRecoveryCode,
  matchRecoveryCode,
} from "./totp";
export { encryptTotpSecret, decryptTotpSecret } from "./totp-secret-crypto";
export {
  isLockedOut,
  recordFailedAttempt,
  resetLockout,
  MAX_FAILED_ATTEMPTS,
  LOCKOUT_DURATION_MS,
} from "./lockout";
export { recordFailedAttemptAtomic } from "./lockout-store";
export { claimSetupLock } from "./setup-lock";
export { verifyPkce } from "./pkce";
export { isSafeReturnTo } from "./safe-return-to";
export {
  signIdToken,
  verifyIssuedToken,
  getJwks,
  generateOidcSigningKeyJwk,
  type VerifiedIdToken,
} from "./oidc-keys";
export {
  createAuthorizationCode,
  consumeAuthorizationCode,
  type ConsumedAuthorizationCode,
} from "./oidc-code-store";
export {
  findActiveOidcClient,
  createOidcClient,
  type OidcClientLean,
} from "./oidc-client-store";
export { OidcClientModel } from "./models/oidc-client";
export { OidcAuthorizationCodeModel } from "./models/oidc-authorization-code";
