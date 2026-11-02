import { generateVerificationToken, isTokenValid, hashToken } from "../src/magic-link";

describe("magic-link / reset tokens", () => {
  it("generates a token whose hash matches isTokenValid", () => {
    const { token, token_hash, expires_at } = generateVerificationToken(60_000);
    expect(hashToken(token)).toBe(token_hash);
    expect(
      isTokenValid({
        providedToken: token,
        storedHash: token_hash,
        expiresAt: expires_at,
      }),
    ).toBe(true);
  });

  it("rejects a wrong token", () => {
    const { token_hash, expires_at } = generateVerificationToken(60_000);
    expect(
      isTokenValid({
        providedToken: "not-the-right-token",
        storedHash: token_hash,
        expiresAt: expires_at,
      }),
    ).toBe(false);
  });

  it("rejects an expired token", () => {
    const { token, token_hash } = generateVerificationToken(-1);
    expect(
      isTokenValid({
        providedToken: token,
        storedHash: token_hash,
        expiresAt: new Date(Date.now() - 1000),
      }),
    ).toBe(false);
  });

  it("rejects when nothing is stored yet", () => {
    expect(isTokenValid({ providedToken: "x", storedHash: null, expiresAt: null })).toBe(
      false,
    );
  });
});
