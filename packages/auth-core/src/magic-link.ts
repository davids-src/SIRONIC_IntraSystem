import { randomBytes, createHash } from "node:crypto";

/** Same sha256(token) convention already used by apps/crm/auth.ts for magic-link lookup. */
export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export type VerificationToken = {
  token: string;
  token_hash: string;
  expires_at: Date;
};

/** Used for both magic-link and password-reset tokens — same shape, different TTL/purpose. */
export function generateVerificationToken(ttlMs: number): VerificationToken {
  const token = randomBytes(32).toString("hex");
  return {
    token,
    token_hash: hashToken(token),
    expires_at: new Date(Date.now() + ttlMs),
  };
}

export const MAGIC_LINK_TTL_MS = 15 * 60 * 1000;
export const PASSWORD_RESET_TTL_MS = 60 * 60 * 1000;

export function isTokenValid(params: {
  providedToken: string;
  storedHash: string | null | undefined;
  expiresAt: Date | null | undefined;
}): boolean {
  if (!params.storedHash || !params.expiresAt) return false;
  if (params.expiresAt.getTime() < Date.now()) return false;
  return hashToken(params.providedToken) === params.storedHash;
}
