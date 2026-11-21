import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import { createTestMongo } from "@erp/test-utils/mongo-memory";
import { connectDB, getNativeClient, User } from "@erp/db-core";
import { budapestNap } from "@erp/lib/utils";
import { feladatApi } from "./api";
import { feladatUzenetApi } from "./api-uzenet";
import type { FeladatViewer } from "./constants";
import { Feladat } from "./models/Feladat";
import { ujFeladatSchema, feladatModositasSchema } from "./validation";

/** The shared task chat, text editing and the required kategória (#68). */

let mongo: MongoMemoryServer;

async function fiok(name: string, permissions: string[] = []) {
  const user = await User.create({
    email: `${name.split(" ")[0]!.toLowerCase()}@example.com`,
    name,
    roleIds: [],
    isActive: true,
  });
  return { id: String(user._id), permissions };
}

const v = (f: { id: string; permissions: string[] }): FeladatViewer => ({
  userId: f.id,
  permissions: f.permissions,
});
const nap = (n: number) => budapestNap(new Date(Date.now() + n * 86_400_000));

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

async function csoportos() {
  const bela = await fiok("Nagy Béla");
  const anna = await fiok("Kiss Anna");
  const cili = await fiok("Tóth Cili");
  const r = await feladatApi.createFeladat(v(bela), {
    felelosIds: [anna.id, cili.id],
    elsodlegesId: anna.id,
    cim: "Raktár leltár",
    hatarido: nap(3),
    kategoria: "Raktár",
  });
  const peldany = (userId: string) =>
    r.peldanyok!.find((p) => p.felelosId === userId)!.id;
  return { bela, anna, cili, annaId: peldany(anna.id), ciliId: peldany(cili.id) };
}

describe("közös beszélgetés (#68)", () => {
  it("is one thread for every copy of a group task — everyone reads everyone", async () => {
    const { bela, anna, cili, annaId, ciliId } = await csoportos();

    const k = await feladatUzenetApi.kuldUzenet(v(anna), annaId, {
      szoveg: "A hátsó polcot én viszem",
    });
    expect(k.ok).toBe(true);
    // Everyone else is notified on their own copy; the author is not.
    expect(k.cimzettek).toEqual(
      expect.arrayContaining([
        { userId: cili.id, feladatId: ciliId },
        { userId: bela.id, feladatId: expect.any(String) },
      ]),
    );
    expect(k.cimzettek!.some((c) => c.userId === anna.id)).toBe(false);

    await feladatUzenetApi.kuldUzenet(v(cili), ciliId, {
      szoveg: "Rendben, én az elsőt",
    });
    await feladatUzenetApi.kuldUzenet(v(bela), annaId, {
      szoveg: "Köszönöm mindkettőtöknek",
    });

    for (const [viewer, id] of [
      [cili, ciliId],
      [anna, annaId],
      [bela, ciliId],
    ] as const) {
      const szal = await feladatUzenetApi.getFeladatSzal(v(viewer), id);
      expect(szal!.uzenetek.map((u) => u.szoveg)).toEqual([
        "A hátsó polcot én viszem",
        "Rendben, én az elsőt",
        "Köszönöm mindkettőtöknek",
      ]);
      expect(szal!.irhat).toBe(true);
      expect(szal!.resztvevok.map((r) => r.nev).sort()).toEqual([
        "Kiss Anna",
        "Nagy Béla",
        "Tóth Cili",
      ]);
    }
    const annae = await feladatUzenetApi.getFeladatSzal(v(anna), annaId);
    expect(annae!.uzenetek[0]!.sajat).toBe(true);
    expect(annae!.uzenetek[1]!.sajat).toBe(false);
  });

  it("notifies the mentioned participant separately and validates the reply target", async () => {
    const { bela, anna, cili, annaId, ciliId } = await csoportos();
    const elso = await feladatUzenetApi.kuldUzenet(v(bela), annaId, {
      szoveg: "Hol tartotok?",
    });

    const k = await feladatUzenetApi.kuldUzenet(v(anna), annaId, {
      szoveg: "@Tóth Cili nézd meg a polcot",
      valaszId: elso.uzenetId,
    });
    expect(k.ok).toBe(true);
    expect(k.emlitettek).toEqual([{ userId: cili.id, feladatId: ciliId }]);
    expect(k.cimzettek!.map((c) => c.userId)).toEqual([bela.id]);

    const szal = await feladatUzenetApi.getFeladatSzal(v(cili), ciliId);
    const valasz = szal!.uzenetek[1]!;
    expect(valasz.emlitettIds).toEqual([cili.id]);
    expect(valasz.valasz).toMatchObject({
      id: elso.uzenetId,
      szerzoNev: "Nagy Béla",
      szoveg: "Hol tartotok?",
    });

    // A reply must point into the same thread.
    const mas = await feladatApi.createFeladat(v(bela), {
      felelosIds: [anna.id],
      cim: "Másik",
      hatarido: nap(2),
      kategoria: "Raktár",
    });
    const idegen = await feladatUzenetApi.kuldUzenet(v(bela), mas.id, {
      szoveg: "Más szál",
    });
    const rossz = await feladatUzenetApi.kuldUzenet(v(anna), annaId, {
      szoveg: "Válasz",
      valaszId: idegen.uzenetId,
    });
    expect(rossz).toMatchObject({
      ok: false,
      message: "A válaszolt üzenet nem található",
    });
  });

  it("lets only the author edit or delete a message; a deleted one stays as a placeholder", async () => {
    const { bela, anna, cili, annaId, ciliId } = await csoportos();
    const k = await feladatUzenetApi.kuldUzenet(v(anna), annaId, {
      szoveg: "Holnap kezdek",
    });

    expect(
      await feladatUzenetApi.modositUzenet(v(cili), k.uzenetId!, "Hamisítás"),
    ).toMatchObject({
      ok: false,
      message: "Csak a saját üzenetedet módosíthatod",
    });
    expect(await feladatUzenetApi.torolUzenet(v(bela), k.uzenetId!)).toMatchObject({
      ok: false,
    });

    const m = await feladatUzenetApi.modositUzenet(
      v(anna),
      k.uzenetId!,
      "Ma kezdek, @Tóth Cili segít",
    );
    expect(m.ok).toBe(true);
    // A mention added by an edit notifies the newly mentioned person.
    expect(m.ujEmlitettek).toEqual([{ userId: cili.id, feladatId: ciliId }]);
    let u = (await feladatUzenetApi.getFeladatSzal(v(cili), ciliId))!.uzenetek[0]!;
    expect(u).toMatchObject({ szoveg: "Ma kezdek, @Tóth Cili segít", torolt: false });
    expect(u.szerkesztve).toBeTruthy();

    expect((await feladatUzenetApi.torolUzenet(v(anna), k.uzenetId!)).ok).toBe(true);
    u = (await feladatUzenetApi.getFeladatSzal(v(cili), ciliId))!.uzenetek[0]!;
    expect(u).toMatchObject({ torolt: true, szoveg: "" });
    expect(
      await feladatUzenetApi.modositUzenet(v(anna), k.uzenetId!, "Vissza"),
    ).toMatchObject({
      ok: false,
    });
  });

  it("keeps one thread across a handover, and outsiders can neither read nor write", async () => {
    const bela = await fiok("Nagy Béla");
    const anna = await fiok("Kiss Anna");
    const dani = await fiok("Kovács Dani");
    const kivulallo = await fiok("Idegen Ede");
    const { id } = await feladatApi.createFeladat(v(bela), {
      felelosIds: [anna.id],
      cim: "Ajánlat",
      hatarido: nap(3),
      kategoria: "Beszerzés",
    });
    await feladatApi.dontFeladatrol(v(anna), id, { elfogad: true });
    await feladatUzenetApi.kuldUzenet(v(anna), id, { szoveg: "Elkezdtem" });
    const t = await feladatApi.tovabbadFeladatot(v(anna), id, {
      celId: dani.id,
      indok: "Szabadságra megyek",
    });
    expect(t.ok).toBe(true);
    const ujId = t.feladat!.id;

    const szal = await feladatUzenetApi.getFeladatSzal(v(dani), ujId);
    expect(szal!.uzenetek.map((u) => u.szoveg)).toEqual(["Elkezdtem"]);
    expect(szal!.irhat).toBe(true);
    expect(
      (await feladatUzenetApi.kuldUzenet(v(dani), ujId, { szoveg: "Átvettem" })).ok,
    ).toBe(true);
    expect(
      (await feladatUzenetApi.getFeladatSzal(v(bela), ujId))!.uzenetek.map(
        (u) => u.szoveg,
      ),
    ).toEqual(["Elkezdtem", "Átvettem"]);

    expect(await feladatUzenetApi.getFeladatSzal(v(kivulallo), ujId)).toBeNull();
    expect(
      (await feladatUzenetApi.kuldUzenet(v(kivulallo), ujId, { szoveg: "Hahó" })).ok,
    ).toBe(false);
  });

  it("is read-only once the task is closed", async () => {
    const bela = await fiok("Nagy Béla");
    const anna = await fiok("Kiss Anna");
    const { id } = await feladatApi.createFeladat(v(bela), {
      felelosIds: [anna.id],
      cim: "Lezárandó",
      hatarido: nap(1),
      kategoria: "Egyéb",
    });
    await feladatApi.dontFeladatrol(v(anna), id, { elfogad: true });
    await feladatApi.lezarFeladatot(v(anna), id);
    const szal = await feladatUzenetApi.getFeladatSzal(v(anna), id);
    expect(szal!.irhat).toBe(false);
    expect(
      await feladatUzenetApi.kuldUzenet(v(anna), id, { szoveg: "Még valami" }),
    ).toMatchObject({
      ok: false,
      message: "A feladat le van zárva — már nem lehet írni",
    });
  });

  it("shows the old per-copy comments of a group only to the people who could see them", async () => {
    const { bela, anna, cili, annaId, ciliId } = await csoportos();
    await feladatApi.addFeladatMegjegyzes(v(anna), annaId, "Régi privát üzenet Bélának");

    const annae = await feladatUzenetApi.getFeladatSzal(v(anna), annaId);
    expect(annae!.uzenetek.map((u) => u.szoveg)).toContain("Régi privát üzenet Bélának");
    expect(annae!.uzenetek.find((u) => u.regi)?.cimke).toMatch(/korábbi üzenet/);
    const belae = await feladatUzenetApi.getFeladatSzal(v(bela), ciliId);
    expect(belae!.uzenetek.map((u) => u.szoveg)).toContain("Régi privát üzenet Bélának");
    // Cili never saw Anna's private thread — and still doesn't.
    const cilie = await feladatUzenetApi.getFeladatSzal(v(cili), ciliId);
    expect(cilie!.uzenetek.map((u) => u.szoveg)).not.toContain(
      "Régi privát üzenet Bélának",
    );
  });

  it('registers the read receipt as "Látta"', async () => {
    const { bela, anna, annaId, ciliId, cili } = await csoportos();
    await feladatUzenetApi.kuldUzenet(v(bela), annaId, { szoveg: "Kérdés" });
    await feladatUzenetApi.getFeladatSzal(v(cili), ciliId, { olvasott: true });
    const szal = await feladatUzenetApi.getFeladatSzal(v(anna), annaId);
    expect(szal!.latta.map((l) => l.nev)).toEqual(["Tóth Cili"]);
  });
});

describe("szöveg javítása (#68)", () => {
  it("only the kiadó edits title and description — on every copy, logged, felelősök returned", async () => {
    const { bela, anna, cili, annaId, ciliId } = await csoportos();
    expect(
      await feladatUzenetApi.modositFeladatSzoveget(v(anna), annaId, { cim: "Más" }),
    ).toMatchObject({
      ok: false,
      message: "A feladat szövegét a kiadója módosíthatja",
    });

    const r = await feladatUzenetApi.modositFeladatSzoveget(v(bela), annaId, {
      cim: "Raktár leltár — hátsó polcok",
      leiras: "A létra a műhelyben van",
    });
    expect(r.ok).toBe(true);
    expect(r.mi).toEqual(["cím", "leírás"]);
    expect(r.celok).toEqual(
      expect.arrayContaining([
        { userId: anna.id, feladatId: annaId },
        { userId: cili.id, feladatId: ciliId },
      ]),
    );
    for (const id of [annaId, ciliId]) {
      const f = await Feladat.findById(id).lean();
      expect(f).toMatchObject({
        cim: "Raktár leltár — hátsó polcok",
        leiras: "A létra a műhelyben van",
      });
      expect(f!.statusHistory.at(-1)!.note).toMatch(
        /^Szöveg javítva: cím: „Raktár leltár” → /,
      );
    }
    expect(
      await feladatUzenetApi.modositFeladatSzoveget(v(bela), annaId, {
        cim: "Raktár leltár — hátsó polcok",
      }),
    ).toMatchObject({ ok: false, message: "Nem változott semmi" });
  });
});

describe("kötelező kategória (#68)", () => {
  const alap = { felelosIds: ["x"], cim: "Valami", hatarido: "2026-12-01" };

  it("a new task needs a kategória", () => {
    expect(ujFeladatSchema.safeParse(alap).success).toBe(false);
    expect(
      ujFeladatSchema.safeParse({ ...alap, kategoria: "   " }).error?.issues[0]?.message,
    ).toMatch(/Adj meg kategóriát/);
    expect(ujFeladatSchema.safeParse({ ...alap, kategoria: "Beszerzés" }).success).toBe(
      true,
    );
  });

  it("an edit may leave the kategória alone but not clear it", () => {
    expect(feladatModositasSchema.safeParse({ prioritas: "magas" }).success).toBe(true);
    expect(feladatModositasSchema.safeParse({ kategoria: "" }).success).toBe(false);
    expect(feladatModositasSchema.safeParse({ kategoria: "Raktár" }).success).toBe(true);
  });

  it("linked tasks still get their module default without a kategória from the user", async () => {
    const bela = await fiok("Nagy Béla");
    const r = await feladatApi.createKapcsoltFeladat({
      kiadoId: bela.id,
      felelosId: bela.id,
      cim: "Szerviz lépés",
      hatarido: nap(1),
      kapcsolat: {
        modul: "gepeszet",
        tipus: "szervizjegy",
        id: "x1",
        url: "/gepeszet/szervizjegyek/x1",
      },
    });
    expect(r.id).toBeTruthy();
    // A task without a category (old or linked) stays valid and openable.
    expect(await feladatApi.getFeladat(v(bela), r.id)).not.toBeNull();
  });
});
