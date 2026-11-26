import { authenticator } from "otplib";
import {
  generateTotpSecret,
  verifyTotpCode,
  generateRecoveryCodes,
  hashRecoveryCode,
  matchRecoveryCode,
} from "../src/totp";

describe("totp", () => {
  it("verifies a code generated from the same secret", () => {
    const secret = generateTotpSecret();
    const code = authenticator.generate(secret);
    expect(verifyTotpCode(code, secret)).toBe(true);
  });

  it("rejects a code from a different secret", () => {
    const secret = generateTotpSecret();
    const otherSecret = generateTotpSecret();
    const code = authenticator.generate(otherSecret);
    expect(verifyTotpCode(code, secret)).toBe(false);
  });

  it("rejects a garbage code without throwing", () => {
    const secret = generateTotpSecret();
    expect(verifyTotpCode("not-a-code", secret)).toBe(false);
  });
});

describe("recovery codes", () => {
  it("generates the requested count of unique codes", () => {
    const codes = generateRecoveryCodes(10);
    expect(codes).toHaveLength(10);
    expect(new Set(codes).size).toBe(10);
  });

  it("matches a valid code against its hash list and is case/whitespace tolerant", () => {
    const [code] = generateRecoveryCodes(1);
    const hashes = [hashRecoveryCode(code!)];
    expect(matchRecoveryCode(` ${code!.toUpperCase()} `, hashes)).toBe(hashes[0]);
  });

  it("returns null for a code that was never issued", () => {
    const hashes = [hashRecoveryCode("abcd-1234")];
    expect(matchRecoveryCode("zzzz-9999", hashes)).toBeNull();
  });
});
