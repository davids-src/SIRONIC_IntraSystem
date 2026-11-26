// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import { connectDB, User } from "@erp/db-core";
import { szervizApi } from "@erp/szerviz";
import { DASHBOARD_PROVIDERS, loadDashboard } from "./dashboard";

let mongo: MongoMemoryServer;

beforeAll(async () => {
  mongo = await MongoMemoryServer.create({ instance: { launchTimeout: 120_000 } });
  process.env.MONGODB_URI = mongo.getUri();
  process.env.MONGODB_DB_NAME = "sironic_erp_dashboard";
  await connectDB();
}, 120_000);

afterAll(async () => {
  await mongoose.disconnect();
  if (mongo) await mongo.stop();
});

const ALL = [...new Set(DASHBOARD_PROVIDERS.flatMap((p) => [p.permission].flat()))];

describe("vezérlőpult szolgáltatók", () => {
  it("jogosultság nélkül semmit nem mutat", async () => {
    const d = await loadDashboard({ userId: "u", permissions: [] });
    expect(d).toEqual({ tiles: [], activity: [], quickActions: [] });
  });

  it("minden modul csempét ad a saját olvasási jogával, és csak azzal", async () => {
    for (const p of DASHBOARD_PROVIDERS) {
      const d = await loadDashboard({
        userId: "u",
        permissions: [p.permission].flat(),
      });
      expect(d.tiles.length, String(p.permission)).toBeGreaterThan(0);
    }
    const mind = await loadDashboard({ userId: "u", permissions: ALL });
    const cimkek = mind.tiles.map((t) => t.label);
    expect(new Set(cimkek).size).toBe(cimkek.length);
    expect(cimkek).toEqual(
      expect.arrayContaining(["Partnerek", "Nyitott hibajegyek", "Lejárt számlák"]),
    );
  });

  it("a gyors művelet külön írási jogot kér, a tevékenység a státuszváltásból jön", async () => {
    const u = await User.create({
      email: "d@x.hu",
      name: "D",
      passwordHash: "x",
      isActive: true,
    } as never);
    const r = await szervizApi.createHibajegy(
      {
        targy: "Nem működik",
        leiras: "Leírás",
        partnerId: "pA",
        forras: "telefon",
        kategoria: "Általános",
        prioritas: "kozepes",
      } as never,
      { partnerNev: "Partner pA" },
      { id: String(u._id), nev: "D" },
    );
    expect(r.ok).toBe(true);

    const olvas = await loadDashboard({
      userId: String(u._id),
      permissions: ["szerviz:hibajegy:read"],
    });
    expect(olvas.quickActions).toEqual([]);
    expect(olvas.activity).toHaveLength(1);
    expect(olvas.activity[0]).toMatchObject({
      module: "szerviz",
      changedBy: String(u._id),
    });
    const ir = await loadDashboard({
      userId: String(u._id),
      permissions: ["szerviz:hibajegy:read", "szerviz:hibajegy:write"],
    });
    expect(ir.quickActions.map((a) => a.href)).toEqual(["/szerviz/hibajegyek/new"]);
  });
});
