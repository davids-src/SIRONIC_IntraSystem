// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import { connectDB, User } from "@erp/db-core";
import { arlistaApi } from "@erp/arlista";
import { createTermekSchema } from "@erp/arlista/validation";
import { keszletApi } from "@erp/keszlet";
import { globalisKereses } from "./kereses";

let mongo: MongoMemoryServer;

beforeAll(async () => {
  mongo = await MongoMemoryServer.create({ instance: { launchTimeout: 120_000 } });
  process.env.MONGODB_URI = mongo.getUri();
  process.env.MONGODB_DB_NAME = "sironic_erp_kereses";
  await connectDB();
}, 120_000);

afterAll(async () => {
  await mongoose.disconnect();
  if (mongo) await mongo.stop();
});

describe("globális keresés valódi adattal", () => {
  it("megtalálja a terméket és a készlettételt, csak olvasási joggal, korlátozott számban", async () => {
    const u = await User.create({
      email: "k@x.hu",
      name: "K",
      passwordHash: "x",
      isActive: true,
    } as never);
    const actor = String(u._id);
    let elsoId = "";
    for (let i = 0; i < 8; i++) {
      const t = await arlistaApi.createTermek(
        createTermekSchema.parse({
          nev: `Dóm kamera ${i}`,
          kategoria: "Kamera",
          egyseg: "db",
          nettoAr: 1000,
        }),
      );
      if (!t.ok || !t.id) throw new Error("termék");
      if (i === 0) elsoId = t.id;
    }
    await keszletApi.bevetelez(
      [
        {
          arlistaTermekId: elsoId,
          mennyiseg: 3,
          termek: { nev: "Dóm kamera 0", kod: "K-0", egyseg: "db" },
        },
      ],
      { referenceType: "kezi", referenceId: "seed" },
      actor,
    );

    const mind = await globalisKereses("kamera", {
      userId: actor,
      permissions: ["arlista:termek:read", "keszlet:keszlet:read"],
    });
    const arlista = mind.find((c) => c.modul === "arlista");
    expect(arlista?.talalatok.length).toBe(5); // korlátozva
    expect(arlista?.talalatok[0]?.url).toMatch(/^\/arlista\/termekek\//);
    expect(mind.find((c) => c.modul === "keszlet")?.talalatok).toHaveLength(1);

    const csakKeszlet = await globalisKereses("kamera", {
      userId: actor,
      permissions: ["keszlet:keszlet:read"],
    });
    expect(csakKeszlet.map((c) => c.modul)).toEqual(["keszlet"]);

    expect(await globalisKereses("kamera", { userId: actor, permissions: [] })).toEqual(
      [],
    );
  });
});
