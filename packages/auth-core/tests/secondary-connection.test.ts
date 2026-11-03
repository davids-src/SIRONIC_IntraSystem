import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import { connectSecondaryAuthDb } from "../src/secondary-connection";
import { platformUserModelFor } from "../src/models/platform-user";
import { findOrCreatePlatformUserByEmail } from "../src/platform-user-store";

// Simulates CRM's real situation: a primary default connection to its own database (here,
// standing in for `crm`) PLUS a secondary connection to sironic_auth in the same process.
// The whole point is proving these two never cross-contaminate — the bug this guards
// against is "mongoose.connect() on an already-open default connection is a no-op", which
// would silently make both logical databases resolve to whichever one connected first.
let primaryMongod: MongoMemoryServer;
let secondaryMongod: MongoMemoryServer;

beforeAll(async () => {
  [primaryMongod, secondaryMongod] = await Promise.all([
    MongoMemoryServer.create({ instance: { launchTimeout: 60_000 } }),
    MongoMemoryServer.create({ instance: { launchTimeout: 60_000 } }),
  ]);
  // Primary: the global default connection, exactly how @crm/db's connectDb() works.
  await mongoose.connect(primaryMongod.getUri());
  process.env.AUTH_MONGODB_URI = secondaryMongod.getUri();
}, 60_000);

afterAll(async () => {
  await mongoose.disconnect();
  await primaryMongod.stop();
  await secondaryMongod.stop();
});

describe("connectSecondaryAuthDb cold-start concurrency", () => {
  it("converges on exactly one connection when many requests race in before it's cached", async () => {
    // Simulate a cold server: nothing has called connectSecondaryAuthDb() yet.
    delete (globalThis as { __sironicSecondaryAuthConnection?: unknown })
      .__sironicSecondaryAuthConnection;

    const connections = await Promise.all(
      Array.from({ length: 10 }, () => connectSecondaryAuthDb()),
    );
    const uniqueConnections = new Set(connections);
    expect(uniqueConnections.size).toBe(1);
  });
});

describe("dual connection: default (primary) + secondary auth", () => {
  it("creates a PlatformUser only in the secondary database, not the primary one", async () => {
    const secondary = await connectSecondaryAuthDb();
    const model = platformUserModelFor(secondary);
    await findOrCreatePlatformUserByEmail("dual-conn@test.local", null, model);

    // Found on the secondary connection.
    const onSecondary = await model.findOne({ email: "dual-conn@test.local" }).lean();
    expect(onSecondary).not.toBeNull();

    // NOT found via the default (primary) connection's own registry — if the two
    // connections were actually the same underlying connection, this would also find it.
    const PrimaryPlatformUser: mongoose.Model<any> =
      (mongoose.models.PlatformUser as mongoose.Model<any>) ||
      mongoose.model("PlatformUser", new mongoose.Schema({ email: String }));
    const onPrimary = await PrimaryPlatformUser.findOne({
      email: "dual-conn@test.local",
    }).lean();
    expect(onPrimary).toBeNull();

    // And the two connections are genuinely pointed at different servers.
    expect(secondary.host + ":" + secondary.port).not.toBe(
      mongoose.connection.host + ":" + mongoose.connection.port,
    );
  });

  it("findOrCreatePlatformUserByEmail on the secondary connection returns the same id on repeat calls", async () => {
    const secondary = await connectSecondaryAuthDb();
    const model = platformUserModelFor(secondary);
    const first = await findOrCreatePlatformUserByEmail("repeat@test.local", null, model);
    const second = await findOrCreatePlatformUserByEmail(
      "repeat@test.local",
      null,
      model,
    );
    expect(String(first._id)).toBe(String(second._id));
  });
});
