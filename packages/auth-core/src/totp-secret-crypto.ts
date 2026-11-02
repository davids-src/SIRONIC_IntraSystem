import crypto from "node:crypto";

const ALGORITHM = "aes-256-gcm";

/**
 * Same AES-256-GCM scheme as @crm/lib's secret-crypto.ts, independent key — the TOTP secret
 * at rest is platform-identity data, encrypted with its own key rather than reusing the
 * CRM's SECRETS_ENCRYPTION_KEY (separate trust boundary, same as the database itself).
 */
function getKey(): Buffer {
  const keyHex = process.env.AUTH_SECRETS_ENCRYPTION_KEY ?? "";
  if (keyHex.length === 64) return Buffer.from(keyHex, "hex");
  if (keyHex.length === 32) return Buffer.from(keyHex, "utf8");
  throw new Error(
    "AUTH_SECRETS_ENCRYPTION_KEY must be 32 utf8 bytes or 64 hex characters.",
  );
}

export function encryptTotpSecret(plaintext: string): string {
  const key = getKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("hex")}:${tag.toString("hex")}:${encrypted.toString("hex")}`;
}

export function decryptTotpSecret(stored: string): string {
  const [ivHex, tagHex, ctHex] = stored.split(":");
  if (!ivHex || !tagHex || !ctHex) {
    throw new Error("Invalid encrypted TOTP secret format.");
  }
  const key = getKey();
  const decipher = crypto.createDecipheriv(ALGORITHM, key, Buffer.from(ivHex, "hex"));
  decipher.setAuthTag(Buffer.from(tagHex, "hex"));
  return Buffer.concat([
    decipher.update(Buffer.from(ctHex, "hex")),
    decipher.final(),
  ]).toString("utf8");
}
