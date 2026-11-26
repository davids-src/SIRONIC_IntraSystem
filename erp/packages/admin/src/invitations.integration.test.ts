import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import { createTestMongo } from "@erp/test-utils/mongo-memory";
import { connectDB, getNativeClient } from "@erp/db-core";
import {
  createUserInvitation,
  getLatestInvitations,
  renewPendingInvitation,
} from "./invitations";
import { UserInvitation } from "./models/UserInvitation";

let mongo: MongoMemoryServer;
const invitedBy = new mongoose.Types.ObjectId();

beforeAll(async () => {
  mongo = await createTestMongo();
  process.env.MONGODB_URI = mongo.getUri();
  await connectDB();
});

afterEach(async () => {
  await mongoose.connection.dropDatabase();
});

afterAll(async () => {
  await getNativeClient().close();
  await mongoose.disconnect();
  if (mongo) await mongo.stop();
});

describe("invitation status and renewal (HR onboarding)", () => {
  it("renews a valid invitation with a new window and extra roles, keeping its link", async () => {
    const roleA = new mongoose.Types.ObjectId();
    const roleB = new mongoose.Types.ObjectId();
    const { invitation, inviteLink } = await createUserInvitation({
      email: "Uj.Belepo@example.com",
      name: "Új Belépő",
      roleIds: [roleA],
      invitedBy,
      expiresInDays: 1,
    });
    await expect(
      createUserInvitation({
        email: "uj.belepo@example.com",
        name: "x",
        roleIds: [],
        invitedBy,
      }),
    ).rejects.toThrow(/érvényes meghívó/);

    const renewed = await renewPendingInvitation("uj.belepo@example.com", {
      expiresInDays: 7,
      roleIds: [roleA, roleB],
    });
    expect(renewed?.inviteLink).toBe(inviteLink);
    expect(renewed!.invitation.expiresAt.getTime()).toBeGreaterThan(
      invitation.expiresAt.getTime() + 5 * 86_400_000,
    );
    expect(renewed!.invitation.roleIds.map(String).sort()).toEqual(
      [roleA, roleB].map(String).sort(),
    );
  });

  it("reports the latest invitation per address: pending, expired, used", async () => {
    await createUserInvitation({
      email: "a@example.com",
      name: "A",
      roleIds: [],
      invitedBy,
    });
    const { invitation: b } = await createUserInvitation({
      email: "b@example.com",
      name: "B",
      roleIds: [],
      invitedBy,
    });
    await UserInvitation.updateOne(
      { _id: b._id },
      { expiresAt: new Date(Date.now() - 1000) },
    );
    const { invitation: c } = await createUserInvitation({
      email: "c@example.com",
      name: "C",
      roleIds: [],
      invitedBy,
    });
    await UserInvitation.updateOne({ _id: c._id }, { isUsed: true });

    const m = await getLatestInvitations([
      "A@example.com",
      "b@example.com",
      "c@example.com",
      "x@y.hu",
    ]);
    expect(m.get("a@example.com")?.status).toBe("pending");
    expect(m.get("b@example.com")?.status).toBe("expired");
    expect(m.get("c@example.com")?.status).toBe("used");
    expect(m.get("c@example.com")?.usedAt).toBeInstanceOf(Date);
    expect(m.has("x@y.hu")).toBe(false);
    expect(await renewPendingInvitation("b@example.com")).toBeNull();
  });
});
