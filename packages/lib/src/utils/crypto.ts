import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

/**
 * Shared AES-256-GCM helper (Titoktár, later `@erp/integrations`).
 *
 * Stored format: `iv:authTag:ciphertext`, each segment lower-case hex. This is byte-for-byte the
 * legacy CRM format (`packages/lib/src/secret-crypto.ts`), so migrated ciphertext decrypts as-is
 * **as long as `SECRETS_ENCRYPTION_KEY` is identical** to the legacy one.
 *
 * The key is mandatory and there is no fallback (no `AUTH_SECRET`): a missing or malformed key
 * throws, so nothing is ever encrypted with a weak key or silently stored in plain text.
 */
const ALGORITHM = "aes-256-gcm";
const KEY_BYTES = 32;
const IV_BYTES = 12;
const TAG_BYTES = 16;
const HEX = /^[0-9a-f]+$/i;

export const SECRETS_KEY_ENV = "SECRETS_ENCRYPTION_KEY";

/**
 * Resolves the 32-byte key from the environment: 64 hex characters, or exactly 32 UTF-8 bytes
 * (the two forms the legacy system accepted). Fails closed on anything else.
 */
export function getEncryptionKey(env: NodeJS.ProcessEnv = process.env): Buffer {
  const raw = env[SECRETS_KEY_ENV]?.trim() ?? "";
  if (raw.length === 0) {
    throw new Error(`${SECRETS_KEY_ENV} is not set.`);
  }
  if (raw.length === KEY_BYTES * 2 && HEX.test(raw)) {
    return Buffer.from(raw, "hex");
  }
  const utf8 = Buffer.from(raw, "utf8");
  if (utf8.length === KEY_BYTES) return utf8;
  throw new Error(`${SECRETS_KEY_ENV} must be 64 hex characters or exactly 32 bytes.`);
}

/** Encrypts `plaintext`; returns `iv:authTag:ciphertext` (hex). A fresh random IV every call. */
export function encryptSecret(plaintext: string): string {
  const key = getEncryptionKey();
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("hex")}:${tag.toString("hex")}:${encrypted.toString("hex")}`;
}

/** True when `stored` has the `iv:authTag:ciphertext` shape (does not check the key). */
export function isEncryptedPayload(stored: string): boolean {
  const parts = stored.split(":");
  if (parts.length !== 3) return false;
  const [iv, tag, ct] = parts as [string, string, string];
  return (
    iv.length === IV_BYTES * 2 &&
    tag.length === TAG_BYTES * 2 &&
    HEX.test(iv) &&
    HEX.test(tag) &&
    (ct.length === 0 || (ct.length % 2 === 0 && HEX.test(ct)))
  );
}

/** Decrypts a payload from `encryptSecret`. Throws on a wrong key or any tampering (GCM tag). */
export function decryptSecret(stored: string): string {
  if (!isEncryptedPayload(stored)) {
    throw new Error("Invalid encrypted payload format.");
  }
  const [ivHex, tagHex, ctHex] = stored.split(":") as [string, string, string];
  const decipher = createDecipheriv(
    ALGORITHM,
    getEncryptionKey(),
    Buffer.from(ivHex, "hex"),
  );
  decipher.setAuthTag(Buffer.from(tagHex, "hex"));
  return Buffer.concat([
    decipher.update(Buffer.from(ctHex, "hex")),
    decipher.final(),
  ]).toString("utf8");
}
