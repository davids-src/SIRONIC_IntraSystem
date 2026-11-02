import { isSafeReturnTo } from "../src/safe-return-to";

const ORIGIN = "https://auth.sironic.eu";

describe("isSafeReturnTo", () => {
  it("accepts an app-relative path", () => {
    expect(isSafeReturnTo("/api/oidc/authorize?client_id=x", ORIGIN)).toBe(true);
  });

  it("rejects a protocol-relative URL", () => {
    expect(isSafeReturnTo("//evil.com", ORIGIN)).toBe(false);
  });

  it("rejects an absolute URL on another origin", () => {
    expect(isSafeReturnTo("https://evil.com", ORIGIN)).toBe(false);
  });

  it("rejects a backslash-prefixed path (resolves to another origin in browsers)", () => {
    expect(isSafeReturnTo("/\\evil.com", ORIGIN)).toBe(false);
    expect(isSafeReturnTo("/\\/evil.com", ORIGIN)).toBe(false);
  });

  it("rejects a value that doesn't start with /", () => {
    expect(isSafeReturnTo("evil.com", ORIGIN)).toBe(false);
  });
});
