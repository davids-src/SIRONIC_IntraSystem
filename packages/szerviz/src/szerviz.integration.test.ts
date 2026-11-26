import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import { createTestMongo } from "@erp/test-utils/mongo-memory";
import { connectDB, User } from "@erp/db-core";
import { szervizApi } from "./api";
import { Hibajegy } from "./models/Hibajegy";
import type { Nezo, Szereplo } from "./constants";
import type { ArSnapshotAdat, KeszletKiadasPort } from "./types";

let mongo: MongoMemoryServer;
let szereplo: Szereplo;
let felelosId: string;

const staff: Nezo = { kind: "staff", userId: "x", belsoLathato: false };
const staffBelso: Nezo = { kind: "staff", userId: "x", belsoLathato: true };
const portalA: Nezo = { kind: "portal", partnerId: "pA" };
const portalB: Nezo = { kind: "portal", partnerId: "pB" };
const query = { page: 1, pageSize: 50 };

const snapshot = (tetelId: string): ArSnapshotAdat => ({
  forras: "termek",
  tetelId,
  kod: "HW-1",
  nev: "Kamera",
  egyseg: "db",
  arazasiTipus: "fix",
  belsoAlapar: 100,
  szorzoKulcs: null,
  ugyfelSzorzo: 1,
  kalkulaltAr: 150,
  surgosseg: null,
  surgossegiSzorzo: 1,
  vegAr: 150,
  egyedi: false,
  egysegDb: null,
  afaKulcs: 27,
  penznem: "HUF",
  keszult: "2026-11-01T00:00:00.000Z",
});

const jegy = (partnerId: string, targy = "Nem működik") => ({
  targy,
  leiras: "Leírás",
  partnerId,
  forras: "telefon" as const,
  kategoria: "Általános",
  prioritas: "kozepes" as const,
});
const ujJegy = async (partnerId: string, targy?: string) => {
  const r = await szervizApi.createHibajegy(
    jegy(partnerId, targy) as never,
    { partnerNev: `Partner ${partnerId}` },
    szereplo,
  );
  if (!r.ok) throw new Error(r.message);
  return r.id;
};

const munkalapBe = (o: Record<string, unknown> = {}) => ({
  partnerId: "pA",
  munkaDatum: "2026-11-20",
  szerelo: "Szerelő Béla",
  leiras: "Kamera csere",
  kategoria: "Telepítés",
  sorok: [
    {
      tipus: "munka",
      forras: "kezi",
      leiras: "Munkaóra",
      mennyiseg: 2,
      egyseg: "óra",
      nettoEgysegar: 9000,
    },
    {
      tipus: "anyag",
      forras: "termek",
      leiras: "Kamera",
      mennyiseg: 2,
      egyseg: "db",
      nettoEgysegar: 1,
      keszletbolKiad: true,
      arSnapshot: snapshot("T1"),
    },
  ],
  ...o,
});
const ujMunkalap = async (o?: Record<string, unknown>) => {
  const r = await szervizApi.createMunkalap(
    munkalapBe(o) as never,
    { partnerNev: "Partner pA" },
    szereplo,
  );
  if (!r.ok) throw new Error(r.message);
  return r.id;
};

const portJo = (): KeszletKiadasPort & { hivasok: number } => {
  const p = {
    hivasok: 0,
    preflight: vi.fn(async () => ({ osszesElegendo: true, sorok: [] })),
    kiad: vi.fn(async () => {
      p.hivasok++;
      return { ok: true as const };
    }),
  };
  return p;
};

beforeAll(async () => {
  mongo = await createTestMongo();
  process.env.MONGODB_URI = mongo.getUri();
  await connectDB();
});
afterEach(async () => {
  await mongoose.connection.dropDatabase();
  // dropDatabase removes the unique indexes the idempotency guards rely on.
  await Hibajegy.createIndexes();
});
afterAll(async () => {
  await mongoose.disconnect();
  if (mongo) await mongo.stop();
});

async function seedUser() {
  const u = await User.create({
    email: `t${Math.random()}@x.hu`,
    name: "Teszt Elek",
    passwordHash: "x",
    isActive: true,
  } as never);
  szereplo = { id: String(u._id), nev: "Teszt Elek" };
  felelosId = String(u._id);
}

describe("hibajegy — portál izoláció és belső adatok", () => {
  it("a portál néző csak a saját partnerének jegyeit látja (lista és adatlap)", async () => {
    await seedUser();
    const a = await ujJegy("pA", "A jegye");
    const b = await ujJegy("pB", "B jegye");
    const listaA = await szervizApi.listHibajegyek(query, portalA);
    expect(listaA.data.map((r) => r.targy)).toEqual(["A jegye"]);
    expect(await szervizApi.getHibajegy(a, portalA)).not.toBeNull();
    expect(await szervizApi.getHibajegy(b, portalA)).toBeNull();
    expect(await szervizApi.getHibajegy(a, portalB)).toBeNull();
    expect(await szervizApi.getHibajegy(a, { kind: "portal", partnerId: "" })).toBeNull();
    expect((await szervizApi.listHibajegyek(query, staff)).total).toBe(2);
  });

  it("belső megjegyzés, belső jegyzet és felelős nem hagyja el a facade-ot portál nézőnek", async () => {
    await seedUser();
    const r = await szervizApi.createHibajegy(
      { ...jegy("pA"), belsoJegyzet: "TITKOS jegyzet", felelosId } as never,
      { partnerNev: "Partner pA" },
      szereplo,
    );
    if (!r.ok) throw new Error(r.message);
    await szervizApi.addMegjegyzes(
      r.id,
      { uzenet: "Látható", belso: false },
      szereplo,
      staff,
    );
    await szervizApi.addMegjegyzes(
      r.id,
      { uzenet: "BELSŐ üzenet", belso: true },
      szereplo,
      staffBelso,
    );

    const portal = await szervizApi.getHibajegy(r.id, portalA);
    const json = JSON.stringify(portal);
    expect(json).not.toContain("BELSŐ");
    expect(json).not.toContain("TITKOS");
    expect(json).not.toContain("Teszt Elek"); // felelős / munkatárs neve
    expect(json).not.toContain(felelosId);
    expect(portal?.megjegyzesek.map((m) => m.uzenet)).toEqual(["Látható"]);
    // allow-list: nincs felelős, nincs belső mező
    expect(Object.keys(portal as object).sort()).toEqual(
      [
        "id",
        "azonosito",
        "targy",
        "leiras",
        "allapot",
        "prioritas",
        "kategoria",
        "helyszin",
        "erintettTetelek",
        "megoldasJegyzet",
        "megjegyzesek",
        "createdAt",
        "updatedAt",
      ]
        .filter((k) => k in (portal as object))
        .sort(),
    );
    const lista = await szervizApi.listHibajegyek(query, portalA);
    expect(lista.data[0]?.felelosNev).toBeUndefined();

    // staff jogosultság nélkül sem látja a belsőt
    const staffKi = await szervizApi.getHibajegy(r.id, staff);
    expect(staffKi?.belsoJegyzet).toBeUndefined();
    expect(staffKi?.megjegyzesek.map((m) => m.uzenet)).toEqual(["Látható"]);
    const staffBe = await szervizApi.getHibajegy(r.id, staffBelso);
    expect(staffBe?.belsoJegyzet).toBe("TITKOS jegyzet");
    expect(staffBe?.megjegyzesek).toHaveLength(2);
  });

  it("a portál létrehoz jegyet: a partner a nézőből jön, forrás portál, nincs felelős", async () => {
    await seedUser();
    const r = await szervizApi.createHibajegyPortal(
      {
        targy: "Portálról",
        leiras: "Gond",
        kategoria: "Általános",
        prioritas: "magas",
        partnerId: "pB",
        felelosId,
      } as never,
      portalA,
      { partnerNev: "Partner pA" },
      szereplo,
    );
    if (!r.ok) throw new Error(r.message);
    const staffNezet = await szervizApi.getHibajegy(r.id, staff);
    expect(staffNezet?.partnerId).toBe("pA");
    expect(staffNezet?.forras).toBe("portal");
    expect(staffNezet?.felelosId).toBeUndefined();
    expect(await szervizApi.getHibajegy(r.id, portalB)).toBeNull();
  });

  it("a portál csak nem belső megjegyzést írhat, a sajátjához és nem lezárthoz", async () => {
    await seedUser();
    const a = await ujJegy("pA");
    const b = await ujJegy("pB");
    // belső jelzőt a portál nem kényszeríthet ki
    expect(
      (
        await szervizApi.addMegjegyzes(
          a,
          { uzenet: "Szia", belso: true },
          szereplo,
          portalA,
        )
      ).ok,
    ).toBe(true);
    const lathato = await szervizApi.getHibajegy(a, portalA);
    expect(lathato?.megjegyzesek[0]?.szerepkor).toBe("partner");
    const staffKi = await szervizApi.getHibajegy(a, staffBelso);
    expect(staffKi?.megjegyzesek[0]?.belso).toBe(false);
    // másik partner jegyére nem
    expect(
      (
        await szervizApi.addMegjegyzes(
          b,
          { uzenet: "X", belso: false },
          szereplo,
          portalA,
        )
      ).ok,
    ).toBe(false);
    // lezárt jegyre nem
    await szervizApi.setHibajegyAllapot(a, { allapot: "lezart" } as never, szereplo);
    expect(
      (
        await szervizApi.addMegjegyzes(
          a,
          { uzenet: "Még", belso: false },
          szereplo,
          portalA,
        )
      ).ok,
    ).toBe(false);
    // staff belső megjegyzés jogosultság nélkül elutasítva
    const c = await ujJegy("pA");
    expect(
      (await szervizApi.addMegjegyzes(c, { uzenet: "b", belso: true }, szereplo, staff))
        .ok,
    ).toBe(false);
  });
});

describe("hibajegy — életciklus", () => {
  it("az átmenetek védettek, a státusztörténet íródik, a felelős kijelölhető, archiválható", async () => {
    await seedUser();
    const id = await ujJegy("pA");
    expect(
      (
        await szervizApi.setHibajegyAllapot(
          id,
          { allapot: "folyamatban" } as never,
          szereplo,
        )
      ).ok,
    ).toBe(true);
    expect(
      (await szervizApi.setHibajegyAllapot(id, { allapot: "uj" } as never, szereplo)).ok,
    ).toBe(false);
    expect(
      (
        await szervizApi.setHibajegyAllapot(
          id,
          { allapot: "megoldva", megoldasJegyzet: "Kész" } as never,
          szereplo,
        )
      ).ok,
    ).toBe(true);
    const d = await szervizApi.getHibajegy(id, staff);
    expect(d?.megoldva).toBeDefined();
    expect(d?.elozmenyek.map((e) => e.allapot)).toEqual([
      "uj",
      "folyamatban",
      "megoldva",
    ]);
    expect((await szervizApi.setFelelos(id, felelosId, szereplo)).ok).toBe(true);
    expect((await szervizApi.getHibajegy(id, staff))?.felelosNev).toBe("Teszt Elek");
    expect((await szervizApi.archivHibajegy(id, "", szereplo)).ok).toBe(false);
    expect((await szervizApi.archivHibajegy(id, "Duplikált", szereplo)).ok).toBe(true);
    expect((await szervizApi.listHibajegyek(query, staff)).total).toBe(0);
    expect(
      (await szervizApi.listHibajegyek(query, staff, { archivaltakkal: true })).total,
    ).toBe(1);
    expect((await szervizApi.setFelelos(id, undefined, szereplo)).ok).toBe(false);
    expect((await szervizApi.restoreHibajegy(id)).ok).toBe(true);
  });

  it("a Teendőim feed a felelős nyitott jegyeit adja", async () => {
    await seedUser();
    const id = await ujJegy("pA");
    await szervizApi.setFelelos(id, felelosId, szereplo);
    const refs = await szervizApi.listMyAssignments(felelosId);
    expect(refs).toHaveLength(1);
    expect(refs[0]).toMatchObject({
      module: "szerviz",
      entityType: "hibajegy",
      url: `/szerviz/hibajegyek/${id}`,
    });
    await szervizApi.setHibajegyAllapot(id, { allapot: "megoldva" } as never, szereplo);
    expect(await szervizApi.listMyAssignments(felelosId)).toHaveLength(0);
  });
});

describe("munkalap", () => {
  it("piszkozatban szerkeszthető, a snapshot ára győz, lezárás után a tartalom zárolt", async () => {
    await seedUser();
    const id = await ujMunkalap();
    const d = await szervizApi.getMunkalap(id, staff);
    expect(d?.sorok[1]?.nettoEgysegar).toBe(150); // nem a kliens 1-e
    expect(d?.osszegzes.munkaOra).toBe(2);
    expect(d?.osszegzes.osszesNetto).toBe(2 * 9000 + 2 * 150);
    const mod = await szervizApi.updateMunkalap(
      id,
      munkalapBe({ leiras: "Módosítva" }) as never,
      { partnerNev: "Partner pA" },
    );
    expect(mod.ok).toBe(true);
    const port = portJo();
    expect((await szervizApi.lezarMunkalap(id, szereplo, port)).ok).toBe(true);
    const zart = await szervizApi.updateMunkalap(
      id,
      munkalapBe({ leiras: "Újra" }) as never,
      { partnerNev: "Partner pA" },
    );
    expect(zart).toMatchObject({ ok: false, code: "nem_szerkesztheto" });
    expect((await szervizApi.getMunkalap(id, staff))?.leiras).toBe("Módosítva");
  });

  it("az aláírás mime és méret szerint ellenőrzött", async () => {
    await seedUser();
    const rossz = await szervizApi.createMunkalap(
      munkalapBe({ ugyfelAlairas: "data:text/html;base64,PGI+" }) as never,
      { partnerNev: "P" },
      szereplo,
    );
    expect(rossz.ok).toBe(false);
    const jo = await szervizApi.createMunkalap(
      munkalapBe({
        ugyfelNev: "Ügyfél",
        ugyfelAlairas: "data:image/png;base64,iVBORw0KGgo=",
      }) as never,
      { partnerNev: "P" },
      szereplo,
    );
    expect(jo.ok).toBe(true);
  });

  it("lezáráskor a terv a port felé megy, a kimenet rögzítve; dupla lezárás egyszer hívja a portot", async () => {
    await seedUser();
    const id = await ujMunkalap();
    const port = portJo();
    const [r1, r2] = await Promise.all([
      szervizApi.lezarMunkalap(id, szereplo, port),
      szervizApi.lezarMunkalap(id, szereplo, port),
    ]);
    expect(r1.ok && r2.ok).toBe(true);
    expect(port.hivasok).toBe(1);
    const d = await szervizApi.getMunkalap(id, staff);
    expect(d?.allapot).toBe("lezart");
    expect(d?.keszletKiadva).toBe(true);
    expect(d?.keszletKiadas?.ok).toBe(true);
    expect(port.kiad).toHaveBeenCalledWith(
      [{ sorIndex: 1, arlistaTermekId: "T1", mennyiseg: 2, nev: "Kamera", egyseg: "db" }],
      { tipus: "munkalap", id, azonosito: expect.stringMatching(/^ML-/) },
    );
    // már lezárt: no-op siker, nincs újabb port hívás
    const r3 = await szervizApi.lezarMunkalap(id, szereplo, port);
    expect(r3).toMatchObject({ ok: true, idempotens: true });
    expect(port.hivasok).toBe(1);
  });

  it("készlethiány megakadályozza a lezárást (őr), a munkalap piszkozat marad", async () => {
    await seedUser();
    const id = await ujMunkalap();
    const port: KeszletKiadasPort = {
      preflight: async () => ({
        osszesElegendo: false,
        sorok: [
          {
            sorIndex: 1,
            arlistaTermekId: "T1",
            nev: "Kamera",
            kert: 2,
            szabad: 0,
            elegendo: false,
          },
        ],
      }),
      kiad: vi.fn(async () => ({ ok: true as const })),
    };
    const r = await szervizApi.lezarMunkalap(id, szereplo, port);
    expect(r.ok).toBe(false);
    expect(r.ok === false && r.message).toContain("Nincs elég készlet");
    expect(port.kiad).not.toHaveBeenCalled();
    expect((await szervizApi.getMunkalap(id, staff))?.allapot).toBe("piszkozat");
  });

  it("sikertelen kiadás: lezárt, de megjelölt; az újrapróbálás pótolja, és nem duplázza", async () => {
    await seedUser();
    const id = await ujMunkalap();
    let hiba = true;
    let sikeres = 0;
    const port: KeszletKiadasPort = {
      preflight: async () => ({ osszesElegendo: true, sorok: [] }),
      kiad: async () => {
        if (hiba) return { ok: false, message: "Nem elérhető" };
        sikeres++;
        return { ok: true };
      },
    };
    const r = await szervizApi.lezarMunkalap(id, szereplo, port);
    expect(r.ok).toBe(false);
    const d = await szervizApi.getMunkalap(id, staff);
    expect(d).toMatchObject({ allapot: "lezart", keszletKiadva: false });
    expect(d?.keszletKiadas).toMatchObject({ ok: false, uzenet: "Nem elérhető" });
    expect((await szervizApi.getMunkalapOsszesito()).keszletHibas).toBe(1);
    hiba = false;
    expect((await szervizApi.ujraKiadKeszlet(id, port)).ok).toBe(true);
    expect((await szervizApi.ujraKiadKeszlet(id, port)).ok).toBe(true);
    expect(sikeres).toBe(1);
    expect((await szervizApi.getMunkalap(id, staff))?.keszletKiadva).toBe(true);
  });

  it("port nélkül a lezárás a tervet visszaadja és kiadatlannak jelöli", async () => {
    await seedUser();
    const id = await ujMunkalap();
    const r = await szervizApi.lezarMunkalap(id, szereplo);
    expect(r).toMatchObject({ ok: true, keszletKiadva: false });
    expect(r.ok && r.keszletTerv).toHaveLength(1);
    expect(await szervizApi.tervezKeszlet(id)).toHaveLength(1);
  });

  it("készletet érintő lezárt munkalap nem archiválható; a piszkozat igen", async () => {
    await seedUser();
    const id = await ujMunkalap();
    await szervizApi.lezarMunkalap(id, szereplo, portJo());
    expect((await szervizApi.archivMunkalap(id, "Hiba", szereplo)).ok).toBe(false);
    const piszkozat = await ujMunkalap();
    expect((await szervizApi.archivMunkalap(piszkozat, "Duplikált", szereplo)).ok).toBe(
      true,
    );
    expect(
      (
        await szervizApi.updateMunkalap(piszkozat, munkalapBe() as never, {
          partnerNev: "x",
        })
      ).ok,
    ).toBe(false);
    expect((await szervizApi.restoreMunkalap(piszkozat)).ok).toBe(true);
  });

  it("a portál csak a saját, lezárt munkalapjait látja árak nélkül", async () => {
    await seedUser();
    const lezart = await ujMunkalap();
    const piszkozat = await ujMunkalap();
    await szervizApi.lezarMunkalap(lezart, szereplo, portJo());
    expect(await szervizApi.getMunkalap(piszkozat, portalA)).toBeNull();
    expect(await szervizApi.getMunkalap(lezart, portalB)).toBeNull();
    const n = await szervizApi.getMunkalap(lezart, portalA);
    const json = JSON.stringify(n);
    expect(json).not.toContain("nettoEgysegar");
    expect(json).not.toContain("arSnapshot");
    expect(json).not.toContain("keszlet");
    expect((await szervizApi.listMunkalapok(query, portalA)).total).toBe(1);
    expect((await szervizApi.listMunkalapok(query, portalB)).total).toBe(0);
  });

  it("a piszkozat munkalap a létrehozó Teendőim listáján van", async () => {
    await seedUser();
    const id = await ujMunkalap();
    const refs = await szervizApi.listMyAssignments(szereplo.id);
    expect(refs.find((r) => r.entityType === "munkalap")?.entityId).toBe(id);
  });
});

describe("karbantartási terv", () => {
  const tervBe = (o: Record<string, unknown> = {}) => ({
    cim: "Éves átvizsgálás",
    partnerId: "pA",
    intervallumHonap: 3,
    elsoEsedekes: "2026-11-01",
    elorejelzesNap: 14,
    prioritas: "magas",
    kategoria: "Preventív karbantartás",
    sablonLeiras: "Kamerák tisztítása",
    aktiv: true,
    ...o,
  });

  it("lusta esedékesség és késő/hamarosan lista, ciklus szerint előreléptetve", async () => {
    await seedUser();
    const r = await szervizApi.createKarbantartas(
      tervBe() as never,
      { partnerNev: "Partner pA" },
      szereplo,
    );
    if (!r.ok) throw new Error(r.message);
    const ma = new Date("2026-11-10T08:00:00Z");
    expect((await szervizApi.listEsedekes(ma)).keso.map((e) => e.id)).toEqual([r.id]);
    expect((await szervizApi.getKarbantartas(r.id, ma))?.kovetkezoEsedekes).toBe(
      "2026-11-01",
    );

    const g = await szervizApi.generalHibajegy(r.id, szereplo);
    if (!g.ok) throw new Error(g.message);
    expect(g.ujLetrejott).toBe(true);
    const d = await szervizApi.getKarbantartas(r.id, ma);
    expect(d?.kovetkezoEsedekes).toBe("2027-02-01");
    expect(d?.allapot).toBe("rendben");
    const jegy = await szervizApi.getHibajegy(g.id, staff);
    expect(jegy).toMatchObject({
      partnerId: "pA",
      prioritas: "magas",
      kategoria: "Preventív karbantartás",
    });
    expect((await szervizApi.listEsedekes(ma)).keso).toHaveLength(0);
    expect(
      (await szervizApi.listEsedekes(new Date("2027-01-25T00:00:00Z"))).hamarosan,
    ).toHaveLength(1);
  });

  it("a generálás ciklusonként idempotens (párhuzamos hívás sem duplikál)", async () => {
    await seedUser();
    const r = await szervizApi.createKarbantartas(
      tervBe() as never,
      { partnerNev: "P" },
      szereplo,
    );
    if (!r.ok) throw new Error(r.message);
    const [a, b] = await Promise.all([
      szervizApi.generalHibajegy(r.id, szereplo),
      szervizApi.generalHibajegy(r.id, szereplo),
    ]);
    expect(a.ok && b.ok).toBe(true);
    if (a.ok && b.ok) expect(a.id).toBe(b.id);
    expect((await szervizApi.listHibajegyek(query, staff)).total).toBe(1);
    expect((await szervizApi.getKarbantartas(r.id))?.utolsoCiklus).toBe(0);
  });

  it("inaktív és archivált tervből nem generál; a felelős Teendőim feedet kap", async () => {
    await seedUser();
    const r = await szervizApi.createKarbantartas(
      tervBe({ felelosId, elsoEsedekes: "2020-01-01" }) as never,
      { partnerNev: "P" },
      szereplo,
    );
    if (!r.ok) throw new Error(r.message);
    const refs = await szervizApi.listMyAssignments(felelosId);
    expect(refs.find((x) => x.entityType === "karbantartasi-terv")).toMatchObject({
      url: `/szerviz/karbantartas/${r.id}`,
      dueDate: "2020-01-01",
    });
    await szervizApi.updateKarbantartas(
      r.id,
      tervBe({ felelosId, aktiv: false, elsoEsedekes: "2020-01-01" }) as never,
      { partnerNev: "P" },
    );
    expect((await szervizApi.generalHibajegy(r.id, szereplo)).ok).toBe(false);
    await szervizApi.updateKarbantartas(r.id, tervBe({ aktiv: true }) as never, {
      partnerNev: "P",
    });
    expect((await szervizApi.archivKarbantartas(r.id, "Megszűnt", szereplo)).ok).toBe(
      true,
    );
    expect((await szervizApi.generalHibajegy(r.id, szereplo)).ok).toBe(false);
  });
});

describe("áttekintés", () => {
  it("a KPI-k összegződnek", async () => {
    await seedUser();
    await ujJegy("pA");
    await ujMunkalap();
    const a = await szervizApi.getAttekintes();
    expect(a.hibajegy.nyitott).toBe(1);
    expect(a.hibajegy.uj).toBe(1);
    expect(a.munkalap.piszkozat).toBe(1);
  });
});
