import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import { createTestMongo } from "@erp/test-utils/mongo-memory";
import { connectDB, getNativeClient, User } from "@erp/db-core";
import { budapestNap } from "@erp/lib/utils";
import { feladatApi } from "./api";
import { feladatFolyamatApi } from "./api-folyamat";
import type { FeladatViewer } from "./constants";
import { Feladat } from "./models/Feladat";
import { FeladatFolyamat } from "./models/FeladatFolyamat";
import { clearKapcsoltFeladatHooks, registerKapcsoltFeladatHook } from "./hooks";

let mongo: MongoMemoryServer;

async function fiok(name: string) {
  const user = await User.create({
    email: `${name.split(" ")[0]!.toLowerCase()}@example.com`,
    name,
    roleIds: [],
    isActive: true,
  });
  return { id: String(user._id), permissions: [] as string[] };
}

const nap = (n: number) => budapestNap(new Date(Date.now() + n * 86_400_000));
const v = (f: { id: string; permissions: string[] }): FeladatViewer => ({
  userId: f.id,
  permissions: f.permissions,
});

/** The felelős accepts and closes the step's task — what they do in Feladatok. */
async function elvegez(
  felelos: { id: string; permissions: string[] },
  feladatId: string,
) {
  expect(
    (await feladatApi.dontFeladatrol(v(felelos), feladatId, { elfogad: true })).ok,
  ).toBe(true);
  expect((await feladatApi.lezarFeladatot(v(felelos), feladatId, "kész")).ok).toBe(true);
}

beforeAll(async () => {
  mongo = await createTestMongo();
  process.env.MONGODB_URI = mongo.getUri();
  await connectDB();
});

beforeEach(() => {
  // The composition root's wiring (apps/erp lib/feladat-kapcsolat.ts), modul `feladat`.
  registerKapcsoltFeladatHook("feladat", async (e) => {
    await feladatFolyamatApi.onKapcsoltFeladat(e);
  });
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

describe("Feladat-folyamat (#67)", () => {
  it("A → B → done: each step goes to its felelős when the previous one closes", async () => {
    const kiado = await fiok("Nagy Béla");
    const a = await fiok("Kiss Anna");
    const b = await fiok("Tóth Bence");

    const r = await feladatFolyamatApi.createFolyamat(v(kiado), {
      cim: "Új gép beszerzése",
      hatarido: nap(10),
      kategoria: "Projektek",
      lepesek: [
        { nev: "Árajánlatok bekérése", felelosId: a.id, hatarido: nap(3) },
        { nev: "Jóváhagyás", felelosId: b.id },
      ],
    });
    expect(r.ok).toBe(true);
    expect(r.ertesitesek).toEqual([
      expect.objectContaining({
        userIds: [a.id],
        title: "Rád került a sor: Árajánlatok bekérése",
      }),
    ]);

    let f = (await feladatFolyamatApi.getFolyamat(v(kiado), r.id!))!;
    expect(f.lepesek.map((l) => l.allapot)).toEqual(["aktiv", "tervezett"]);
    expect(f.aktualis).toMatchObject({
      nev: "Árajánlatok bekérése",
      felelosNev: "Kiss Anna",
    });
    // B already sees the flow (they have a step in it); a stranger does not.
    expect(await feladatFolyamatApi.getFolyamat(v(b), r.id!)).not.toBeNull();
    expect(
      await feladatFolyamatApi.getFolyamat(v(await fiok("Idegen Ede")), r.id!),
    ).toBeNull();

    // A's task is linked to the step and carries the flow's category.
    const elso = await Feladat.findById(f.lepesek[0]!.feladatId).lean();
    expect(elso).toMatchObject({
      kategoria: "Projektek",
      kapcsolat: {
        modul: "feladat",
        tipus: "folyamat",
        id: r.id,
        url: `/feladatok/folyamat/${r.id}`,
      },
    });
    expect(elso!.hatarido.toISOString().slice(0, 10)).toBe(nap(3));

    await elvegez(a, f.lepesek[0]!.feladatId!);
    f = (await feladatFolyamatApi.getFolyamat(v(kiado), r.id!))!;
    expect(f.lepesek.map((l) => l.allapot)).toEqual(["kesz", "aktiv"]);
    expect(f.aktualis?.felelosNev).toBe("Tóth Bence");
    const masodik = await Feladat.findById(f.lepesek[1]!.feladatId).lean();
    expect(String(masodik!.assignee!.userId)).toBe(b.id);
    // A step without its own deadline takes the flow's.
    expect(masodik!.hatarido.toISOString().slice(0, 10)).toBe(nap(10));

    await elvegez(b, f.lepesek[1]!.feladatId!);
    f = (await feladatFolyamatApi.getFolyamat(v(kiado), r.id!))!;
    expect(f.allapotKulcs).toBe("kesz");
    expect(f.lezart).toBe(true);

    // Követett folyamatok: the kiadó as indító, A and B as felelős.
    expect(
      (await feladatFolyamatApi.listKovetettFolyamatok(kiado.id))[0]?.szerepek,
    ).toEqual(["indito"]);
    expect((await feladatFolyamatApi.listKovetettFolyamatok(b.id))[0]?.szerepek).toEqual([
      "felelos",
    ]);
    const m = await feladatFolyamatApi.folyamatAllapotok([
      { tipus: "folyamat", id: r.id! },
    ]);
    expect(m.get(`folyamat:${r.id}`)?.lepesek).toHaveLength(2);
  });

  it("refused step waits for the kiadó; re-given in Feladatok it runs on with the new felelős", async () => {
    const kiado = await fiok("Nagy Béla");
    const a = await fiok("Kiss Anna");
    const c = await fiok("Varga Csilla");
    const b = await fiok("Tóth Bence");
    const r = await feladatFolyamatApi.createFolyamat(v(kiado), {
      cim: "Szerződés előkészítése",
      hatarido: nap(5),
      lepesek: [
        { nev: "Adatgyűjtés", felelosId: a.id },
        { nev: "Ellenőrzés", felelosId: b.id },
      ],
    });
    let f = (await feladatFolyamatApi.getFolyamat(v(kiado), r.id!))!;
    const t1 = f.lepesek[0]!.feladatId!;
    expect(
      (
        await feladatApi.dontFeladatrol(v(a), t1, {
          elfogad: false,
          indok: "Szabadságon vagyok",
        })
      ).ok,
    ).toBe(true);
    f = (await feladatFolyamatApi.getFolyamat(v(kiado), r.id!))!;
    expect(f.lepesek[0]).toMatchObject({
      allapot: "elutasitva",
      megjegyzes: "Szabadságon vagyok",
    });
    expect(f.lepesek[1]!.allapot).toBe("tervezett");

    expect(
      (
        await feladatApi.ujrakiadFeladatot(v(kiado), t1, {
          felelosId: c.id,
          hatarido: nap(2),
        })
      ).ok,
    ).toBe(true);
    f = (await feladatFolyamatApi.getFolyamat(v(kiado), r.id!))!;
    expect(f.lepesek[0]).toMatchObject({ allapot: "aktiv", felelosNev: "Varga Csilla" });
    await elvegez(c, t1);
    f = (await feladatFolyamatApi.getFolyamat(v(kiado), r.id!))!;
    expect(f.lepesek.map((l) => l.allapot)).toEqual(["kesz", "aktiv"]);
    // C joined the flow's participants.
    expect(
      (await FeladatFolyamat.findById(r.id).lean())!.resztvevoIds.map(String),
    ).toContain(c.id);
  });

  it("the kiadó edits the planned steps while it runs; started steps are locked", async () => {
    const kiado = await fiok("Nagy Béla");
    const a = await fiok("Kiss Anna");
    const b = await fiok("Tóth Bence");
    const c = await fiok("Varga Csilla");
    const r = await feladatFolyamatApi.createFolyamat(v(kiado), {
      cim: "Raktárrendezés",
      hatarido: nap(7),
      lepesek: [
        { nev: "Felmérés", felelosId: a.id },
        { nev: "Selejtezés", felelosId: b.id },
        { nev: "Leltár", felelosId: c.id },
      ],
    });
    let f = (await feladatFolyamatApi.getFolyamat(v(kiado), r.id!))!;
    expect(f.szerkesztheto.map((l) => l.zarolt)).toEqual([true, false, false]);
    const [, selejt, leltar] = f.szerkesztheto;

    // Only the kiadó may edit; a started step cannot be moved into the planned part.
    expect((await feladatFolyamatApi.modositFolyamatLepesek(v(a), r.id!, [])).ok).toBe(
      false,
    );
    expect(
      (
        await feladatFolyamatApi.modositFolyamatLepesek(v(kiado), r.id!, [
          { id: f.szerkesztheto[0]!.id, nev: "x", felelosId: a.id },
        ])
      ).ok,
    ).toBe(false);

    // Reorder (Leltár first), reassign Selejtezés to C, add a new last step for A.
    const m = await feladatFolyamatApi.modositFolyamatLepesek(v(kiado), r.id!, [
      { id: leltar!.id, nev: "Leltár", felelosId: c.id },
      { id: selejt!.id, nev: "Selejtezés", felelosId: c.id },
      { nev: "Jelentés", felelosId: a.id, hatarido: nap(6) },
    ]);
    expect(m).toMatchObject({ ok: true, ertesitesek: [] });
    f = (await feladatFolyamatApi.getFolyamat(v(kiado), r.id!))!;
    expect(f.lepesek.map((l) => `${l.nev}:${l.felelosNev}:${l.allapot}`)).toEqual([
      "Felmérés:Kiss Anna:aktiv",
      "Leltár:Varga Csilla:tervezett",
      "Selejtezés:Varga Csilla:tervezett",
      "Jelentés:Kiss Anna:tervezett",
    ]);
    // Existing planned steps kept their ids.
    expect(f.szerkesztheto[1]!.id).toBe(leltar!.id);

    // Removing every planned step after the last one finished closes the flow.
    await elvegez(a, f.lepesek[0]!.feladatId!);
    f = (await feladatFolyamatApi.getFolyamat(v(kiado), r.id!))!;
    expect(f.aktualis?.nev).toBe("Leltár");
    await elvegez(c, f.lepesek[1]!.feladatId!);
    f = (await feladatFolyamatApi.getFolyamat(v(kiado), r.id!))!;
    expect(
      (await feladatFolyamatApi.modositFolyamatLepesek(v(kiado), r.id!, [])).ok,
    ).toBe(true);
    // Selejtezés was running → stays (it is started); only the planned Jelentés was dropped.
    f = (await feladatFolyamatApi.getFolyamat(v(kiado), r.id!))!;
    expect(f.lepesek.map((l) => l.nev)).toEqual(["Felmérés", "Leltár", "Selejtezés"]);
    await elvegez(c, f.lepesek[2]!.feladatId!);
    f = (await feladatFolyamatApi.getFolyamat(v(kiado), r.id!))!;
    expect(f.allapotKulcs).toBe("kesz");

    // A finished flow continues when the kiadó adds a step.
    const tovabb = await feladatFolyamatApi.modositFolyamatLepesek(v(kiado), r.id!, [
      { nev: "Utóellenőrzés", felelosId: b.id },
    ]);
    expect(tovabb.ok).toBe(true);
    f = (await feladatFolyamatApi.getFolyamat(v(kiado), r.id!))!;
    expect(f.allapotKulcs).toBe("folyamatban");
    expect(f.aktualis).toMatchObject({ nev: "Utóellenőrzés", felelosNev: "Tóth Bence" });
  });

  it("re-assigns the running step, restarts a withdrawn one, and stops the flow", async () => {
    const kiado = await fiok("Nagy Béla");
    const a = await fiok("Kiss Anna");
    const b = await fiok("Tóth Bence");
    const r = await feladatFolyamatApi.createFolyamat(v(kiado), {
      cim: "Ajánlat összeállítása",
      hatarido: nap(4),
      lepesek: [
        { nev: "Kalkuláció", felelosId: a.id },
        { nev: "Átnézés", felelosId: kiado.id },
      ],
    });
    let f = (await feladatFolyamatApi.getFolyamat(v(kiado), r.id!))!;
    const regi = f.lepesek[0]!.feladatId!;
    const at = await feladatFolyamatApi.atosztFolyamatLepes(
      v(kiado),
      r.id!,
      f.szerkesztheto[0]!.id,
      b.id,
    );
    expect(at.ok).toBe(true);
    f = (await feladatFolyamatApi.getFolyamat(v(kiado), r.id!))!;
    expect(f.lepesek[0]).toMatchObject({ allapot: "aktiv", felelosNev: "Tóth Bence" });
    expect(f.lepesek[0]!.feladatId).not.toBe(regi);
    expect((await Feladat.findById(regi).lean())!.status.key).toBe("tovabbadva");

    // The kiadó withdraws B's task in Feladatok → the step stops; restart it for B.
    expect(
      (await feladatApi.visszavonFeladatot(v(kiado), f.lepesek[0]!.feladatId!, "mégse"))
        .ok,
    ).toBe(true);
    f = (await feladatFolyamatApi.getFolyamat(v(kiado), r.id!))!;
    expect(f.lepesek[0]!.allapot).toBe("megszakitva");
    expect(f.aktualis).toBeUndefined();
    const ujra = await feladatFolyamatApi.atosztFolyamatLepes(
      v(kiado),
      r.id!,
      f.szerkesztheto[0]!.id,
      b.id,
    );
    expect(ujra.ok).toBe(true);
    f = (await feladatFolyamatApi.getFolyamat(v(kiado), r.id!))!;
    expect(f.lepesek[0]!.allapot).toBe("aktiv");

    // Stop: the running task is withdrawn, nothing starts after.
    expect((await feladatFolyamatApi.megszakitFolyamat(v(a), r.id!)).ok).toBe(false);
    const stop = await feladatFolyamatApi.megszakitFolyamat(v(kiado), r.id!, "Elmarad");
    expect(stop.ok).toBe(true);
    f = (await feladatFolyamatApi.getFolyamat(v(kiado), r.id!))!;
    expect(f.allapotKulcs).toBe("megszakitva");
    expect((await Feladat.findById(f.lepesek[0]!.feladatId).lean())!.status.key).toBe(
      "visszavonva",
    );
    expect(f.lepesek[1]!.allapot).toBe("tervezett");
  });

  it("turns an existing task into step 1 and saves / shares flow templates", async () => {
    const kiado = await fiok("Nagy Béla");
    const a = await fiok("Kiss Anna");
    const b = await fiok("Tóth Bence");
    const { id: feladatId } = await feladatApi.createFeladat(v(kiado), {
      felelosIds: [a.id],
      cim: "Gépszállítás szervezése",
      hatarido: nap(3),
    });
    expect(await feladatFolyamatApi.folyamatHozzaadhato(v(a), feladatId)).toBeNull();
    expect(await feladatFolyamatApi.folyamatHozzaadhato(v(kiado), feladatId)).toEqual({
      felelosId: a.id,
    });
    const r = await feladatFolyamatApi.createFolyamat(v(kiado), {
      cim: "Gépszállítás szervezése",
      hatarido: nap(6),
      feladatId,
      lepesek: [
        { nev: "Gépszállítás szervezése", felelosId: a.id },
        { nev: "Átvétel a helyszínen", felelosId: b.id },
      ],
    });
    expect(r.ok).toBe(true);
    expect((await Feladat.findById(feladatId).lean())!.kapcsolat).toMatchObject({
      modul: "feladat",
      id: r.id,
    });
    expect(await feladatFolyamatApi.folyamatHozzaadhato(v(kiado), feladatId)).toBeNull();
    await elvegez(a, feladatId);
    const f = (await feladatFolyamatApi.getFolyamat(v(kiado), r.id!))!;
    expect(f.aktualis?.felelosNev).toBe("Tóth Bence");

    // Templates: own + shared ones; same name overwrites; only the owner deletes.
    expect(
      (
        await feladatFolyamatApi.saveFolyamatSablon(v(kiado), {
          nev: "Gépszállítás",
          megosztott: true,
          lepesek: [
            { nev: "Szervezés", felelosId: a.id, napok: 0 },
            { nev: "Átvétel", napok: 2 },
          ],
        })
      ).ok,
    ).toBe(true);
    await feladatFolyamatApi.saveFolyamatSablon(v(kiado), {
      nev: "Gépszállítás",
      megosztott: true,
      lepesek: [{ nev: "Szervezés" }, { nev: "Átvétel" }, { nev: "Számlázás" }],
    });
    const lathato = await feladatFolyamatApi.listFolyamatSablonok(v(b));
    expect(lathato).toEqual([
      expect.objectContaining({ nev: "Gépszállítás", sajat: false, megosztott: true }),
    ]);
    expect(lathato[0]!.lepesek).toHaveLength(3);
    expect((await feladatFolyamatApi.deleteFolyamatSablon(v(b), lathato[0]!.id)).ok).toBe(
      false,
    );
    expect(
      (await feladatFolyamatApi.deleteFolyamatSablon(v(kiado), lathato[0]!.id)).ok,
    ).toBe(true);
  });
});
