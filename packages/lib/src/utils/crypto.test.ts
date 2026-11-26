import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  decryptSecret,
  encryptSecret,
  getEncryptionKey,
  isEncryptedPayload,
  SECRETS_KEY_ENV,
} from "./crypto";

const KEY_A = "0123456789abcdef0123456789abcdef"; // 32 UTF-8 bytes
const KEY_B = "fedcba9876543210fedcba9876543210";
const HEX_KEY = "ab".repeat(32);

describe("AES-256-GCM crypto", () => {
  const prev = process.env[SECRETS_KEY_ENV];

  beforeEach(() => {
    process.env[SECRETS_KEY_ENV] = KEY_A;
  });
  afterEach(() => {
    if (prev === undefined) delete process.env[SECRETS_KEY_ENV];
    else process.env[SECRETS_KEY_ENV] = prev;
  });

  it("round-trips, including unicode and empty strings", () => {
    for (const plain of ["sk-live-abc123", "árvíztűrő tükörfúrógép 🔐", "", "a:b:c"]) {
      expect(decryptSecret(encryptSecret(plain))).toBe(plain);
    }
  });

  it("uses the iv:authTag:ciphertext hex format with a fresh IV each time", () => {
    const a = encryptSecret("same");
    const b = encryptSecret("same");
    expect(a).not.toBe(b);
    expect(isEncryptedPayload(a)).toBe(true);
    const [iv, tag] = a.split(":");
    expect(iv).toHaveLength(24);
    expect(tag).toHaveLength(32);
    expect(a).not.toContain("same");
  });

  it("accepts a 64-hex-character key", () => {
    process.env[SECRETS_KEY_ENV] = HEX_KEY;
    expect(getEncryptionKey()).toHaveLength(32);
    expect(decryptSecret(encryptSecret("x"))).toBe("x");
  });

  it("throws when the ciphertext is tampered with", () => {
    const [iv, tag, ct] = encryptSecret("top secret").split(":") as [
      string,
      string,
      string,
    ];
    const flip = (hex: string) => (hex[0] === "0" ? "1" : "0") + hex.slice(1);
    expect(() => decryptSecret(`${iv}:${tag}:${flip(ct)}`)).toThrow();
    expect(() => decryptSecret(`${iv}:${flip(tag)}:${ct}`)).toThrow();
    expect(() => decryptSecret(`${flip(iv)}:${tag}:${ct}`)).toThrow();
    expect(() => decryptSecret(`${iv}:${tag}:${ct}00`)).toThrow();
  });

  it("throws on a malformed payload", () => {
    expect(() => decryptSecret("plain text")).toThrow("Invalid encrypted payload");
    expect(() => decryptSecret("a:b:c:d")).toThrow();
    expect(() => decryptSecret("zz:zz:zz")).toThrow();
  });

  it("throws with the wrong key", () => {
    const enc = encryptSecret("top secret");
    process.env[SECRETS_KEY_ENV] = KEY_B;
    expect(() => decryptSecret(enc)).toThrow();
  });

  it("fails closed when the key is missing or the wrong size", () => {
    delete process.env[SECRETS_KEY_ENV];
    expect(() => encryptSecret("x")).toThrow("not set");
    process.env[SECRETS_KEY_ENV] = "   ";
    expect(() => encryptSecret("x")).toThrow("not set");
    process.env[SECRETS_KEY_ENV] = "too-short";
    expect(() => encryptSecret("x")).toThrow("32 bytes");
    process.env[SECRETS_KEY_ENV] = `${KEY_A}x`;
    expect(() => encryptSecret("x")).toThrow("32 bytes");
    expect(() => decryptSecret(`${"a".repeat(24)}:${"b".repeat(32)}:cc`)).toThrow();
  });
});
