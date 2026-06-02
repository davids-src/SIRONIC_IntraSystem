import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const KEY_HEX = process.env.SECRETS_ENCRYPTION_KEY ?? "";

function getKey(): Buffer {
  if (KEY_HEX.length === 0) {
    throw new Error("SECRETS_ENCRYPTION_KEY is not set in environment.");
  }
  // Accept either 32-byte raw or 64-char hex
  if (KEY_HEX.length === 64) {
    return Buffer.from(KEY_HEX, "hex");
  }
  if (KEY_HEX.length === 32) {
    return Buffer.from(KEY_HEX, "utf8");
  }
  throw new Error("SECRETS_ENCRYPTION_KEY must be 32 UTF-8 bytes or 64 hex characters.");
}

/**
 * Titkosít egy string értéket AES-256-GCM-el.
 * Visszaadott formátum: "<iv_hex>:<authTag_hex>:<ciphertext_hex>"
 */
export function encryptSecret(plaintext: string): string {
  const key = getKey();
  const iv = crypto.randomBytes(12); // 96-bit IV recommended for GCM
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("hex")}:${tag.toString("hex")}:${encrypted.toString("hex")}`;
}

/**
 * Visszafejti az encryptSecret() által titkosított értéket.
 */
export function decryptSecret(stored: string): string {
  const parts = stored.split(":");
  if (parts.length !== 3) {
    throw new Error("Érvénytelen titkosított adat formátum.");
  }
  const ivHex = parts[0] as string;
  const tagHex = parts[1] as string;
  const ctHex = parts[2] as string;
  const key = getKey();
  const iv = Buffer.from(ivHex, "hex");
  const tag = Buffer.from(tagHex, "hex");
  const ciphertext = Buffer.from(ctHex, "hex");
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);
  const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return decrypted.toString("utf8");
}
