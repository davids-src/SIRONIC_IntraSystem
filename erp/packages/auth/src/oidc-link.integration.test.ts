import { afterAll, beforeAll, describe, expect, it } from "vitest";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import { createTestMongo } from "@erp/test-utils/mongo-memory";
import { User, connectDB } from "@erp/db-core";
import { linkOidcIdentity } from "./oidc-link";

let mongo: MongoMemoryServer;

beforeAll(async () => {
  mongo = await createTestMongo();
  process.env.MONGODB_URI = mongo.getUri();
  await connectDB();
  await User.init();
});

afterAll(async () => {
  await mongoose.disconnect();
  if (mongo) await mongo.stop();
});

describe("linkOidcIdentity", () => {
  it("links a local user by verified email, then recognises the sub", async () => {
    const u = await User.create({
      email: "anna@sironic.hu",
      name: "Anna",
      isActive: true,
    });
    const first = await linkOidcIdentity({
      sub: "sub-1",
      email: "Anna@Sironic.hu",
      emailVerified: true,
    });
    expect(first).toEqual({ ok: true, userId: String(u._id), action: "link" });
    expect((await User.findById(u._id))?.platformUserId).toBe("sub-1");

    // Email changed at the IdP: the sub link still resolves.
    const again = await linkOidcIdentity({
      sub: "sub-1",
      email: "new@x.hu",
      emailVerified: true,
    });
    expect(again).toMatchObject({ ok: true, userId: String(u._id), action: "existing" });
  });

  it("does not create users for unknown identities", async () => {
    const before = await User.countDocuments();
    const res = await linkOidcIdentity({
      sub: "sub-x",
      email: "ismeretlen@x.hu",
      emailVerified: true,
    });
    expect(res).toEqual({ ok: false, reason: "unknown_identity" });
    expect(await User.countDocuments()).toBe(before);
  });

  it("refuses unverified email without linking", async () => {
    const u = await User.create({
      email: "bela@sironic.hu",
      name: "Béla",
      isActive: true,
    });
    const res = await linkOidcIdentity({
      sub: "sub-2",
      email: "bela@sironic.hu",
      emailVerified: false,
    });
    expect(res).toEqual({ ok: false, reason: "email_unverified" });
    expect((await User.findById(u._id))?.platformUserId).toBeUndefined();
  });

  it("refuses deactivated users (by email and by sub)", async () => {
    const u = await User.create({
      email: "cili@sironic.hu",
      name: "Cili",
      isActive: false,
    });
    expect(
      await linkOidcIdentity({
        sub: "sub-3",
        email: "cili@sironic.hu",
        emailVerified: true,
      }),
    ).toEqual({ ok: false, reason: "deactivated" });
    await User.updateOne({ _id: u._id }, { platformUserId: "sub-3b" });
    expect(await linkOidcIdentity({ sub: "sub-3b" })).toEqual({
      ok: false,
      reason: "deactivated",
    });
  });

  it("rejects a second sub for an already linked account", async () => {
    await User.create({
      email: "dani@sironic.hu",
      name: "Dani",
      isActive: true,
      platformUserId: "sub-4",
    });
    expect(
      await linkOidcIdentity({
        sub: "sub-5",
        email: "dani@sironic.hu",
        emailVerified: true,
      }),
    ).toEqual({ ok: false, reason: "link_conflict" });
  });
});
