import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import { createTestMongo } from "@erp/test-utils/mongo-memory";
import { connectDB } from "@erp/db-core";
import {
  mapContact,
  mapLead,
  mapSupplier,
  upsertErdeklodok,
  upsertPartnerek,
} from "./migration";
import { partnerApi } from "./api";

let mongo: MongoMemoryServer;
const fallback = new mongoose.Types.ObjectId().toString();

beforeAll(async () => {
  mongo = await createTestMongo();
  process.env.MONGODB_URI = mongo.getUri();
  await connectDB();
});
afterEach(async () => {
  await mongoose.connection.dropDatabase();
});
afterAll(async () => {
  await mongoose.disconnect();
  if (mongo) await mongo.stop();
});

describe("partner migration is idempotent", () => {
  it("running twice creates once and updates once", async () => {
    const rows = [
      mapContact({
        _id: "c1",
        name: "Contact Kft.",
        type: "company",
        is_archived: true,
        archived_reason: "régi",
      }),
      mapSupplier({ _id: "s1", name: "Supplier Zrt." }),
    ];
    const first = await upsertPartnerek(rows);
    const second = await upsertPartnerek(rows);
    expect(first).toEqual({ created: 2, updated: 0 });
    expect(second).toEqual({ created: 0, updated: 2 });
    const all = await partnerApi.listPartnerek(
      { page: 1, pageSize: 50 },
      { archivaltakkal: true },
    );
    expect(all.total).toBe(2);
    expect(all.data.map((p) => p.azonosito).sort()).toEqual(["P-000001", "P-000002"]);
  });

  it("leads migrate once with history and activities", async () => {
    const ctx = {
      userId: () => undefined,
      partnerId: () => undefined,
      fallbackUserId: fallback,
    };
    const rows = [
      mapLead(
        {
          _id: "l1",
          company_name: "Lead Kft.",
          status: "won",
          activities: [{ type: "note", user_id: "x", user_name: "A", text: "n" }],
        },
        ctx,
      ),
    ];
    expect(await upsertErdeklodok(rows, fallback)).toEqual({ created: 1, updated: 0 });
    expect(await upsertErdeklodok(rows, fallback)).toEqual({ created: 0, updated: 1 });
    const list = await partnerApi.listErdeklodok({ page: 1, pageSize: 50 });
    expect(list.total).toBe(1);
    const d = await partnerApi.getErdeklodo(list.data[0]!._id);
    expect(d?.allapot).toBe("megnyert");
    expect(d?.tevekenysegek).toHaveLength(1);
  });
});
