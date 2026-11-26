import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import { connectAuthDb } from "../src/connection";
import { claimSetupLock } from "../src/setup-lock";
import { recordFailedAttemptAtomic } from "../src/lockout-store";
import { PlatformUserModel } from "../src/models/platform-user";
import { MAX_FAILED_ATTEMPTS } from "../src/lockout";

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
  await PlatformUserModel.deleteMany({});
  await mongoose.connection.collection("setup_locks").deleteMany({});
});

describe("claimSetupLock concurrency", () => {
  it("lets exactly one of N concurrent callers claim the lock", async () => {
    const results = await Promise.all(Array.from({ length: 10 }, () => claimSetupLock()));
    expect(results.filter(Boolean)).toHaveLength(1);
  });

  it("stays claimed on a later, non-concurrent call", async () => {
    expect(await claimSetupLock()).toBe(true);
    expect(await claimSetupLock()).toBe(false);
  });
});

describe("recordFailedAttemptAtomic concurrency", () => {
  it("loses no increments under concurrent failures", async () => {
    const user = await PlatformUserModel.create({
      email: "race@test.local",
      password_hash: "irrelevant",
    });
    const N = 8;
    await Promise.all(
      Array.from({ length: N }, () => recordFailedAttemptAtomic(user._id)),
    );
    const updated = await PlatformUserModel.findById(user._id).lean<{
      failed_login_count: number;
    }>();
    expect(updated!.failed_login_count).toBe(N);
  });

  it("locks the account once the threshold is reached", async () => {
    const user = await PlatformUserModel.create({
      email: "lockme@test.local",
      password_hash: "irrelevant",
    });
    for (let i = 0; i < MAX_FAILED_ATTEMPTS; i += 1) {
      await recordFailedAttemptAtomic(user._id);
    }
    const updated = await PlatformUserModel.findById(user._id).lean<{
      failed_login_count: number;
      locked_until: Date | null;
    }>();
    expect(updated!.failed_login_count).toBe(MAX_FAILED_ATTEMPTS);
    expect(updated!.locked_until).not.toBeNull();
    expect(updated!.locked_until!.getTime()).toBeGreaterThan(Date.now());
  });
});
