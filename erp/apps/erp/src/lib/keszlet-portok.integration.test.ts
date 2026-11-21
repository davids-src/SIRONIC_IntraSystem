// @vitest-environment node
/**
 * End-to-end proof of the stock wiring in the composition root: the app-level binders
 * (`keszletBevetelPort`, szerviz/bizonylat `keszletKiadasPort`) drive the real `keszletApi`
 * against memory Mongo. Domain packages never see each other — only these binders do.
 */
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import { connectDB, User } from "@erp/db-core";
import { arlistaApi } from "@erp/arlista";
import { createTermekSchema } from "@erp/arlista/validation";
import { keszletApi } from "@erp/keszlet";
import { ertekesitesApi } from "@erp/ertekesites";
import { megrendeloSchema } from "@erp/ertekesites/validation";
import { szervizApi } from "@erp/szerviz";
import { bizonylatApi } from "@erp/bizonylat";
import { szallitolevelSchema } from "@erp/bizonylat/validation";
import { keszletBevetelPort } from "./ertekesites-loaders";
import { keszletKiadasPort as szervizPort } from "./szerviz-loaders";
import { keszletKiadasPort as bizonylatPort } from "./bizonylat-loaders";

let mongo: MongoMemoryServer;
let actor: string;
let szereplo: { id: string; nev: string };

beforeAll(async () => {
  mongo = await MongoMemoryServer.create({ instance: { launchTimeout: 120_000 } });
  process.env.MONGODB_URI = mongo.getUri();
  process.env.MONGODB_DB_NAME = "sironic_erp_keszlet_portok";
  await connectDB();
}, 120_000);

afterEach(async () => {
  await mongoose.connection.dropDatabase();
});

afterAll(async () => {
  await mongoose.disconnect();
  if (mongo) await mongo.stop();
});

async function seed() {
  const u = await User.create({
    email: `t${Math.random()}@x.hu`,
    name: "Teszt Elek",
    passwordHash: "x",
    isActive: true,
  } as never);
  actor = String(u._id);
  szereplo = { id: actor, nev: "Teszt Elek" };
  const t = await arlistaApi.createTermek(
    createTermekSchema.parse({
      nev: "IP kamera",
      kategoria: "Kamera",
      egyseg: "db",
      nettoAr: 50_000,
    }),
  );
  if (!t.ok || !t.id) throw new Error("termék létrehozása sikertelen");
  return t.id;
}

async function darab(termekId: string): Promise<number> {
  const { data } = await keszletApi.listKeszlet({ userId: actor, permissions: [] }, {
    page: 1,
    pageSize: 200,
    filters: {},
  } as never);
  return data
    .filter((r) => r.arlistaTermekId === termekId)
    .reduce((s, r) => s + r.keszlet, 0);
}

async function bevetel(termekId: string, mennyiseg: number, kulcs: string) {
  const r = await keszletApi.bevetelez(
    [
      {
        arlistaTermekId: termekId,
        mennyiseg,
        termek: { nev: "IP kamera", kod: "K-1", egyseg: "db" },
      },
    ],
    { referenceType: "kezi", referenceId: kulcs },
    actor,
  );
  expect(r.ok).toBe(true);
}

describe("beszerzési rendelés teljesítése -> bevételezés", () => {
  it("a teljesítés pontosan egyszer növeli a készletet, az újrapróbálás és az ismétlés nem duplikál", async () => {
    const termekId = await seed();
    const input = megrendeloSchema.parse({
      beszallitoId: "s1",
      sorok: [
        {
          arlistaTetelId: termekId,
          leiras: "IP kamera",
          mennyiseg: 4,
          egyseg: "db",
          nettoEgysegar: 30_000,
          afaKulcs: 27,
        },
        // Szabad szöveges sor: nem raktározható, kimarad.
        { leiras: "Szállítási költség", mennyiseg: 1, egyseg: "db", nettoEgysegar: 1000 },
      ],
    });
    const r = await ertekesitesApi.createMegrendelo(
      input,
      { beszallitoNev: "Besz Kft." },
      szereplo,
    );
    if (!r.ok || !r.id) throw new Error("megrendelő létrehozása sikertelen");
    await ertekesitesApi.changeMegrendeloAllapot(r.id, "elkuldve", szereplo);

    const port = keszletBevetelPort(actor);
    expect((await ertekesitesApi.teljesitMegrendelo(r.id, szereplo, port)).ok).toBe(true);
    expect(await darab(termekId)).toBe(4);
    expect((await ertekesitesApi.getMegrendelo(r.id))?.bevetelezes?.ok).toBe(true);

    // Második teljesítés elutasított, az újrapróbálás no-op, a port közvetlen ismétlése idempotens.
    expect((await ertekesitesApi.teljesitMegrendelo(r.id, szereplo, port)).ok).toBe(
      false,
    );
    expect((await ertekesitesApi.ujraBevetelezMegrendelo(r.id, port)).ok).toBe(true);
    const sorok = (await ertekesitesApi.getMegrendelo(r.id))!.sorok;
    const ism = await port.bevetelez(sorok, {
      tipus: "megrendelolap",
      id: r.id,
      azonosito: "MR",
    });
    expect(ism.ok).toBe(true);
    expect(await darab(termekId)).toBe(4);
  });
});

describe("szállítólevél kiadása -> készletkiadás", () => {
  it("a kiadás egyszer csökkenti a készletet, az újrapróbálás idempotens; hiány esetén blokkolt", async () => {
    const termekId = await seed();
    await bevetel(termekId, 10, "b1");
    const mk = async (db: number) => {
      const r = await bizonylatApi.createSzallitolevel(
        szallitolevelSchema.parse({
          partnerId: "p1",
          kiadasNap: "2026-11-21",
          sorok: [
            { arlistaTermekId: termekId, nev: "IP kamera", mennyiseg: db, egyseg: "db" },
          ],
        }),
        { partnerNev: "Acme Kft." },
        szereplo,
      );
      if (!r.ok || !r.id) throw new Error("szállítólevél létrehozása sikertelen");
      return r.id;
    };
    const port = bizonylatPort(actor);

    const id = await mk(3);
    expect((await bizonylatApi.kiadSzallitolevel(id, szereplo, port)).ok).toBe(true);
    expect(await darab(termekId)).toBe(7);
    // Ismételt kiadás és az explicit újrapróbálás sem von le még egyszer.
    expect((await bizonylatApi.kiadSzallitolevel(id, szereplo, port)).ok).toBe(true);
    expect((await bizonylatApi.ujraKiadSzallitolevel(id, port)).ok).toBe(true);
    expect(await darab(termekId)).toBe(7);

    // Több kell, mint ami van: a kiadás elutasított, a jegyzék piszkozat marad.
    const tulSok = await mk(50);
    const r = await bizonylatApi.kiadSzallitolevel(tulSok, szereplo, port);
    expect(r.ok).toBe(false);
    expect((await bizonylatApi.getSzallitolevel(tulSok))?.allapot).toBe("piszkozat");
    expect(await darab(termekId)).toBe(7);
  });
});

describe("munkalap lezárása -> készletkiadás", () => {
  const snapshot = (tetelId: string) => ({
    forras: "termek" as const,
    tetelId,
    kod: "K-1",
    nev: "IP kamera",
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
  const munkalap = (termekId: string, db: number) => ({
    partnerId: "pA",
    munkaDatum: "2026-11-20",
    szerelo: "Szerelő Béla",
    leiras: "Kamera csere",
    kategoria: "Telepítés",
    sorok: [
      {
        tipus: "anyag",
        forras: "termek",
        leiras: "IP kamera",
        mennyiseg: db,
        egyseg: "db",
        nettoEgysegar: 1,
        keszletbolKiad: true,
        arSnapshot: snapshot(termekId),
      },
    ],
  });

  it("hiány esetén a lezárás blokkolt és nem változik semmi; utána egyszer von le", async () => {
    const termekId = await seed();
    await bevetel(termekId, 1, "b1");
    const r = await szervizApi.createMunkalap(
      munkalap(termekId, 2) as never,
      { partnerNev: "Partner pA" },
      szereplo,
    );
    if (!r.ok || !r.id) throw new Error("munkalap létrehozása sikertelen");
    const port = szervizPort(actor);
    const staff = { kind: "staff" as const, userId: actor };

    const blokkolt = await szervizApi.lezarMunkalap(r.id, szereplo, port);
    expect(blokkolt.ok).toBe(false);
    expect(blokkolt.ok === false && blokkolt.message).toContain("Nincs elég készlet");
    expect((await szervizApi.getMunkalap(r.id, staff))?.allapot).toBe("piszkozat");
    expect(await darab(termekId)).toBe(1);

    await bevetel(termekId, 5, "b2");
    expect((await szervizApi.lezarMunkalap(r.id, szereplo, port)).ok).toBe(true);
    expect(await darab(termekId)).toBe(4);
    // Dupla lezárás és újrapróbálás: továbbra is egyszeri levonás.
    expect((await szervizApi.lezarMunkalap(r.id, szereplo, port)).ok).toBe(true);
    expect((await szervizApi.ujraKiadKeszlet(r.id, port)).ok).toBe(true);
    expect(await darab(termekId)).toBe(4);
    expect((await szervizApi.getMunkalap(r.id, staff))?.keszletKiadva).toBe(true);
  });
});
