import { createSessionToken, verifySessionToken } from "../src/session";

const ORIGINAL_SECRET = process.env.AUTH_SECRET;

beforeAll(() => {
  process.env.AUTH_SECRET = "test-secret-at-least-this-long-for-hs256";
});

afterAll(() => {
  process.env.AUTH_SECRET = ORIGINAL_SECRET;
});

describe("session token", () => {
  it("round-trips a valid token", async () => {
    const token = await createSessionToken({ sub: "user-1", email: "a@b.com" });
    const payload = await verifySessionToken(token);
    expect(payload).toEqual({ sub: "user-1", email: "a@b.com" });
  });

  it("rejects a tampered token", async () => {
    const token = await createSessionToken({ sub: "user-1", email: "a@b.com" });
    const tampered = token.slice(0, -2) + (token.slice(-2) === "aa" ? "bb" : "aa");
    expect(await verifySessionToken(tampered)).toBeNull();
  });

  it("rejects garbage input", async () => {
    expect(await verifySessionToken("not-a-jwt")).toBeNull();
  });
});
