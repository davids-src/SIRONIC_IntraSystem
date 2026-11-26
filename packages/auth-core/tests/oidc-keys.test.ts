import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import { importJWK, jwtVerify } from "jose";
import { connectAuthDb } from "../src/connection";
import { signIdToken, getJwks, verifyIssuedToken } from "../src/oidc-keys";

let mongod: MongoMemoryServer;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create({ instance: { launchTimeout: 60_000 } });
  process.env.AUTH_MONGODB_URI = mongod.getUri();
  await connectAuthDb();
}, 60_000);

afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

afterEach(async () => {
  await mongoose.connection.collection("oidc_signing_keys").deleteMany({});
});

describe("OIDC id_token signing", () => {
  it("signs a token whose signature verifies against the published JWKS", async () => {
    const token = await signIdToken({
      sub: "user-1",
      email: "a@b.com",
      email_verified: true,
      name: "A B",
      issuer: "https://auth.sironic.eu",
      audience: "client-123",
    });

    const jwks = await getJwks();
    expect(jwks.keys).toHaveLength(1);
    const key = await importJWK(jwks.keys[0]!, "EdDSA");

    const { payload } = await jwtVerify(token, key, {
      issuer: "https://auth.sironic.eu",
      audience: "client-123",
    });

    expect(payload.sub).toBe("user-1");
    expect(payload.email).toBe("a@b.com");
    expect(payload.email_verified).toBe(true);
    expect(payload.name).toBe("A B");
  });

  it("rejects verification against the wrong audience", async () => {
    const token = await signIdToken({
      sub: "user-1",
      email: "a@b.com",
      email_verified: true,
      issuer: "https://auth.sironic.eu",
      audience: "client-123",
    });
    const jwks = await getJwks();
    const key = await importJWK(jwks.keys[0]!, "EdDSA");
    await expect(
      jwtVerify(token, key, {
        issuer: "https://auth.sironic.eu",
        audience: "someone-else",
      }),
    ).rejects.toThrow();
  });

  it("uses the same persisted key across independent calls (regression: used to be a fresh in-memory key per module instance)", async () => {
    const tokenA = await signIdToken({
      sub: "user-1",
      email: "a@b.com",
      email_verified: true,
      issuer: "https://auth.sironic.eu",
      audience: "client-123",
    });
    const tokenB = await signIdToken({
      sub: "user-2",
      email: "b@b.com",
      email_verified: true,
      issuer: "https://auth.sironic.eu",
      audience: "client-123",
    });
    const headerOf = (t: string) =>
      JSON.parse(Buffer.from(t.split(".")[0]!, "base64url").toString());
    expect(headerOf(tokenA).kid).toBe(headerOf(tokenB).kid);
  });
});

describe("concurrent first-key creation", () => {
  it("converges on one key when many requests race to create it", async () => {
    const headerOf = (t: string) =>
      JSON.parse(Buffer.from(t.split(".")[0]!, "base64url").toString());
    const tokens = await Promise.all(
      Array.from({ length: 10 }, (_, i) =>
        signIdToken({
          sub: `user-${i}`,
          email: `${i}@b.com`,
          email_verified: true,
          issuer: "https://auth.sironic.eu",
          audience: "client-123",
        }),
      ),
    );
    const kids = new Set(tokens.map((t) => headerOf(t).kid));
    expect(kids.size).toBe(1);
  });
});

describe("verifyIssuedToken", () => {
  it("verifies a token this server signed, using the public key derived from the persisted private key", async () => {
    const token = await signIdToken({
      sub: "user-1",
      email: "a@b.com",
      email_verified: true,
      name: "A B",
      issuer: "https://auth.sironic.eu",
      audience: "client-123",
    });
    const verified = await verifyIssuedToken(token, {
      issuer: "https://auth.sironic.eu",
    });
    expect(verified).toEqual({
      sub: "user-1",
      email: "a@b.com",
      email_verified: true,
      name: "A B",
    });
  });

  it("returns null for a garbage token", async () => {
    expect(
      await verifyIssuedToken("not-a-jwt", { issuer: "https://auth.sironic.eu" }),
    ).toBeNull();
  });

  it("returns null when the issuer doesn't match", async () => {
    const token = await signIdToken({
      sub: "user-1",
      email: "a@b.com",
      email_verified: true,
      issuer: "https://auth.sironic.eu",
      audience: "client-123",
    });
    expect(
      await verifyIssuedToken(token, { issuer: "https://someone-else.example" }),
    ).toBeNull();
  });
});
