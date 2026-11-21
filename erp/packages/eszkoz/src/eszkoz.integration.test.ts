import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import { createTestMongo } from "@erp/test-utils/mongo-memory";
import { connectDB, User } from "@erp/db-core";
import { eszkozApi } from "./api";
import { Eszkoz } from "./models/Eszkoz";
import { EszkozMozgas } from "./models/EszkozMozgas";

let mongo: MongoMemoryServer;

async function felhasznalo(name: string, isActive = true) {
  const u = await User.create({
    email: `${name.toLowerCase()}@example.com`,
    name,
    roleIds: [],
    isActive,
  });
  return String(u._id);
}

async function ujEszkoz(actor: string, megnevezes = "Fúrógép") {
  const r = await eszkozApi.createEszkoz(
    { megnevezes, marka: "Bosch", fizikaiAllapot: "uj" },
    actor,
  );
  if (!r.ok || !r.id) throw new Error("create failed");
  return r.id;
}

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
  await mongo.stop();
});

describe("eszkozApi", () => {
  it("full lifecycle writes the movement log and notifies the recipient", async () => {
    const admin = await felhasznalo("Admin");
    const bela = await felhasznalo("Bela");
    const id = await ujEszkoz(admin);

    const ki = await eszkozApi.checkOut(id, bela, "Építkezésre", admin);
    expect(ki.ok).toBe(true);
    if (ki.ok) {
      expect(ki.ertesitesek).toHaveLength(1);
      expect(ki.ertesitesek[0]!.userIds).toEqual([bela]);
    }
    let d = await eszkozApi.getEszkoz(id);
    expect(d?.allapot).toBe("kiadva");
    expect(d?.birtokosId).toBe(bela);

    expect((await eszkozApi.checkIn(id, "megfelelo", undefined, admin)).ok).toBe(true);
    d = await eszkozApi.getEszkoz(id);
    expect(d?.allapot).toBe("raktaron");
    expect(d?.birtokosId).toBeUndefined();
    expect(d?.fizikaiAllapot).toBe("megfelelo");

    expect((await eszkozApi.startMaintenance(id, "Szénkefe", admin)).ok).toBe(true);
    expect((await eszkozApi.endMaintenance(id, undefined, admin, "jo")).ok).toBe(true);
    expect((await eszkozApi.markLost(id, undefined, admin)).ok).toBe(true);
    expect((await eszkozApi.retire(id, undefined, admin)).ok).toBe(true);

    d = await eszkozApi.getEszkoz(id);
    expect(d?.allapot).toBe("kivonva");
    expect(d?.mozgasok.map((m) => m.tipus).reverse()).toEqual([
      "kiadas",
      "visszavetel",
      "szerviz_kezdete",
      "szerviz_vege",
      "elveszett",
      "kivonas",
    ]);
    expect(d?.mozgasok.at(-1)?.celNev).toBe("Bela");
  });

  it("enforces invariants", async () => {
    const admin = await felhasznalo("Admin");
    const bela = await felhasznalo("Bela");
    const inaktiv = await felhasznalo("Ina", false);
    const id = await ujEszkoz(admin);

    expect((await eszkozApi.checkIn(id, "jo", undefined, admin)).ok).toBe(false);
    expect((await eszkozApi.endMaintenance(id, undefined, admin)).ok).toBe(false);
    expect((await eszkozApi.checkOut(id, inaktiv, undefined, admin)).ok).toBe(false);
    expect((await eszkozApi.checkOut(id, bela, undefined, admin)).ok).toBe(true);
    expect((await eszkozApi.checkOut(id, admin, undefined, admin)).ok).toBe(false);

    await eszkozApi.retire(id, undefined, admin);
    for (const r of [
      await eszkozApi.checkOut(id, bela, undefined, admin),
      await eszkozApi.checkIn(id, "jo", undefined, admin),
      await eszkozApi.startMaintenance(id, undefined, admin),
      await eszkozApi.markLost(id, undefined, admin),
      await eszkozApi.retire(id, undefined, admin),
    ]) {
      expect(r.ok).toBe(false);
    }
    expect(
      (await eszkozApi.updateEszkoz(id, { megnevezes: "X", fizikaiAllapot: "jo" })).ok,
    ).toBe(false);
  });

  it("concurrent double check-out: exactly one wins", async () => {
    const admin = await felhasznalo("Admin");
    const a = await felhasznalo("Aron");
    const b = await felhasznalo("Bela");
    const id = await ujEszkoz(admin);

    const results = await Promise.all([
      eszkozApi.checkOut(id, a, undefined, admin),
      eszkozApi.checkOut(id, b, undefined, admin),
    ]);
    expect(results.filter((r) => r.ok)).toHaveLength(1);
    expect(await EszkozMozgas.countDocuments({ eszkozId: id, tipus: "kiadas" })).toBe(1);
    const doc = await Eszkoz.findById(id).lean();
    expect(doc?.statusHistory.filter((s) => s.key === "kiadva")).toHaveLength(1);
  });

  it("listMyAssignments returns held tools as assignments", async () => {
    const admin = await felhasznalo("Admin");
    const bela = await felhasznalo("Bela");
    const id = await ujEszkoz(admin);
    await ujEszkoz(admin, "Fűrész");
    await eszkozApi.checkOut(id, bela, undefined, admin);

    const refs = await eszkozApi.listMyAssignments(bela);
    expect(refs).toHaveLength(1);
    expect(refs[0]).toMatchObject({ module: "eszkoz", kind: "assignment", entityId: id });
    await eszkozApi.checkIn(id, "jo", undefined, admin);
    expect(await eszkozApi.listMyAssignments(bela)).toHaveLength(0);
  });

  it("delete only without history, and the log is append-only", async () => {
    const admin = await felhasznalo("Admin");
    const bela = await felhasznalo("Bela");
    const tiszta = await ujEszkoz(admin, "Tiszta");
    expect((await eszkozApi.deleteEszkoz(tiszta)).ok).toBe(true);

    const id = await ujEszkoz(admin);
    await eszkozApi.checkOut(id, bela, undefined, admin);
    const r = await eszkozApi.deleteEszkoz(id);
    expect(r.ok).toBe(false);
    expect(await Eszkoz.exists({ _id: id })).not.toBeNull();

    await expect(EszkozMozgas.deleteMany({})).rejects.toThrow();
    await expect(
      EszkozMozgas.updateOne({ eszkozId: id }, { jegyzet: "x" }),
    ).rejects.toThrow();
  });

  it("summary counts and duplicate gyári szám", async () => {
    const admin = await felhasznalo("Admin");
    const bela = await felhasznalo("Bela");
    const a = await ujEszkoz(admin, "A");
    const b = await ujEszkoz(admin, "B");
    await ujEszkoz(admin, "C");
    await eszkozApi.checkOut(a, bela, undefined, admin);
    await eszkozApi.startMaintenance(b, undefined, admin);
    expect(await eszkozApi.getOsszegzes()).toEqual({
      osszes: 3,
      kiadva: 1,
      szervizben: 1,
      elveszett: 0,
    });

    expect(
      (
        await eszkozApi.updateEszkoz(a, {
          megnevezes: "A",
          gyariSzam: "SN1",
          fizikaiAllapot: "jo",
        })
      ).ok,
    ).toBe(true);
    const dup = await eszkozApi.createEszkoz(
      { megnevezes: "D", gyariSzam: "SN1", fizikaiAllapot: "jo" },
      admin,
    );
    expect(dup.ok).toBe(false);
  });
});
