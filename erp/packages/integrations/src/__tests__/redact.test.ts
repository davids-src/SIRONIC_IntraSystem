import { describe, expect, it } from "vitest";
import { redact, redactHeaders } from "../redact";

describe("redact", () => {
  it("masks credential-looking keys at any depth, keeps the rest", () => {
    const out = redact({
      domain: "example.com",
      api_token: "tok",
      nested: { Password: "pw", list: [{ secret: "s", ok: 1 }] },
      Authorization: "Bearer x",
    });
    expect(out).toEqual({
      domain: "example.com",
      api_token: "***",
      nested: { Password: "***", list: [{ secret: "***", ok: 1 }] },
      Authorization: "***",
    });
  });

  it("does not mutate its input", () => {
    const input = { token: "abc" };
    redact(input);
    expect(input.token).toBe("abc");
  });

  it("redacts header bags", () => {
    expect(
      redactHeaders({ Authorization: "Bearer x", "X-API-Key": "k", Accept: "a" }),
    ).toEqual({ Authorization: "***", "X-API-Key": "***", Accept: "a" });
  });
});
