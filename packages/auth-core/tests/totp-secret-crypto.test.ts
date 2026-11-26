import { encryptTotpSecret, decryptTotpSecret } from "../src/totp-secret-crypto";

const ORIGINAL_KEY = process.env.AUTH_SECRETS_ENCRYPTION_KEY;

beforeAll(() => {
  process.env.AUTH_SECRETS_ENCRYPTION_KEY = "a".repeat(64); // 64 hex chars
});

afterAll(() => {
  process.env.AUTH_SECRETS_ENCRYPTION_KEY = ORIGINAL_KEY;
});

describe("totp secret at-rest encryption", () => {
  it("round-trips a secret", () => {
    const secret = "JBSWY3DPEHPK3PXP";
    const encrypted = encryptTotpSecret(secret);
    expect(encrypted).not.toContain(secret);
    expect(decryptTotpSecret(encrypted)).toBe(secret);
  });

  it("produces a different ciphertext each time (random IV)", () => {
    const a = encryptTotpSecret("same-secret");
    const b = encryptTotpSecret("same-secret");
    expect(a).not.toBe(b);
  });

  it("rejects a tampered ciphertext", () => {
    const encrypted = encryptTotpSecret("JBSWY3DPEHPK3PXP");
    const parts = encrypted.split(":");
    const tampered = `${parts[0]}:${parts[1]}:${parts[2]!.slice(0, -2)}ff`;
    expect(() => decryptTotpSecret(tampered)).toThrow();
  });
});
