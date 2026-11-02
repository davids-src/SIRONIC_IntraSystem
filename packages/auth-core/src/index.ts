export { PlatformUserModel } from "./models/platform-user";
export { hashPassword, verifyPassword } from "./password";
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
export {
  isLockedOut,
  recordFailedAttempt,
  resetLockout,
  MAX_FAILED_ATTEMPTS,
  LOCKOUT_DURATION_MS,
} from "./lockout";
