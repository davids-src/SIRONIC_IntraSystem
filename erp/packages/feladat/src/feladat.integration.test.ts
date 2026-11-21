import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import { createTestMongo } from "@erp/test-utils/mongo-memory";
import { connectDB, getNativeClient, User } from "@erp/db-core";
import { budapestNap } from "@erp/lib/utils";
import { feladatApi as hrApi } from "./api";
import { FELADAT_PERMISSIONS, type FeladatViewer } from "./constants";
import { Feladat } from "./models/Feladat";
import {
  clearKapcsoltFeladatHooks,
  registerKapcsoltFeladatHook,
  type KapcsoltFeladatEsemeny,
} from "./hooks";

let mongo: MongoMemoryServer;

/** A plain account — no HR record, no permission keys: anyone may give and take tasks. */
async function fiok(name: string, permissions: string[] = [], isActive = true) {
  const user = await User.create({
    email: `${name.split(" ")[0]!.toLowerCase()}@example.com`,
    name,
    roleIds: [],
    isActive,
  });
  return { id: String(user._id), permissions };
}

const nap = (eltolasNap: number) =>
  budapestNap(new Date(Date.now() + eltolasNap * 86_400_000));

beforeAll(async () => {
  mongo = await createTestMongo();
  process.env.MONGODB_URI = mongo.getUri();
  await connectDB();
});

afterEach(async () => {
  clearKapcsoltFeladatHooks();
  await mongoose.connection.dropDatabase();
});

afterAll(async () => {
  await getNativeClient().close();
  await mongoose.disconnect();
  if (mongo) await mongo.stop();
});

const v = (f: { id: string; permissions: string[] }): FeladatViewer => ({
  userId: f.id,
  permissions: f.permissions,
});

describe("feladatok (7e)", () => {
  it("goes from kiadó to felelős: accept, comment both ways, close — with a full status log", async () => {
    const bela = await fiok("Nagy Béla");
    const anna = await fiok("Kiss Anna");

    const { id, message } = await hrApi.createFeladat(v(bela), {
      felelosIds: [anna.id],
      cim: "Raktár leltár",
      leiras: "A hátsó polcokat is",
      hatarido: nap(3),
    });
    expect(message).toBeUndefined();

    // Anna sees it in Saját feladataim and on her "kapott" list, waiting for her.
    const tasks = await hrApi.listMyAssignments(anna.id);
    const task = tasks.find((t) => t.entityType === "feladat");
    expect(task).toMatchObject({
      module: "feladat",
      entityId: id,
      title: "Feladat: Raktár leltár — Nagy Béla adta",
      status: "Elfogadásra vár",
      url: `/feladatok/${id}`,
    });
    const [kapott] = await hrApi.listFeladatok(v(anna), {
      nezet: "kapott",
      allapot: "nyitott",
    });
    expect(kapott).toMatchObject({
      cim: "Raktár leltár",
      allapot: "kiadva",
      kiadoNev: "Nagy Béla",
      felelosNev: "Kiss Anna",
      szerep: "felelos",
      hatarido: nap(3),
      kesik: false,
      muveletek: { dont: true, lezar: false, visszavon: false, megjegyzes: true },
    });
    // Béla sees it on his "kiadott" list, and not on his own "kapott" one.
    expect(await hrApi.listFeladatok(v(bela), { nezet: "kapott" })).toHaveLength(0);
    const [kiadott] = await hrApi.listFeladatok(v(bela), { nezet: "kiadott" });
    expect(kiadott?.szerep).toBe("kiado");
    expect(kiadott?.muveletek).toMatchObject({ dont: false, visszavon: true });

    // Closing before accepting is refused; the kiadó cannot accept for her.
    expect((await hrApi.lezarFeladatot(v(anna), id)).message).toBe(
      "Előbb fogadd el a feladatot",
    );
    expect((await hrApi.dontFeladatrol(v(bela), id, { elfogad: true })).ok).toBe(false);

    expect((await hrApi.dontFeladatrol(v(anna), id, { elfogad: true })).ok).toBe(true);
    expect(
      (await hrApi.dontFeladatrol(v(anna), id, { elfogad: false, indok: "x" })).ok,
    ).toBe(false);
    expect((await hrApi.addFeladatMegjegyzes(v(anna), id, "Holnap kezdem")).ok).toBe(
      true,
    );
    expect((await hrApi.addFeladatMegjegyzes(v(bela), id, "Köszönöm")).ok).toBe(true);
    expect(
      (await hrApi.listMyAssignments(anna.id)).find((t) => t.entityId === id)?.status,
    ).toBe("Folyamatban");

    expect((await hrApi.lezarFeladatot(v(anna), id, "Kész, 3 hiány")).ok).toBe(true);
    expect((await hrApi.addFeladatMegjegyzes(v(anna), id, "Még valami")).message).toBe(
      "A feladat már le van zárva",
    );
    expect((await hrApi.visszavonFeladatot(v(bela), id)).ok).toBe(false);

    const [kesz] = await hrApi.listFeladatok(v(bela), {
      nezet: "kiadott",
      allapot: "lezart",
    });
    expect(kesz?.allapot).toBe("lezarva");
    expect(kesz?.megjegyzesek.map((m) => [m.szoveg, m.kiadotol, m.szerzoNev])).toEqual([
      ["Holnap kezdem", false, "Kiss Anna"],
      ["Köszönöm", true, "Nagy Béla"],
    ]);
    expect(kesz?.naplo.map((n) => [n.allapot, n.kiNev, n.megjegyzes])).toEqual([
      ["kiadva", "Nagy Béla", undefined],
      ["elfogadva", "Kiss Anna", undefined],
      ["lezarva", "Kiss Anna", "Kész, 3 hiány"],
    ]);
    expect(kesz?.muveletek).toEqual({
      dont: false,
      lezar: false,
      visszavon: false,
      ujrakiad: false,
      megjegyzes: false,
      tovabbad: false,
      lepesek: false,
      kezel: false,
    });
    expect((await hrApi.listMyAssignments(anna.id)).some((t) => t.entityId === id)).toBe(
      false,
    );

    // Stored on the shared withStatusTracking shape.
    const doc = await Feladat.findById(id).lean().exec();
    expect(doc?.status.key).toBe("lezarva");
    expect(doc?.statusHistory).toHaveLength(3);
    expect(String(doc?.assignee?.userId)).toBe(anna.id);
  });

  it("a refusal needs a reason, goes back to the kiadó, who gives it to someone else", async () => {
    const bela = await fiok("Nagy Béla");
    const anna = await fiok("Kiss Anna");
    const csaba = await fiok("Tóth Csaba");
    const { id } = await hrApi.createFeladat(v(bela), {
      felelosIds: [anna.id],
      cim: "Szerszámok átnézése",
      hatarido: nap(1),
    });

    expect((await hrApi.dontFeladatrol(v(anna), id, { elfogad: false })).message).toBe(
      "Írd meg, miért utasítod el — ezt látja, aki kiadta",
    );
    expect(
      (
        await hrApi.dontFeladatrol(v(anna), id, {
          elfogad: false,
          indok: "Szabadságon leszek",
        })
      ).ok,
    ).toBe(true);

    // Gone from Anna's tasks, now on Béla's to decide.
    expect((await hrApi.listMyAssignments(anna.id)).some((t) => t.entityId === id)).toBe(
      false,
    );
    expect(
      (await hrApi.listMyAssignments(bela.id)).find((t) => t.entityId === id),
    ).toMatchObject({
      entityType: "feladat-elutasitva",
      status: "Elutasítva",
      url: `/feladatok/${id}`,
    });
    const [elutasitott] = await hrApi.listFeladatok(v(bela), { nezet: "kiadott" });
    expect(elutasitott?.naplo.at(-1)?.megjegyzes).toBe("Szabadságon leszek");
    expect(elutasitott?.muveletek).toMatchObject({ ujrakiad: true, visszavon: true });

    // Only the kiadó reissues, never into the past, never to themself.
    expect(
      (
        await hrApi.ujrakiadFeladatot(v(anna), id, {
          felelosId: csaba.id,
          hatarido: nap(2),
        })
      ).ok,
    ).toBe(false);
    expect(
      (
        await hrApi.ujrakiadFeladatot(v(bela), id, {
          felelosId: csaba.id,
          hatarido: nap(-1),
        })
      ).message,
    ).toBe("A határidő nem lehet a múltban");
    expect(
      (
        await hrApi.ujrakiadFeladatot(v(bela), id, {
          felelosId: bela.id,
          hatarido: nap(2),
        })
      ).message,
    ).toBe("Magadnak nem adhatsz ki feladatot");
    expect(
      (
        await hrApi.ujrakiadFeladatot(v(bela), id, {
          felelosId: csaba.id,
          hatarido: nap(2),
        })
      ).ok,
    ).toBe(true);

    const [ujra] = await hrApi.listFeladatok(v(csaba), { nezet: "kapott" });
    expect(ujra).toMatchObject({
      id,
      allapot: "kiadva",
      felelosNev: "Tóth Csaba",
      hatarido: nap(2),
    });
    expect(ujra?.naplo.at(-1)?.megjegyzes).toBe("Újra kiadva: Tóth Csaba");
    // Anna no longer has a say on it.
    expect((await hrApi.addFeladatMegjegyzes(v(anna), id, "hm")).message).toBe(
      "A feladat nem található",
    );
    expect((await hrApi.listMyAssignments(bela.id)).some((t) => t.entityId === id)).toBe(
      false,
    );
  });

  it("the kiadó withdraws an open task; it leaves the felelős’s list", async () => {
    const bela = await fiok("Nagy Béla");
    const anna = await fiok("Kiss Anna");
    const { id } = await hrApi.createFeladat(v(bela), {
      felelosIds: [anna.id],
      cim: "Kulcsok",
      hatarido: nap(0),
    });
    expect((await hrApi.visszavonFeladatot(v(anna), id)).message).toBe(
      "Csak az vonhatja vissza, aki kiadta",
    );
    expect((await hrApi.visszavonFeladatot(v(bela), id, "Már megoldódott")).ok).toBe(
      true,
    );
    expect(
      await hrApi.listFeladatok(v(anna), { nezet: "kapott", allapot: "nyitott" }),
    ).toEqual([]);
    const [lezart] = await hrApi.listFeladatok(v(anna), {
      nezet: "kapott",
      allapot: "lezart",
    });
    expect(lezart?.allapot).toBe("visszavonva");
    expect(lezart?.naplo.at(-1)?.megjegyzes).toBe("Már megoldódott");
  });

  it('an own task skips acceptance; the owner closes or drops it, and it stays off "kiadott"', async () => {
    const bela = await fiok("Nagy Béla");
    const { id, db } = await hrApi.createFeladat(v(bela), {
      felelosIds: [bela.id],
      cim: "Ajánlat átnézése",
      hatarido: nap(2),
    });
    expect(db).toBe(1);
    const [sajat] = await hrApi.listFeladatok(v(bela), {
      nezet: "kapott",
      allapot: "nyitott",
    });
    expect(sajat).toMatchObject({
      id,
      sajat: true,
      allapot: "elfogadva",
      muveletek: { dont: false, lezar: true, visszavon: true, ujrakiad: false },
    });
    expect(await hrApi.listFeladatok(v(bela), { nezet: "kiadott" })).toEqual([]);
    expect(
      (await hrApi.listMyAssignments(bela.id)).find((t) => t.entityId === id),
    ).toMatchObject({
      entityType: "feladat-sajat",
      title: "Saját feladat: Ajánlat átnézése",
    });
    expect((await hrApi.lezarFeladatot(v(bela), id)).ok).toBe(true);
  });

  it("a group task gives everyone their own copy, and each copy shows the whole group", async () => {
    const bela = await fiok("Nagy Béla");
    const anna = await fiok("Kiss Anna");
    const csaba = await fiok("Tóth Csaba");
    const { db } = await hrApi.createFeladat(v(bela), {
      felelosIds: [anna.id, csaba.id, anna.id],
      cim: "Munkavédelmi oktatás",
      hatarido: nap(5),
    });
    expect(db).toBe(2);
    const [annae] = await hrApi.listFeladatok(v(anna), { nezet: "kapott" });
    expect((await hrApi.dontFeladatrol(v(anna), annae!.id, { elfogad: true })).ok).toBe(
      true,
    );
    expect((await hrApi.lezarFeladatot(v(anna), annae!.id)).ok).toBe(true);
    // Csaba's copy is untouched by Anna's progress.
    const [csabae] = await hrApi.listFeladatok(v(csaba), { nezet: "kapott" });
    expect(csabae?.allapot).toBe("kiadva");

    const kiadott = await hrApi.listFeladatok(v(bela), { nezet: "kiadott" });
    expect(kiadott).toHaveLength(2);
    expect(new Set(kiadott.map((k) => k.csoport?.id)).size).toBe(1);
    expect(kiadott[0]?.csoport?.tagok.map((t) => [t.felelosNev, t.allapot])).toEqual([
      ["Kiss Anna", "lezarva"],
      ["Tóth Csaba", "kiadva"],
    ]);
  });

  it("validates the new task: felelős, own account, inactive account, deadline", async () => {
    const bela = await fiok("Nagy Béla");
    const regi = await fiok("Régi Rudolf", [], false);
    const anna = await fiok("Kiss Anna");
    const base = { cim: "Valami", hatarido: nap(1) };

    expect(
      (await hrApi.createFeladat(v(bela), { ...base, felelosIds: [] })).message,
    ).toBe("Válaszd ki, kinek adod a feladatot");
    expect(
      (await hrApi.createFeladat(v(bela), { ...base, felelosIds: [regi.id] })).message,
    ).toBe("Válaszd ki, kinek adod a feladatot");
    expect(
      (
        await hrApi.createFeladat(v(bela), {
          ...base,
          felelosIds: [anna.id],
          hatarido: "2026-02-30",
        })
      ).message,
    ).toBe("Adj meg érvényes határidőt");
    expect(
      (
        await hrApi.createFeladat(v(bela), {
          ...base,
          felelosIds: [anna.id],
          hatarido: nap(-1),
        })
      ).message,
    ).toBe("A határidő nem lehet a múltban");
    expect(
      (await hrApi.createFeladat(v(bela), { ...base, felelosIds: [anna.id], cim: "   " }))
        .message,
    ).toBeDefined();

    // The picker lists active accounts other than the viewer.
    const cimzettek = await hrApi.listFeladatCimzettek(v(bela));
    expect(cimzettek.map((c) => c.nev)).toEqual(["Kiss Anna"]);
  });

  it("flags an overdue open task", async () => {
    const bela = await fiok("Nagy Béla");
    const anna = await fiok("Kiss Anna");
    const { id } = await hrApi.createFeladat(v(bela), {
      felelosIds: [anna.id],
      cim: "Lejárt",
      hatarido: nap(0),
    });
    await Feladat.updateOne(
      { _id: id },
      { $set: { hatarido: new Date(`${nap(-2)}T00:00:00.000Z`) } },
    ).exec();
    const [sor] = await hrApi.listFeladatok(v(anna), { nezet: "kapott" });
    expect(sor?.kesik).toBe(true);
  });

  it("hr:feladat:read sees everyone’s tasks read-only; others only their own", async () => {
    const bela = await fiok("Nagy Béla");
    const anna = await fiok("Kiss Anna");
    const fonok = await fiok("Fő Nök", [FELADAT_PERMISSIONS.read]);
    const kivulallo = await fiok("Kívül Álló");
    const { id } = await hrApi.createFeladat(v(bela), {
      felelosIds: [anna.id],
      cim: "Mások dolga",
      hatarido: nap(1),
    });

    const [lat] = await hrApi.listFeladatok(v(fonok), { nezet: "mind" });
    expect(lat).toMatchObject({ id, szerep: "megfigyelo" });
    expect(Object.values(lat!.muveletek).some(Boolean)).toBe(false);
    expect((await hrApi.addFeladatMegjegyzes(v(fonok), id, "hm")).ok).toBe(false);
    expect((await hrApi.visszavonFeladatot(v(fonok), id)).ok).toBe(false);

    // Without the key "mind" is just the viewer's own two lists together.
    expect(await hrApi.listFeladatok(v(kivulallo), { nezet: "mind" })).toEqual([]);
    expect(await hrApi.listFeladatok(v(anna), { nezet: "mind" })).toHaveLength(1);
    expect(
      (await hrApi.dontFeladatrol(v(kivulallo), id, { elfogad: true })).message,
    ).toBe("A feladat nem található");
  });

  it("the task page: kiadó, felelős and hr:feladat:read see it, nobody else", async () => {
    const bela = await fiok("Nagy Béla");
    const anna = await fiok("Kiss Anna");
    const fonok = await fiok("Fő Nök", [FELADAT_PERMISSIONS.read]);
    const kivulallo = await fiok("Kívül Álló");
    const { id } = await hrApi.createFeladat(v(bela), {
      felelosIds: [anna.id],
      cim: "Adatlap",
      leiras: "Hosszú leírás",
      hatarido: nap(1),
    });
    expect(await hrApi.getFeladat(v(bela), id)).toMatchObject({ szerep: "kiado" });
    expect(await hrApi.getFeladat(v(anna), id)).toMatchObject({
      szerep: "felelos",
      leiras: "Hosszú leírás",
      muveletek: { dont: true },
    });
    expect(await hrApi.getFeladat(v(fonok), id)).toMatchObject({ szerep: "megfigyelo" });
    expect(await hrApi.getFeladat(v(kivulallo), id)).toBeNull();
    expect(await hrApi.getFeladat(v(bela), "nem-id")).toBeNull();
  });

  it("tells the action who is on the other side, so it can push the right person", async () => {
    const bela = await fiok("Nagy Béla");
    const anna = await fiok("Kiss Anna");
    const { id } = await hrApi.createFeladat(v(bela), {
      felelosIds: [anna.id],
      cim: "Értesítés",
      hatarido: nap(1),
    });
    const r = await hrApi.dontFeladatrol(v(anna), id, { elfogad: true });
    expect(r.feladat).toEqual({
      id,
      cim: "Értesítés",
      kiadoId: bela.id,
      felelosId: anna.id,
      felelosNev: "Kiss Anna",
      sajat: false,
    });
    expect((await hrApi.addFeladatMegjegyzes(v(bela), id, "ok")).feladat?.felelosId).toBe(
      anna.id,
    );
    expect((await hrApi.lezarFeladatot(v(anna), id)).feladat?.kiadoId).toBe(bela.id);
  });

  it("kimutatás: per person counts, givers, overdue and stuck — only with hr:feladat:read", async () => {
    const bela = await fiok("Nagy Béla");
    const anna = await fiok("Kiss Anna");
    const fonok = await fiok("Fő Nök", [FELADAT_PERMISSIONS.read]);
    const { id: kesz } = await hrApi.createFeladat(v(bela), {
      felelosIds: [anna.id],
      cim: "Kész lesz",
      hatarido: nap(2),
    });
    await hrApi.dontFeladatrol(v(anna), kesz, { elfogad: true });
    await hrApi.lezarFeladatot(v(anna), kesz);
    const { id: lejart } = await hrApi.createFeladat(v(bela), {
      felelosIds: [anna.id],
      cim: "Lejárt",
      hatarido: nap(0),
    });
    await Feladat.updateOne(
      { _id: lejart },
      { $set: { hatarido: new Date(`${nap(-2)}T00:00:00.000Z`) } },
    ).exec();
    await hrApi.createFeladat(v(anna), {
      felelosIds: [anna.id],
      cim: "Saját",
      hatarido: nap(1),
    });

    expect(await hrApi.getFeladatKimutatas(v(bela))).toBeNull();
    const k = await hrApi.getFeladatKimutatas(v(fonok));
    expect(k).toMatchObject({
      osszes: 2,
      nyitott: 1,
      lejart: 1,
      elakadt: 1,
      kesz: 1,
      hataridoreKesz: 1,
    });
    const [annaSor] = k!.sorok;
    expect(annaSor).toMatchObject({
      nev: "Kiss Anna",
      kapott: 2,
      kesz: 1,
      lejart: 1,
      elakadt: 1,
      sajat: 1,
      kiadok: [{ nev: "Nagy Béla", db: 2, kesz: 1 }],
    });
    expect(annaSor?.nyitottak.map((n) => [n.cim, n.kesik])).toEqual([["Lejárt", true]]);
    expect(k!.kiadok).toEqual([
      { nev: "Nagy Béla", kiadott: 2, feladat: 2, kesz: 1, lejart: 1 },
    ]);
    expect(k!.feladatok).toEqual({ osszes: 2, csoportos: 0, csoportosKesz: 0 });
  });

  it("priority, primary felelős and attachments on a group task (#47, #48)", async () => {
    const bela = await fiok("Nagy Béla");
    const anna = await fiok("Kiss Anna");
    const csaba = await fiok("Tóth Csaba");
    const kivulallo = await fiok("Kívül Álló");
    const media = String(new mongoose.Types.ObjectId());
    expect(
      (
        await hrApi.createFeladat(v(bela), {
          felelosIds: [anna.id, csaba.id],
          cim: "Rossz elsődleges",
          hatarido: nap(2),
          elsodlegesId: kivulallo.id,
        })
      ).message,
    ).toBe("Az elsődleges felelős a címzettek közül legyen");
    const r = await hrApi.createFeladat(v(bela), {
      felelosIds: [anna.id, csaba.id],
      cim: "Sürgős csoportos",
      hatarido: nap(2),
      prioritas: "surgos",
      elsodlegesId: csaba.id,
      mediaIds: [media],
    });
    expect(r.peldanyok?.map((p) => p.felelosId).sort()).toEqual(
      [anna.id, csaba.id].sort(),
    );
    const [annae] = await hrApi.listFeladatok(v(anna), { nezet: "kapott" });
    expect(annae).toMatchObject({
      prioritas: "surgos",
      elsodleges: false,
      mediaIds: [media],
    });
    expect(annae?.csoport?.tagok.map((t) => [t.felelosNev, t.elsodleges])).toEqual([
      ["Tóth Csaba", true],
      ["Kiss Anna", false],
    ]);
    // Közreműködő: Anna may open Csaba's copy (and its attachments), read-only; a stranger not.
    const csabae = annae!.csoport!.tagok[0]!.id;
    const lat = await hrApi.getFeladat(v(anna), csabae);
    expect(lat).toMatchObject({ szerep: "kozremukodo", elsodleges: true });
    expect(Object.values(lat!.muveletek).some(Boolean)).toBe(false);
    expect(await hrApi.canViewFeladat(v(anna), csabae)).toBe(true);
    expect(await hrApi.canViewFeladat(v(kivulallo), csabae)).toBe(false);

    // Uploading: anyone for a new task; for an existing one only who may comment on it.
    expect(await hrApi.canUploadFeladatCsatolmany(v(kivulallo), null)).toBe(true);
    expect(await hrApi.canUploadFeladatCsatolmany(v(kivulallo), csabae)).toBe(false);
    expect(await hrApi.canUploadFeladatCsatolmany(v(bela), csabae)).toBe(true);

    // A comment's attachments are kept with that comment.
    const komment = String(new mongoose.Types.ObjectId());
    const m = await hrApi.addFeladatMegjegyzes(v(anna), annae!.id, "Fotó csatolva", [
      komment,
    ]);
    expect(m.mediaIds?.sort()).toEqual([media, komment].sort());
    const [utana] = await hrApi.listFeladatok(v(anna), { nezet: "kapott" });
    expect(utana?.megjegyzesek.map((x) => x.mediaIds)).toEqual([[komment]]);

    // Kimutatás: priority and primary on the open rows, közreműködő count per person.
    const fonok = await fiok("Fő Nök", [FELADAT_PERMISSIONS.read]);
    const k = await hrApi.getFeladatKimutatas(v(fonok));
    const annaSor = k!.sorok.find((x) => x.nev === "Kiss Anna");
    expect(annaSor?.kozremukodo).toBe(1);
    expect(annaSor?.nyitottak[0]).toMatchObject({
      prioritas: "surgos",
      elsodleges: false,
    });
  });

  it("továbbadás: back to the kiadó or on to someone else, with the chain in the log (#49)", async () => {
    const bela = await fiok("Nagy Béla");
    const anna = await fiok("Kiss Anna");
    const csaba = await fiok("Tóth Csaba");
    const { id } = await hrApi.createFeladat(v(bela), {
      felelosIds: [anna.id],
      cim: "Ajánlat",
      hatarido: nap(3),
      prioritas: "magas",
    });
    await hrApi.addFeladatMegjegyzes(v(bela), id, "Holnapig kérem");

    expect(
      (await hrApi.tovabbadFeladatot(v(bela), id, { celId: csaba.id, indok: "x" })).ok,
    ).toBe(false);
    expect(
      (await hrApi.tovabbadFeladatot(v(anna), id, { celId: csaba.id, indok: "  " }))
        .message,
    ).toBe("Írd meg, miért adod tovább");
    expect(
      (await hrApi.tovabbadFeladatot(v(anna), id, { celId: anna.id, indok: "x" }))
        .message,
    ).toBe("Magadnak nem adhatod tovább");

    // Anna (not yet accepted) passes it to Csaba.
    const r = await hrApi.tovabbadFeladatot(v(anna), id, {
      celId: csaba.id,
      indok: "Csaba érti a gépet",
    });
    expect(r.ok).toBe(true);
    expect(r.regi).toMatchObject({ id, kiadoId: bela.id, felelosId: anna.id });
    const ujId = r.feladat!.id;
    expect(r.feladat).toMatchObject({ kiadoId: bela.id, felelosId: csaba.id });

    const regi = await hrApi.getFeladat(v(anna), id);
    expect(regi).toMatchObject({ allapot: "tovabbadva", kovetkezoId: ujId });
    expect(Object.values(regi!.muveletek).some(Boolean)).toBe(false);
    expect((await hrApi.listMyAssignments(anna.id)).some((t) => t.entityId === id)).toBe(
      false,
    );

    const uj = await hrApi.getFeladat(v(csaba), ujId);
    expect(uj).toMatchObject({
      allapot: "kiadva",
      prioritas: "magas",
      kiadoNev: "Nagy Béla",
      felelosNev: "Tóth Csaba",
      elozmenyId: id,
      muveletek: { dont: true, tovabbad: true },
    });
    expect(uj?.megjegyzesek.map((x) => x.szoveg)).toEqual(["Holnapig kérem"]);
    expect(uj?.naplo.at(-1)?.megjegyzes).toBe(
      "Továbbadva: Kiss Anna → Tóth Csaba: Csaba érti a gépet",
    );
    // Anna, an earlier felelős, may still read the new copy.
    expect(await hrApi.getFeladat(v(anna), ujId)).toMatchObject({ szerep: "megfigyelo" });

    // Csaba accepts, then hands it back to the kiadó, who has to accept it again.
    await hrApi.dontFeladatrol(v(csaba), ujId, { elfogad: true });
    const vissza = await hrApi.tovabbadFeladatot(v(csaba), ujId, {
      celId: bela.id,
      indok: "Nem nálam van az adat",
    });
    expect(vissza.ok).toBe(true);
    const harmadik = await hrApi.getFeladat(v(bela), vissza.feladat!.id);
    expect(harmadik).toMatchObject({ allapot: "kiadva", szerep: "kiado" });
    expect(harmadik?.muveletek).toMatchObject({ dont: true, visszavon: true });
    expect(harmadik?.naplo.map((n) => n.allapot)).toEqual([
      "kiadva",
      "kiadva",
      "elfogadva",
      "kiadva",
    ]);
    expect(harmadik?.naplo.at(-1)?.megjegyzes).toBe(
      "Továbbadva: Tóth Csaba → Nagy Béla (vissza a kiadónak): Nem nálam van az adat",
    );

    const fonok = await fiok("Fő Nök", [FELADAT_PERMISSIONS.read]);
    const k = await hrApi.getFeladatKimutatas(v(fonok));
    expect(k?.osszes).toBe(1);
    expect(k?.sorok.find((x) => x.nev === "Kiss Anna")).toMatchObject({
      kapott: 1,
      tovabbadott: 1,
    });
  });

  it("an own task cannot be handed on", async () => {
    const bela = await fiok("Nagy Béla");
    const anna = await fiok("Kiss Anna");
    const { id } = await hrApi.createFeladat(v(bela), {
      felelosIds: [bela.id],
      cim: "Saját",
      hatarido: nap(1),
    });
    expect(
      (await hrApi.tovabbadFeladatot(v(bela), id, { celId: anna.id, indok: "x" }))
        .message,
    ).toBe("Saját feladatot nem lehet továbbadni");
  });
});

describe("lépések és kapcsolt feladatok (8c, #50)", () => {
  it("the felelős adds, ticks and edits steps; the current step shows as status", async () => {
    const bela = await fiok("Nagy Béla");
    const anna = await fiok("Kiss Anna");
    const { id } = await hrApi.createFeladat(v(bela), {
      felelosIds: [anna.id],
      cim: "Ajánlat",
      hatarido: nap(5),
    });
    expect((await hrApi.setFeladatLepesek(v(bela), id, [{ nev: "x" }])).message).toBe(
      "A lépéseket a felelős kezeli",
    );
    expect(
      (
        await hrApi.setFeladatLepesek(v(anna), id, [
          { nev: "Tervek átnézése" },
          { nev: "  " },
          { nev: "Önköltség", hatarido: nap(2) },
          { nev: "Összeállítás" },
        ])
      ).ok,
    ).toBe(true);
    await hrApi.dontFeladatrol(v(anna), id, { elfogad: true });
    expect((await hrApi.jelolFeladatLepes(v(anna), id, 0, true)).ok).toBe(true);
    expect((await hrApi.jelolFeladatLepes(v(anna), id, 9, true)).message).toBe(
      "Nincs ilyen lépés",
    );
    const sor = await hrApi.getFeladat(v(anna), id);
    expect(sor?.lepesek).toEqual([
      { nev: "Tervek átnézése", kesz: true, hatarido: undefined },
      { nev: "Önköltség", kesz: false, hatarido: nap(2) },
      { nev: "Összeállítás", kesz: false, hatarido: undefined },
    ]);
    expect(sor?.aktualisLepes).toEqual({ nev: "Önköltség", sorszam: 2, osszes: 3 });
    expect(
      (await hrApi.listMyAssignments(anna.id)).find((t) => t.entityId === id)?.status,
    ).toBe("Folyamatban · 2/3 Önköltség");
    expect(
      (await hrApi.setFeladatLepesek(v(anna), id, [{ nev: "a", hatarido: "2026-02-31" }]))
        .ok,
    ).toBe(false);

    // Saved as a personal template, applied to another task.
    expect(
      (
        await hrApi.saveLepesSablon(v(anna), {
          nev: "Ajánlat menete",
          lepesek: sor!.lepesek.map((l) => l.nev),
        })
      ).ok,
    ).toBe(true);
    const [sablon] = await hrApi.listLepesSablonok(v(anna));
    expect(sablon).toMatchObject({
      nev: "Ajánlat menete",
      lepesek: ["Tervek átnézése", "Önköltség", "Összeállítás"],
    });
    expect(await hrApi.listLepesSablonok(v(bela))).toEqual([]);
    const { id: masik } = await hrApi.createFeladat(v(anna), {
      felelosIds: [anna.id],
      cim: "Másik ajánlat",
      hatarido: nap(3),
    });
    expect((await hrApi.alkalmazLepesSablon(v(bela), masik, sablon!.id)).ok).toBe(false);
    expect((await hrApi.alkalmazLepesSablon(v(anna), masik, sablon!.id)).ok).toBe(true);
    expect((await hrApi.getFeladat(v(anna), masik))?.aktualisLepes).toEqual({
      nev: "Tervek átnézése",
      sorszam: 1,
      osszes: 3,
    });
    expect((await hrApi.deleteLepesSablon(v(bela), sablon!.id)).ok).toBe(false);
    expect((await hrApi.deleteLepesSablon(v(anna), sablon!.id)).ok).toBe(true);
  });

  it("another module creates a linked task, and is called back when it is handed on or closed", async () => {
    const bela = await fiok("Nagy Béla");
    const anna = await fiok("Kiss Anna");
    const csaba = await fiok("Tóth Csaba");
    const esemenyek: KapcsoltFeladatEsemeny[] = [];
    registerKapcsoltFeladatHook("vallalkozas", (e) => {
      esemenyek.push(e);
    });
    registerKapcsoltFeladatHook("masik", () => {
      throw new Error("nem dől el tőle semmi");
    });
    const kapcsolat = {
      modul: "vallalkozas",
      tipus: "ajanlatkeres",
      id: "AK-1",
      szakasz: "onkoltseg",
      url: "/vallalkozas/ajanlatkeresek/AK-1",
    };
    const { id, message } = await hrApi.createKapcsoltFeladat({
      kiadoId: bela.id,
      felelosId: anna.id,
      cim: "Önköltség-számítás",
      hatarido: nap(4),
      prioritas: "magas",
      kapcsolat,
      lepesek: ["Beszállítói árak", "Kalkuláció"],
    });
    expect(message).toBeUndefined();
    const sor = await hrApi.getFeladat(v(anna), id);
    expect(sor).toMatchObject({ kapcsolat, prioritas: "magas", allapot: "kiadva" });
    expect(sor?.lepesek.map((l) => l.nev)).toEqual(["Beszállítói árak", "Kalkuláció"]);
    expect(
      await hrApi.listKapcsoltFeladatok({
        modul: "vallalkozas",
        tipus: "ajanlatkeres",
        id: "AK-1",
      }),
    ).toMatchObject([
      { id, felelosId: anna.id, szakasz: "onkoltseg", allapot: "kiadva" },
    ]);

    // Anna hands it on: the hook hears it, and the link travels with the new copy.
    const t = await hrApi.tovabbadFeladatot(v(anna), id, {
      celId: csaba.id,
      indok: "Csaba számol",
    });
    const ujId = t.feladat!.id;
    expect(esemenyek).toEqual([
      expect.objectContaining({
        tipus: "tovabbadva",
        feladatId: id,
        kapcsolat,
        actorId: anna.id,
        ujFeladatId: ujId,
        ujFelelosId: csaba.id,
      }),
    ]);
    expect((await hrApi.getFeladat(v(csaba), ujId))?.kapcsolat).toEqual(kapcsolat);

    // The module (a manager) reassigns it to Anna again — no hook for its own move.
    const at = await hrApi.atadKapcsoltFeladatot(kapcsolat, {
      ujFelelosId: anna.id,
      actorId: bela.id,
      indok: "Átosztás",
    });
    expect(at.ok).toBe(true);
    expect(at.regiId).toBe(ujId);
    expect(esemenyek).toHaveLength(1);
    expect(
      (
        await hrApi.atadKapcsoltFeladatot(kapcsolat, {
          ujFelelosId: anna.id,
          actorId: bela.id,
          indok: "x",
        })
      ).message,
    ).toBe("Már nála van a feladat");

    // Anna accepts and closes it: hook with tipus lezarva.
    await hrApi.dontFeladatrol(v(anna), at.id!, { elfogad: true });
    await hrApi.lezarFeladatot(v(anna), at.id!, "Kész a kalkuláció");
    expect(esemenyek.at(-1)).toMatchObject({
      tipus: "lezarva",
      feladatId: at.id,
      actorId: anna.id,
      megjegyzes: "Kész a kalkuláció",
    });

    // A module may close all open tasks of an entity step itself.
    const { id: masodik } = await hrApi.createKapcsoltFeladat({
      kiadoId: bela.id,
      felelosId: csaba.id,
      cim: "Ajánlat összeállítása",
      hatarido: nap(4),
      kapcsolat: { ...kapcsolat, szakasz: "osszeallitas" },
    });
    expect(
      await hrApi.lezarKapcsoltFeladatok(
        { modul: "vallalkozas", tipus: "ajanlatkeres", id: "AK-1" },
        bela.id,
        "Elvetve",
      ),
    ).toEqual({ db: 1 });
    expect((await hrApi.getFeladat(v(bela), masodik))?.allapot).toBe("lezarva");

    // A failing hook never fails the task action.
    const { id: harmadik } = await hrApi.createKapcsoltFeladat({
      kiadoId: bela.id,
      felelosId: anna.id,
      cim: "Hibás modul",
      hatarido: nap(1),
      kapcsolat: { ...kapcsolat, modul: "masik" },
    });
    expect(
      (await hrApi.dontFeladatrol(v(anna), harmadik, { elfogad: false, indok: "nem" }))
        .ok,
    ).toBe(true);
    expect(
      (
        await hrApi.createKapcsoltFeladat({
          kiadoId: bela.id,
          felelosId: anna.id,
          cim: "x",
          hatarido: nap(1),
          kapcsolat: { ...kapcsolat, url: "" },
        })
      ).message,
    ).toBe("Hiányos kapcsolat");
  });
});

describe("csoportos feladat kezelése (8m, #61)", () => {
  async function csoport() {
    const bela = await fiok("Nagy Béla");
    const anna = await fiok("Kiss Anna");
    const csaba = await fiok("Tóth Csaba");
    const dora = await fiok("Szabó Dóra");
    const r = await hrApi.createFeladat(v(bela), {
      felelosIds: [anna.id, csaba.id],
      cim: "Leltár",
      hatarido: nap(3),
      elsodlegesId: anna.id,
    });
    const peldany = (userId: string) =>
      r.peldanyok!.find((p) => p.felelosId === userId)!.id;
    return {
      bela,
      anna,
      csaba,
      dora,
      annae: peldany(anna.id),
      csabae: peldany(csaba.id),
    };
  }

  it("the members carry state, steps, latest comment and the group progress", async () => {
    const { bela, anna, annae } = await csoport();
    await hrApi.dontFeladatrol(v(anna), annae, { elfogad: true });
    await hrApi.setFeladatLepesek(v(anna), annae, [
      { nev: "Polcok", kesz: true },
      { nev: "Raktár" },
    ]);
    await hrApi.addFeladatMegjegyzes(v(anna), annae, "Félúton");
    const [sor] = await hrApi.listFeladatok(v(bela), { nezet: "kiadott" });
    const annaTag = sor!.csoport!.tagok.find((t) => t.felelosNev === "Kiss Anna");
    expect(annaTag).toMatchObject({
      allapot: "elfogadva",
      elsodleges: true,
      lepesKesz: 1,
      lepesOsszes: 2,
      aktualisLepes: "Raktár",
      utolsoMegjegyzes: { szerzoNev: "Kiss Anna", szoveg: "Félúton" },
      hatarido: nap(3),
      kesik: false,
    });
    // The elsődleges felelős first.
    expect(sor!.csoport!.tagok[0]!.felelosNev).toBe("Kiss Anna");
    expect(sor!.csoport!.haladas).toMatchObject({
      aktiv: 2,
      kesz: 0,
      allapotonkent: { elfogadva: 1, kiadva: 1 },
    });
    expect(sor!.muveletek.kezel).toBe(true);
    // Open tabs count a group once.
    expect(await hrApi.countFeladatNezetek(v(bela))).toEqual({
      kiadott: 1,
      mind: undefined,
    });
  });

  it("changes deadline and priority of every open copy, with a log line — kiadó only", async () => {
    const { bela, anna, csaba, annae, csabae } = await csoport();
    await hrApi.dontFeladatrol(v(csaba), csabae, { elfogad: true });
    await hrApi.lezarFeladatot(v(csaba), csabae);
    expect(
      (await hrApi.modositFeladatot(v(anna), annae, { hatarido: nap(9) })).message,
    ).toBe("Csak a kiadó kezelheti a feladatot");
    expect(
      (await hrApi.modositFeladatot(v(bela), annae, { hatarido: nap(-1) })).message,
    ).toBe("A határidő nem lehet a múltban");
    const r = await hrApi.modositFeladatot(v(bela), csabae, {
      hatarido: nap(9),
      prioritas: "surgos",
    });
    // Addressed through the closed copy, it still changes the open one — and only that.
    expect(r).toMatchObject({ ok: true, db: 1 });
    expect(r.celok.map((c) => c.felelosId)).toEqual([anna.id]);
    const a = await hrApi.getFeladat(v(anna), annae);
    expect(a).toMatchObject({ hatarido: nap(9), prioritas: "surgos", allapot: "kiadva" });
    expect(a!.naplo.at(-1)?.megjegyzes).toBe(
      `Módosítva: határidő ${nap(3).replaceAll("-", ". ")}. → ${nap(9).replaceAll("-", ". ")}., prioritás Normál → Sürgős`,
    );
    const c = await hrApi.getFeladat(v(csaba), csabae);
    expect(c).toMatchObject({ hatarido: nap(3), prioritas: "normal" });
    // Nothing to change → no-op message; back to normal is stored as unset.
    expect(
      (await hrApi.modositFeladatot(v(bela), annae, { prioritas: "surgos" })).ok,
    ).toBe(false);
    await hrApi.modositFeladatot(v(bela), annae, { prioritas: "normal" });
    expect((await Feladat.findById(annae).lean().exec())?.prioritas).toBeUndefined();
  });

  it("one comment reaches every open copy, marked as sent to all, each with its attachment", async () => {
    const { bela, anna, csaba, annae, csabae } = await csoport();
    const media = String(new mongoose.Types.ObjectId());
    expect((await hrApi.addCsoportMegjegyzes(v(anna), annae, "Hé")).ok).toBe(false);
    const r = await hrApi.addCsoportMegjegyzes(v(bela), annae, "Holnap 8-kor kezdünk", [
      media,
    ]);
    expect(r).toMatchObject({ ok: true, db: 2 });
    expect(r.peldanyMedia.map((p) => p.mediaIds)).toEqual([[media], [media]]);
    for (const [u, id] of [
      [anna, annae],
      [csaba, csabae],
    ] as const) {
      const f = await hrApi.getFeladat(v(u), id);
      expect(f!.megjegyzesek).toEqual([
        expect.objectContaining({
          szoveg: "Holnap 8-kor kezdünk",
          kiadotol: true,
          mindenkinek: true,
          mediaIds: [media],
        }),
      ]);
    }
    // A private answer is not "to all"; the group's thread is merged from all copies.
    await hrApi.addFeladatMegjegyzes(v(anna), annae, "Ott leszek");
    const mind = await hrApi.listFeladatCsoport(v(bela), annae);
    expect(mind).toHaveLength(2);
    const annaSor = mind.find((f) => f.id === annae)!;
    expect(annaSor.megjegyzesek.map((m) => [m.szoveg, m.mindenkinek ?? false])).toEqual([
      ["Holnap 8-kor kezdünk", true],
      ["Ott leszek", false],
    ]);
  });

  it("adds members (skipping who is in), turns a single task into a group, not a linked one", async () => {
    const { bela, anna, dora, annae } = await csoport();
    const r = await hrApi.addCsoporttagok(v(bela), annae, [anna.id, dora.id]);
    expect(r).toMatchObject({ ok: true, kihagyott: 1 });
    expect(r.peldanyok.map((p) => p.felelosId)).toEqual([dora.id]);
    const [dorae] = await hrApi.listFeladatok(v(dora), { nezet: "kapott" });
    expect(dorae).toMatchObject({ cim: "Leltár", allapot: "kiadva", elsodleges: false });
    expect(dorae!.csoport!.tagok).toHaveLength(3);
    expect((await hrApi.addCsoporttagok(v(bela), annae, [anna.id])).message).toBe(
      "Mindegyikük már a csoportban van",
    );

    // A single task becomes a group, its felelős the elsődleges.
    const egy = await hrApi.createFeladat(v(bela), {
      felelosIds: [anna.id],
      cim: "Egyéni",
      hatarido: nap(2),
    });
    expect((await hrApi.addCsoporttagok(v(bela), egy.id, [dora.id])).ok).toBe(true);
    const lett = await hrApi.getFeladat(v(bela), egy.id);
    expect(lett!.elsodleges).toBe(true);
    expect(lett!.csoport!.tagok.map((t) => [t.felelosNev, t.elsodleges])).toEqual([
      ["Kiss Anna", true],
      ["Szabó Dóra", false],
    ]);

    const kapcsolt = await hrApi.createKapcsoltFeladat({
      kiadoId: bela.id,
      felelosId: anna.id,
      cim: "Kapcsolt",
      hatarido: nap(2),
      kapcsolat: { modul: "teszt", tipus: "x", id: "1", url: "/x" },
    });
    expect((await hrApi.addCsoporttagok(v(bela), kapcsolt.id, [dora.id])).message).toBe(
      "Kapcsolt feladathoz nem adható címzett",
    );
  });

  it("withdraws one member or the whole group; the primary can be moved", async () => {
    const { bela, anna, csaba, annae, csabae } = await csoport();
    expect((await hrApi.setElsodlegesFelelos(v(anna), csabae)).ok).toBe(false);
    expect((await hrApi.setElsodlegesFelelos(v(bela), csabae)).ok).toBe(true);
    const [a, c] = await Promise.all([
      hrApi.getFeladat(v(anna), annae),
      hrApi.getFeladat(v(csaba), csabae),
    ]);
    expect([a!.elsodleges, c!.elsodleges]).toEqual([false, true]);
    expect(a!.naplo.at(-1)?.megjegyzes).toBe(
      "Közreműködő lett — az elsődleges felelős: Tóth Csaba",
    );

    // One member out: the others go on.
    expect((await hrApi.visszavonFeladatot(v(bela), annae, "Nem kell")).ok).toBe(true);
    expect((await hrApi.setElsodlegesFelelos(v(bela), annae)).message).toBe(
      "Visszavont vagy továbbadott példány nem lehet elsődleges",
    );
    // The whole group.
    expect((await hrApi.visszavonCsoportot(v(csaba), csabae)).ok).toBe(false);
    const r = await hrApi.visszavonCsoportot(v(bela), csabae, "Elmarad");
    expect(r).toMatchObject({ ok: true, db: 1 });
    expect((await hrApi.getFeladat(v(csaba), csabae))?.allapot).toBe("visszavonva");
    expect((await hrApi.visszavonCsoportot(v(bela), csabae)).message).toBe(
      "A feladat már le van zárva",
    );
    expect(await hrApi.countFeladatNezetek(v(bela))).toEqual({
      kiadott: 0,
      mind: undefined,
    });
  });

  it("kimutatás counts a group once per task and once per copy", async () => {
    const { anna, csaba, annae, csabae } = await csoport();
    for (const [u, id] of [
      [anna, annae],
      [csaba, csabae],
    ] as const) {
      await hrApi.dontFeladatrol(v(u), id, { elfogad: true });
      await hrApi.lezarFeladatot(v(u), id);
    }
    const fonok = await fiok("Fő Nök", [FELADAT_PERMISSIONS.read]);
    const k = await hrApi.getFeladatKimutatas(v(fonok));
    expect(k).toMatchObject({
      osszes: 2,
      feladatok: { osszes: 1, csoportos: 1, csoportosKesz: 1 },
      kiadok: [{ nev: "Nagy Béla", kiadott: 2, feladat: 1 }],
    });
  });
});

describe("kategória (#65)", () => {
  it("stores a category on every copy, reuses an existing spelling, lists them most used first", async () => {
    const bela = await fiok("Nagy Béla");
    const anna = await fiok("Kiss Anna");
    const ede = await fiok("Tóth Ede");

    const csoport = await hrApi.createFeladat(v(bela), {
      felelosIds: [anna.id, ede.id],
      cim: "Ajánlatok bekérése",
      hatarido: nap(3),
      kategoria: "  Beszerzés ",
    });
    const peldanyok = await Feladat.find({}).lean().exec();
    expect(peldanyok.map((p) => p.kategoria)).toEqual(["Beszerzés", "Beszerzés"]);

    // Another spelling of the same category takes the existing one.
    const masik = await hrApi.createFeladat(v(anna), {
      felelosIds: [anna.id],
      cim: "Saját",
      hatarido: nap(1),
      kategoria: "BESZERZES",
    });
    const [sajat] = await hrApi
      .listFeladatok(v(anna), { nezet: "kapott", allapot: "nyitott" })
      .then((l) => l.filter((f) => f.id === masik.id));
    expect(sajat?.kategoria).toBe("Beszerzés");

    await hrApi.createFeladat(v(bela), {
      felelosIds: [ede.id],
      cim: "Irodaszer",
      hatarido: nap(2),
      kategoria: "Iroda",
    });
    expect(await hrApi.listKategoriak()).toEqual([
      { nev: "Beszerzés", db: 3 },
      { nev: "Iroda", db: 1 },
    ]);
    expect(await hrApi.listKategoriak("irod")).toEqual([{ nev: "Iroda", db: 1 }]);
    expect(await hrApi.listKategoriak("beszerzés")).toEqual([
      { nev: "Beszerzés", db: 3 },
    ]);

    // The kiadó changes it on the whole group (log line), or clears it.
    const r = await hrApi.modositFeladatot(v(bela), csoport.id, { kategoria: "iroda" });
    expect(r).toMatchObject({ ok: true, db: 2 });
    const utana = await Feladat.find({ csoportId: { $exists: true } })
      .lean()
      .exec();
    expect(utana.map((p) => p.kategoria)).toEqual(["Iroda", "Iroda"]);
    expect(utana[0]!.statusHistory.at(-1)?.note).toContain("kategória Beszerzés → Iroda");
    await hrApi.modositFeladatot(v(bela), csoport.id, { kategoria: "", csakEz: true });
    expect((await Feladat.findById(csoport.id).lean().exec())?.kategoria).toBeUndefined();

    // A copy handed on keeps it.
    const edeCopy = utana.find((p) => String(p.assignee?.userId) === ede.id)!;
    await hrApi.dontFeladatrol(v(ede), String(edeCopy._id), { elfogad: true });
    const t = await hrApi.tovabbadFeladatot(v(ede), String(edeCopy._id), {
      celId: anna.id,
      indok: "Ő érti",
    });
    expect(t.ok).toBe(true);
    const uj = await Feladat.findOne({ elozmenyId: edeCopy._id }).lean().exec();
    expect(uj?.kategoria).toBe("Iroda");
  });

  it("gives linked tasks their module default and groups the KPI by category", async () => {
    const bela = await fiok("Nagy Béla");
    const anna = await fiok("Kiss Anna");
    const vezeto = await fiok("Vezető Vera", [FELADAT_PERMISSIONS.read]);
    const k = await hrApi.createKapcsoltFeladat({
      kiadoId: bela.id,
      felelosId: anna.id,
      cim: "Véleményezd a szerződést",
      hatarido: nap(2),
      kapcsolat: {
        modul: "vallalkozas",
        tipus: "szerzodes",
        id: "x1",
        szakasz: "velemenyezes",
        url: "/vallalkozas/szerzodesek/x1",
      },
    });
    expect((await hrApi.getFeladat(v(anna), k.id))?.kategoria).toBe("Szerződés");
    await hrApi.createFeladat(v(bela), {
      felelosIds: [anna.id],
      cim: "Más",
      hatarido: nap(1),
    });

    const kpi = await hrApi.getFeladatKimutatas(v(vezeto));
    expect(kpi?.csoportok.kategoria.map((c) => [c.nev, c.osszes, c.nyitott])).toEqual([
      ["Szerződés", 1, 1],
      ["Nincs kategória", 1, 1],
    ]);
    expect(kpi?.csoportok.felelos.map((c) => [c.nev, c.osszes])).toEqual([
      ["Kiss Anna", 2],
    ]);
    expect(kpi?.csoportok.kiado.map((c) => [c.nev, c.osszes])).toEqual([
      ["Nagy Béla", 2],
    ]);
  });
});
