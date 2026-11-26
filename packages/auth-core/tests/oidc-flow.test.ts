import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import { connectAuthDb } from "../src/connection";
import { createOidcClient, findActiveOidcClient } from "../src/oidc-client-store";
import {
  createAuthorizationCode,
  consumeAuthorizationCode,
} from "../src/oidc-code-store";
import { verifyPassword } from "../src/password";
import { OidcClientModel } from "../src/models/oidc-client";
import { OidcAuthorizationCodeModel } from "../src/models/oidc-authorization-code";

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
  await OidcClientModel.deleteMany({});
  await OidcAuthorizationCodeModel.deleteMany({});
});

describe("OIDC client registration", () => {
  it("creates a confidential client with a verifiable secret", async () => {
    const { client_id, client_secret } = await createOidcClient({
      name: "Test deployment",
      type: "deployment",
      redirectUris: ["https://example.com/api/auth/callback/sironic"],
      confidential: true,
    });
    expect(client_secret).not.toBeNull();

    const client = await findActiveOidcClient(client_id);
    expect(client).not.toBeNull();
    expect(client!.client_secret_hash).not.toBeNull();
    expect(await verifyPassword(client_secret!, client!.client_secret_hash!)).toBe(true);
    expect(await verifyPassword("wrong-secret", client!.client_secret_hash!)).toBe(false);
  });

  it("creates a public client with no secret", async () => {
    const { client_secret } = await createOidcClient({
      name: "Public SPA",
      type: "other",
      redirectUris: ["https://example.com/callback"],
      confidential: false,
    });
    expect(client_secret).toBeNull();
  });

  it("does not require a deployment_id (externally-hosted site we built)", async () => {
    const { client_id } = await createOidcClient({
      name: "Built-by-us, hosted-by-them",
      type: "other",
      redirectUris: ["https://client-infra.example/callback"],
      confidential: false,
    });
    const client = await findActiveOidcClient(client_id);
    expect(client!.deployment_id).toBeNull();
  });
});

describe("authorization code single-use", () => {
  it("is consumable exactly once", async () => {
    const code = await createAuthorizationCode({
      clientId: "client-1",
      userId: "user-1",
      redirectUri: "https://example.com/callback",
      scope: "openid email profile",
      codeChallenge: "abc123",
    });

    const first = await consumeAuthorizationCode(code);
    expect(first).not.toBeNull();
    expect(first!.client_id).toBe("client-1");

    const second = await consumeAuthorizationCode(code);
    expect(second).toBeNull();
  });

  it("rejects an unknown code", async () => {
    expect(await consumeAuthorizationCode("not-a-real-code")).toBeNull();
  });
});
