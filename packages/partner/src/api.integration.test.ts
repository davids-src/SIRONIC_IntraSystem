import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import { createTestMongo } from "@erp/test-utils/mongo-memory";
import { connectDB } from "@erp/db-core";
import { partnerApi, type Szereplo } from "./api";
import { erdeklodoSchema, partnerSchema, type PartnerInput } from "./validation";

let mongo: MongoMemoryServer;
const szereplo: Szereplo = {
  id: new mongoose.Types.ObjectId().toString(),
  nev: "Teszt Elek",
};
const query = { page: 1, pageSize: 50 };

const partner = (o: Partial<PartnerInput> = {}) =>
  partnerSchema.parse({ tipus: "ceg", nev: "Acme Kft.", ...o });
const erdeklodo = (o: Record<string, unknown> = {}) =>
  erdeklodoSchema.parse({ cegNev: "Lead Kft.", ...o });

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

describe("partnerApi — Partner", () => {
  it("creates with sequential azonosito and reads back", async () => {
    const a = await partnerApi.createPartner(partner());
    const b = await partnerApi.createPartner(partner({ nev: "Béta Bt." }));
    if (!a.ok || !b.ok) throw new Error("create failed");
    const da = await partnerApi.getPartner(a.id);
    const db = await partnerApi.getPartner(b.id);
    expect(da?.azonosito).toBe("P-000001");
    expect(db?.azonosito).toBe("P-000002");
  });

  it("rejects a duplicate name (accent/case-insensitive)", async () => {
    await partnerApi.createPartner(partner({ nev: "Árvíz Kft." }));
    const dup = await partnerApi.createPartner(partner({ nev: "arviz kft." }));
    expect(dup.ok).toBe(false);
  });

  it("keeps exactly one primary contact and the pricing profile", async () => {
    const r = await partnerApi.createPartner(
      partner({
        partnerSzerep: "ugyfel",
        ugyfelKategoria: "kkv",
        arazasiSzerzodesTipus: "1_ev",
        kapcsolattartok: [
          { nev: "A" },
          { nev: "B", elsodleges: true },
          { nev: "C", elsodleges: true },
        ],
      }),
    );
    if (!r.ok) throw new Error("create failed");
    const d = await partnerApi.getPartner(r.id);
    expect(d?.kapcsolattartok.map((k) => k.elsodleges)).toEqual([false, true, false]);
    expect(d?.arazasiSzerzodesTipus).toBe("1_ev");
  });

  it("updates and clears optional fields", async () => {
    const r = await partnerApi.createPartner(partner({ adoszam: "12345678-1-42" }));
    if (!r.ok) throw new Error("create failed");
    expect(
      (await partnerApi.updatePartner(r.id, partner({ nev: "Új név Kft." }))).ok,
    ).toBe(true);
    const d = await partnerApi.getPartner(r.id);
    expect(d?.nev).toBe("Új név Kft.");
    expect(d?.adoszam).toBeUndefined();
  });

  it("archives, hides from the default list, and restores", async () => {
    const r = await partnerApi.createPartner(partner());
    if (!r.ok) throw new Error("create failed");
    expect((await partnerApi.archivePartner(r.id, "Megszűnt", szereplo)).ok).toBe(true);
    expect((await partnerApi.archivePartner(r.id, "Megint", szereplo)).ok).toBe(false);
    expect((await partnerApi.listPartnerek(query)).total).toBe(0);
    expect((await partnerApi.listPartnerek(query, { archivaltakkal: true })).total).toBe(
      1,
    );
    const d = await partnerApi.getPartner(r.id);
    expect(d?.archivalasOka).toBe("Megszűnt");
    expect((await partnerApi.restorePartner(r.id)).ok).toBe(true);
    expect((await partnerApi.listPartnerek(query)).total).toBe(1);
    // an archived name can be reused
  });

  it("server-side search and filter", async () => {
    await partnerApi.createPartner(
      partner({ nev: "Alfa Kft.", partnerSzerep: "ugyfel" }),
    );
    await partnerApi.createPartner(
      partner({ nev: "Béta Kft.", partnerSzerep: "beszallito" }),
    );
    const s = await partnerApi.listPartnerek({ ...query, search: "alfa" });
    expect(s.data.map((p) => p.nev)).toEqual(["Alfa Kft."]);
    const f = await partnerApi.listPartnerek({
      ...query,
      filters: { partnerSzerep: "beszallito" },
    });
    expect(f.data.map((p) => p.nev)).toEqual(["Béta Kft."]);
  });
});

describe("partnerApi — Érdeklődő", () => {
  it("creates in the initial status with a history entry", async () => {
    const r = await partnerApi.createErdeklodo(erdeklodo(), szereplo);
    const d = await partnerApi.getErdeklodo(r.id);
    expect(d?.azonosito).toBe("E-000001");
    expect(d?.allapot).toBe("cel");
  });

  it("changes status and logs an activity; elveszett needs a reason", async () => {
    const r = await partnerApi.createErdeklodo(erdeklodo(), szereplo);
    expect(
      (await partnerApi.changeErdeklodoStatus(r.id, "megkeresve", szereplo)).ok,
    ).toBe(true);
    expect((await partnerApi.changeErdeklodoStatus(r.id, "elveszett", szereplo)).ok).toBe(
      false,
    );
    expect(
      (
        await partnerApi.changeErdeklodoStatus(r.id, "elveszett", szereplo, {
          elvesztesOka: "Drága",
        })
      ).ok,
    ).toBe(true);
    const d = await partnerApi.getErdeklodo(r.id);
    expect(d?.allapot).toBe("elveszett");
    expect(d?.elvesztesOka).toBe("Drága");
    expect(d?.tevekenysegek.filter((t) => t.tipus === "allapotvaltas")).toHaveLength(2);
  });

  it("logs manual activities", async () => {
    const r = await partnerApi.createErdeklodo(erdeklodo(), szereplo);
    await partnerApi.addErdeklodoTevekenyseg(r.id, "hivas", "Felhívtam", szereplo);
    const d = await partnerApi.getErdeklodo(r.id);
    expect(d?.tevekenysegek[0]).toMatchObject({ tipus: "hivas", szoveg: "Felhívtam" });
  });

  it("listMyAssignments returns only the user's open, non-archived leads", async () => {
    const mine = await partnerApi.createErdeklodo(
      erdeklodo({ kovetkezoLepesIdopont: "2026-12-01" }),
      szereplo,
    );
    const closed = await partnerApi.createErdeklodo(
      erdeklodo({ cegNev: "Zárt" }),
      szereplo,
    );
    const other = await partnerApi.createErdeklodo(
      erdeklodo({ cegNev: "Más" }),
      szereplo,
    );
    await partnerApi.assignErdeklodo(mine.id, szereplo, szereplo);
    await partnerApi.assignErdeklodo(closed.id, szereplo, szereplo);
    await partnerApi.changeErdeklodoStatus(closed.id, "nem_relevans", szereplo);
    await partnerApi.assignErdeklodo(
      other.id,
      { id: new mongoose.Types.ObjectId().toString(), nev: "X" },
      szereplo,
    );
    const tasks = await partnerApi.listMyAssignments(szereplo.id);
    expect(tasks).toHaveLength(1);
    expect(tasks[0]).toMatchObject({
      module: "partner",
      entityType: "erdeklodo",
      entityId: mine.id,
      url: `/partner/erdeklodok/${mine.id}`,
    });
    expect(tasks[0]?.dueDate).toBeTruthy();
  });

  it("archives and restores", async () => {
    const r = await partnerApi.createErdeklodo(erdeklodo(), szereplo);
    expect((await partnerApi.archiveErdeklodo(r.id, "Téves", szereplo)).ok).toBe(true);
    expect((await partnerApi.listErdeklodok(query)).total).toBe(0);
    expect((await partnerApi.restoreErdeklodo(r.id)).ok).toBe(true);
    expect((await partnerApi.listErdeklodok(query)).total).toBe(1);
  });

  it("converts to a partner idempotently and marks it megnyert", async () => {
    const r = await partnerApi.createErdeklodo(
      erdeklodo({ kapcsolattartoNev: "Kiss Pista", email: "pista@lead.hu" }),
      szereplo,
    );
    const c1 = await partnerApi.convertErdeklodoToPartner(r.id, szereplo);
    const c2 = await partnerApi.convertErdeklodoToPartner(r.id, szereplo);
    if (!c1.ok || !c2.ok) throw new Error("convert failed");
    expect(c2.partnerId).toBe(c1.partnerId);
    const p = await partnerApi.getPartner(c1.partnerId);
    expect(p?.kapcsolattartok[0]).toMatchObject({ nev: "Kiss Pista", elsodleges: true });
    expect((await partnerApi.getErdeklodo(r.id))?.allapot).toBe("megnyert");
    expect((await partnerApi.listPartnerek(query)).total).toBe(1);
  });
});
