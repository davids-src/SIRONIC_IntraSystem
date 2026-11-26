import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import mongoose from "mongoose";
import type { MongoMemoryServer } from "mongodb-memory-server";
import { createTestMongo } from "@erp/test-utils/mongo-memory";
import { connectDB, getNativeClient, Role, User } from "@erp/db-core";
import { secretsApi, type SecretViewer } from "./api";
import { SECRETS_PERMISSIONS as P } from "./constants";
import { Secret, SecretHozzaferes } from "./models/Secret";

let mongo: MongoMemoryServer;
const prevKey = process.env.SECRETS_ENCRYPTION_KEY;
const ALL = Object.values(P);
const PLAIN = "super-secret-p@ss";

beforeAll(async () => {
  process.env.SECRETS_ENCRYPTION_KEY = "0123456789abcdef0123456789abcdef";
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
  if (prevKey === undefined) delete process.env.SECRETS_ENCRYPTION_KEY;
  else process.env.SECRETS_ENCRYPTION_KEY = prevKey;
});

async function account(
  name: string,
  permissions: string[] = ALL,
  roleIds: string[] = [],
) {
  const u = await User.create({
    email: `${name}@example.com`,
    name,
    roleIds,
    isActive: true,
  });
  return {
    userId: String(u._id),
    userName: name,
    permissions,
    roleIds,
  } satisfies SecretViewer & {
    userName: string;
  };
}

const query = { page: 1, pageSize: 50 };

describe("secretsApi", () => {
  it("list and get never return ciphertext or value", async () => {
    const owner = await account("owner");
    const created = await secretsApi.create(owner, {
      name: "DB",
      value: PLAIN,
      partnerId: "p1",
    });
    expect(created.ok).toBe(true);
    const id = created.ok ? created.id! : "";

    const list = await secretsApi.list(owner, query);
    expect(list.total).toBe(1);
    const detail = await secretsApi.get(owner, id);

    for (const dto of [list, detail]) {
      const json = JSON.stringify(dto);
      expect(json).not.toContain(PLAIN);
      expect(json).not.toContain("valueEncrypted");
      expect(json).not.toMatch(/[0-9a-f]{24}:[0-9a-f]{32}:/);
    }
    // ...while the stored document really is encrypted
    const raw = await Secret.findById(id).lean();
    expect(raw?.valueEncrypted).not.toContain(PLAIN);
    expect(list.data[0]).toMatchObject({ name: "DB", partnerId: "p1", mine: true });
  });

  it("reveal decrypts for the owner and writes who/when to the audit log", async () => {
    const owner = await account("owner");
    const id = (await secretsApi.create(owner, { name: "DB", value: PLAIN })) as {
      id: string;
    };
    const before = Date.now();
    const r = await secretsApi.reveal(owner, id.id);
    expect(r).toEqual({ ok: true, value: PLAIN });

    const log = await secretsApi.listAccessLog(owner, id.id);
    expect(log).toHaveLength(1);
    expect(log![0]).toMatchObject({
      userId: owner.userId,
      userName: "owner",
      action: "reveal",
    });
    expect(new Date(log![0]!.at).getTime()).toBeGreaterThanOrEqual(before - 1000);
    expect(JSON.stringify(log)).not.toContain(PLAIN);
  });

  it("reveal is refused (and not logged) without the key or without access", async () => {
    const owner = await account("owner");
    const stranger = await account("stranger");
    const noKey = await account("nokey", [P.read, P.write]);
    const { id } = (await secretsApi.create(owner, { name: "DB", value: PLAIN })) as {
      id: string;
    };

    expect((await secretsApi.reveal(stranger, id)).ok).toBe(false);
    expect(await secretsApi.get(stranger, id)).toBeNull();
    expect((await secretsApi.list(stranger, query)).total).toBe(0);

    await secretsApi.share(owner, id, {
      kind: "user",
      targetId: noKey.userId,
      level: "read",
    });
    const denied = await secretsApi.reveal(noKey, id);
    expect(denied.ok).toBe(false);
    expect(JSON.stringify(denied)).not.toContain(PLAIN);
    expect(await SecretHozzaferes.countDocuments()).toBe(0);
  });

  it("shares with a user and with a role, and revokes", async () => {
    const role = await Role.create({
      key: "support",
      name: "Support",
      permissionIds: [],
    });
    const owner = await account("owner");
    const bela = await account("bela");
    const anna = await account("anna", ALL, [String(role._id)]);
    const { id } = (await secretsApi.create(owner, { name: "DB", value: PLAIN })) as {
      id: string;
    };

    const s1 = await secretsApi.share(owner, id, {
      kind: "user",
      targetId: bela.userId,
      level: "read",
    });
    await secretsApi.share(owner, id, {
      kind: "role",
      targetId: String(role._id),
      level: "read",
    });
    expect((await secretsApi.listShares(owner, id))!).toHaveLength(2);

    expect((await secretsApi.list(bela, query)).data[0]).toMatchObject({
      name: "DB",
      mine: false,
    });
    expect((await secretsApi.list(anna, query)).total).toBe(1);
    expect(await secretsApi.reveal(anna, id)).toEqual({ ok: true, value: PLAIN });

    // shared readers cannot edit, delete or re-share
    expect((await secretsApi.update(bela, id, { name: "x" })).ok).toBe(false);
    expect((await secretsApi.delete(bela, id)).ok).toBe(false);
    expect(
      (
        await secretsApi.share(bela, id, {
          kind: "user",
          targetId: anna.userId,
          level: "read",
        })
      ).ok,
    ).toBe(false);
    expect(await secretsApi.listShares(bela, id)).toBeNull();
    expect(await secretsApi.listAccessLog(bela, id)).toBeNull();

    // revoke
    expect((await secretsApi.revokeShare(owner, id, (s1 as { id: string }).id)).ok).toBe(
      true,
    );
    expect((await secretsApi.list(bela, query)).total).toBe(0);
    expect((await secretsApi.reveal(bela, id)).ok).toBe(false);
  });

  it("re-sharing updates the level (idempotent) and edit level can modify", async () => {
    const owner = await account("owner");
    const bela = await account("bela");
    const { id } = (await secretsApi.create(owner, { name: "DB", value: PLAIN })) as {
      id: string;
    };
    await secretsApi.share(owner, id, {
      kind: "user",
      targetId: bela.userId,
      level: "read",
    });
    await secretsApi.share(owner, id, {
      kind: "user",
      targetId: bela.userId,
      level: "edit",
    });
    expect(await secretsApi.listShares(owner, id)).toHaveLength(1);
    expect((await secretsApi.update(bela, id, { name: "DB2", value: "new" })).ok).toBe(
      true,
    );
    expect(await secretsApi.reveal(owner, id)).toEqual({ ok: true, value: "new" });
  });

  it("update keeps the value when none is given; delete removes secret and shares", async () => {
    const owner = await account("owner");
    const bela = await account("bela");
    const { id } = (await secretsApi.create(owner, { name: "DB", value: PLAIN })) as {
      id: string;
    };
    await secretsApi.share(owner, id, {
      kind: "user",
      targetId: bela.userId,
      level: "read",
    });

    expect(
      (await secretsApi.update(owner, id, { name: "Renamed", partnerId: "p2" })).ok,
    ).toBe(true);
    expect(await secretsApi.reveal(owner, id)).toEqual({ ok: true, value: PLAIN });
    expect((await secretsApi.get(owner, id))?.name).toBe("Renamed");

    expect((await secretsApi.delete(owner, id)).ok).toBe(true);
    expect(await secretsApi.get(owner, id)).toBeNull();
    expect(await Secret.countDocuments()).toBe(0);
    expect((await secretsApi.list(bela, query)).total).toBe(0);
  });

  it("rejects sharing with an unknown user/role", async () => {
    const owner = await account("owner");
    const { id } = (await secretsApi.create(owner, { name: "DB", value: PLAIN })) as {
      id: string;
    };
    const ghost = String(new mongoose.Types.ObjectId());
    expect(
      (
        await secretsApi.share(owner, id, {
          kind: "user",
          targetId: ghost,
          level: "read",
        })
      ).ok,
    ).toBe(false);
    expect(
      (
        await secretsApi.share(owner, id, {
          kind: "role",
          targetId: ghost,
          level: "read",
        })
      ).ok,
    ).toBe(false);
  });

  it("fails closed without a key, and reports undecryptable data without throwing", async () => {
    const owner = await account("owner");
    const { id } = (await secretsApi.create(owner, { name: "DB", value: PLAIN })) as {
      id: string;
    };
    const key = process.env.SECRETS_ENCRYPTION_KEY;
    delete process.env.SECRETS_ENCRYPTION_KEY;
    expect((await secretsApi.create(owner, { name: "X", value: "y" })).ok).toBe(false);
    expect((await secretsApi.reveal(owner, id)).ok).toBe(false);
    process.env.SECRETS_ENCRYPTION_KEY = key;

    await Secret.updateOne({ _id: id }, { $set: { valueEncrypted: "00:00:00" } });
    expect((await secretsApi.reveal(owner, id)).ok).toBe(false);
    expect(await SecretHozzaferes.countDocuments()).toBe(0);
  });
});
