import { authenticator } from "otplib";
import { randomBytes, createHash } from "node:crypto";

export function generateTotpSecret(): string {
  return authenticator.generateSecret();
}

export function totpKeyUri(secret: string, email: string, issuer = "Sironic"): string {
  return authenticator.keyuri(email, issuer, secret);
}

export function verifyTotpCode(code: string, secret: string): boolean {
  try {
    return authenticator.verify({ token: code, secret });
  } catch {
    return false;
  }
}

const RECOVERY_CODE_COUNT = 10;

/** Plaintext codes to show the user once; store only `hashRecoveryCode()` of each. */
export function generateRecoveryCodes(count = RECOVERY_CODE_COUNT): string[] {
  return Array.from({ length: count }, () =>
    randomBytes(5)
      .toString("hex")
      .match(/.{1,4}/g)!
      .join("-"),
  );
}

export function hashRecoveryCode(code: string): string {
  return createHash("sha256").update(code.trim().toLowerCase()).digest("hex");
}

/** Returns the matched hash (to remove it — single-use) or null if no code matched. */
export function matchRecoveryCode(code: string, hashes: string[]): string | null {
  const hash = hashRecoveryCode(code);
  return hashes.includes(hash) ? hash : null;
}
