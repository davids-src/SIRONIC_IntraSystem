import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import { createTestMongo } from "@erp/test-utils/mongo-memory";
import { connectDB } from "@erp/db-core";
import { clearDomainEventListenersForTests, onDomainEvent } from "@erp/core";
import { ertekesitesApi } from "./api";
import { ERTEKESITES_PERMISSIONS as P, type Szereplo } from "./constants";
import {
  ajanlatSchema,
  megrendeloSchema,
  szerzodesSablonSchema,
  szerzodesSchema,
} from "./validation";
import type { ArSnapshotAdat, KeszletBevetelPort } from "./types";

let mongo: MongoMemoryServer;
const szereplo: Szereplo = {
  id: new mongoose.Types.ObjectId().toString(),
  nev: "Teszt Elek",
};
const partner = { partnerNev: "Acme Kft.", partnerCim: "1111 Budapest, Fő u. 1." };
const iro = { userId: szereplo.id, permissions: [P.ajanlatRead, P.ajanlatWrite] };
const olvaso = { userId: szereplo.id, permissions: [P.ajanlatRead] };
const query = { page: 1, pageSize: 50 };

const snapshot: ArSnapshotAdat = {
  forras: "szolgaltatas",
  tetelId: "abc",
  kod: "SW-0001",
  nev: "Telepítés",
  egyseg: "óra",
  arazasiTipus: "oradij",
  belsoAlapar: 6000,
  szorzoKulcs: "kkv_eseti",
  ugyfelSzorzo: 1.5,
  kalkulaltAr: 9000,
  surgosseg: null,
  surgossegiSzorzo: 1,
  vegAr: 9000,
  egyedi: false,
  egysegDb: null,
  afaKulcs: 27,
  penznem: "HUF",
  keszult: "2026-11-01T00:00:00.000Z",
};

const ajanlat = (o: Record<string, unknown> = {}) =>
  ajanlatSchema.parse({
    cim: "Kamerarendszer",
    partnerId: "p1",
    sorok: [
      {
        forras: "szolgaltatas",
        sorTipus: "szolgaltatas",
        leiras: "Telepítés",
        mennyiseg: 10,
        egyseg: "óra",
        // A hamis kliens-ár: a szerver a snapshot árát használja.
        nettoEgysegar: 1,
        afaKulcs: 27,
        arSnapshot: snapshot,
      },
      {
        forras: "kezi",
        sorTipus: "termek",
        leiras: "Kábel",
        mennyiseg: 2,
        egyseg: "db",
        nettoEgysegar: 5000,
        afaKulcs: 27,
        beszerzesiEgysegar: 3000,
      },
    ],
    ...o,
  });

async function ujAjanlat(o: Record<string, unknown> = {}): Promise<string> {
  const r = await ertekesitesApi.createAjanlat(ajanlat(o), partner, szereplo);
  return r.id;
}

beforeAll(async () => {
  mongo = await createTestMongo();
  process.env.MONGODB_URI = mongo.getUri();
  await connectDB();
});
afterEach(async () => {
  clearDomainEventListenersForTests();
  await mongoose.connection.dropDatabase();
});
afterAll(async () => {
  await mongoose.disconnect();
  if (mongo) await mongo.stop();
});

describe("Ajánlat", () => {
  it("sorszámot kap, a végösszeget a szerver számolja a snapshot árából", async () => {
    const a = await ujAjanlat();
    const b = await ujAjanlat();
    const da = await ertekesitesApi.getAjanlat(iro, a);
    const db = await ertekesitesApi.getAjanlat(iro, b);
    expect(da?.azonosito).toBe("AJ-000001");
    expect(db?.azonosito).toBe("AJ-000002");
    // 10 * 9000 + 2 * 5000 = 100000 nettó, 27% ÁFA
    expect(da?.osszegek.nettoOsszeg).toBe(100000);
    expect(da?.osszegek.bruttoOsszeg).toBe(127000);
    expect(da?.sorok[0]?.nettoEgysegar).toBe(9000);
    expect(da?.partnerNev).toBe("Acme Kft.");
    expect(da?.allapot).toBe("piszkozat");
  });

  it("a snapshot beágyazva marad, ár-újraolvasás nélkül", async () => {
    const id = await ujAjanlat();
    const d = await ertekesitesApi.getAjanlat(iro, id);
    expect(d?.sorok[0]?.arSnapshot?.vegAr).toBe(9000);
    expect(d?.sorok[0]?.arSnapshot?.keszult).toBe("2026-11-01T00:00:00.000Z");
  });

  it("a belső költség csak írási joggal látszik", async () => {
    const id = await ujAjanlat();
    const ir = await ertekesitesApi.getAjanlat(iro, id);
    const ol = await ertekesitesApi.getAjanlat(olvaso, id);
    expect(ir?.fedezet?.koltseg).toBe(66000);
    expect(ol?.fedezet).toBeUndefined();
    expect(ol?.sorok[1]?.beszerzesiEgysegar).toBeUndefined();
    expect(ol?.sorok[0]?.arSnapshot?.belsoAlapar).toBe(0);
  });

  it("csak piszkozat szerkeszthető, egyébként típusos hiba", async () => {
    const id = await ujAjanlat();
    expect(
      (await ertekesitesApi.updateAjanlat(id, ajanlat({ cim: "Új" }), partner)).ok,
    ).toBe(true);
    await ertekesitesApi.changeAjanlatAllapot(id, { allapot: "elkuldve" }, szereplo);
    const r = await ertekesitesApi.updateAjanlat(id, ajanlat({ cim: "Másik" }), partner);
    expect(r).toMatchObject({ ok: false, code: "nem_szerkesztheto" });
    expect((await ertekesitesApi.getAjanlat(iro, id))?.cim).toBe("Új");
  });

  it("az állapotátmenetek védettek; az elküldés beállítja az utánkövetést", async () => {
    const id = await ujAjanlat();
    const rossz = await ertekesitesApi.changeAjanlatAllapot(
      id,
      { allapot: "elfogadva" },
      szereplo,
    );
    expect(rossz).toMatchObject({ ok: false, code: "ervenytelen_atmenet" });
    expect(
      (await ertekesitesApi.changeAjanlatAllapot(id, { allapot: "elkuldve" }, szereplo))
        .ok,
    ).toBe(true);
    const d = await ertekesitesApi.getAjanlat(iro, id);
    expect(d?.kuldveAt).toBeDefined();
    expect(d?.utankovetes).toBeDefined();
    expect(d?.elozmenyek.map((e) => e.allapot)).toEqual(["piszkozat", "elkuldve"]);
  });

  it("üres ajánlat nem küldhető; elutasításhoz ok kell", async () => {
    const ures = await ujAjanlat({ sorok: [] });
    expect(
      (await ertekesitesApi.changeAjanlatAllapot(ures, { allapot: "elkuldve" }, szereplo))
        .ok,
    ).toBe(false);
    const id = await ujAjanlat();
    await ertekesitesApi.changeAjanlatAllapot(id, { allapot: "elkuldve" }, szereplo);
    expect(
      (await ertekesitesApi.changeAjanlatAllapot(id, { allapot: "elutasitva" }, szereplo))
        .ok,
    ).toBe(false);
    expect(
      (
        await ertekesitesApi.changeAjanlatAllapot(
          id,
          { allapot: "elutasitva", elvesztesOka: "ar" },
          szereplo,
        )
      ).ok,
    ).toBe(true);
  });

  it("elfogadáskor ajanlat.elfogadva esemény megy; a hibás figyelő nem akadályoz", async () => {
    const kapott = vi.fn();
    onDomainEvent("ajanlat.elfogadva", () => {
      throw new Error("figyelő hiba");
    });
    onDomainEvent("ajanlat.elfogadva", kapott);
    const id = await ujAjanlat();
    await ertekesitesApi.changeAjanlatAllapot(id, { allapot: "elkuldve" }, szereplo);
    const r = await ertekesitesApi.changeAjanlatAllapot(
      id,
      { allapot: "elfogadva" },
      szereplo,
    );
    expect(r.ok).toBe(true);
    expect(kapott).toHaveBeenCalledWith(
      expect.objectContaining({ ajanlatId: id, partnerId: "p1", bruttoOsszeg: 127000 }),
    );
    expect((await ertekesitesApi.getAjanlat(iro, id))?.allapot).toBe("elfogadva");
  });

  it("archiválás okkal, listából eltűnik, visszaállítható", async () => {
    const id = await ujAjanlat();
    await ertekesitesApi.archivAjanlat(id, "Duplikátum", szereplo);
    expect((await ertekesitesApi.listAjanlatok(query)).total).toBe(0);
    expect(
      (await ertekesitesApi.listAjanlatok(query, { archivaltakkal: true })).total,
    ).toBe(1);
    expect((await ertekesitesApi.getAjanlat(iro, id))?.archivalasOka).toBe("Duplikátum");
    expect((await ertekesitesApi.updateAjanlat(id, ajanlat(), partner)).ok).toBe(false);
    await ertekesitesApi.restoreAjanlat(id);
    expect((await ertekesitesApi.listAjanlatok(query)).total).toBe(1);
  });

  it("listMyAssignments: a felelős nyitott ajánlatai", async () => {
    await ujAjanlat();
    const refs = await ertekesitesApi.listMyAssignments(szereplo.id);
    expect(refs).toHaveLength(1);
    expect(refs[0]?.url).toMatch(/^\/ertekesites\/ajanlatok\//);
  });
});

describe("Szerződés", () => {
  const sablonInput = () =>
    szerzodesSablonSchema.parse({
      nev: "Karbantartás",
      kategoria: "Szerviz",
      szoveg: "<p>{{partner_nev}} havi díja: {{dij}} Ft</p>",
    });

  it("sablonból generál, újrarendereli szerkesztéskor, a sablon módosítása nem hat rá", async () => {
    const s = await ertekesitesApi.createSablon(sablonInput());
    expect((await ertekesitesApi.getSablon(s.id))?.valtozok).toEqual(["dij"]);
    const input = szerzodesSchema.parse({
      tipus: "generalt",
      nev: "Karbantartási szerződés",
      kategoria: "Szerviz",
      partnerId: "p1",
      sablonId: s.id,
      valtozok: { dij: "10 000" },
    });
    const r = await ertekesitesApi.createSzerzodes(
      input,
      { partnerNev: "Acme Kft." },
      szereplo,
    );
    if (!r.ok || !r.id) throw new Error("create failed");
    const d = await ertekesitesApi.getSzerzodes(r.id);
    expect(d?.azonosito).toBe("SZ-000001");
    expect(d?.szoveg).toBe("<p>Acme Kft. havi díja: 10 000 Ft</p>");

    await ertekesitesApi.updateSablon(
      s.id,
      szerzodesSablonSchema.parse({ ...sablonInput(), szoveg: "teljesen más" }),
    );
    await ertekesitesApi.updateSzerzodes(
      r.id,
      { ...input, valtozok: { dij: "20 000" } },
      { partnerNev: "Acme Kft." },
    );
    expect((await ertekesitesApi.getSzerzodes(r.id))?.szoveg).toBe(
      "<p>Acme Kft. havi díja: 20 000 Ft</p>",
    );
  });

  it("hiányzó változónál hiba; küldés után nem szerkeszthető; aláírás szabályok", async () => {
    const s = await ertekesitesApi.createSablon(sablonInput());
    const input = szerzodesSchema.parse({
      tipus: "generalt",
      nev: "X",
      kategoria: "Szerviz",
      partnerId: "p1",
      sablonId: s.id,
      valtozok: {},
      alairasTipus: "digitalis",
    });
    expect(
      (await ertekesitesApi.createSzerzodes(input, { partnerNev: "A" }, szereplo)).ok,
    ).toBe(false);
    const r = await ertekesitesApi.createSzerzodes(
      { ...input, valtozok: { dij: "1" } },
      { partnerNev: "A" },
      szereplo,
    );
    if (!r.ok || !r.id) throw new Error("create failed");
    await ertekesitesApi.changeSzerzodesAllapot(r.id, { allapot: "elkuldve" }, szereplo);
    expect(
      await ertekesitesApi.updateSzerzodes(
        r.id,
        { ...input, valtozok: { dij: "2" } },
        { partnerNev: "A" },
      ),
    ).toMatchObject({ ok: false, code: "nem_szerkesztheto" });
    expect(
      (
        await ertekesitesApi.changeSzerzodesAllapot(
          r.id,
          { allapot: "digitalisan_alairt" },
          szereplo,
        )
      ).ok,
    ).toBe(false);
    expect(
      (
        await ertekesitesApi.changeSzerzodesAllapot(
          r.id,
          { allapot: "digitalisan_alairt", ugyfelNev: "Kiss Béla" },
          szereplo,
        )
      ).ok,
    ).toBe(true);
    const d = await ertekesitesApi.getSzerzodes(r.id);
    expect(d?.alairtAt).toBeDefined();
    expect(
      (
        await ertekesitesApi.changeSzerzodesAllapot(
          r.id,
          { allapot: "piszkozat" },
          szereplo,
        )
      ).ok,
    ).toBe(false);
  });

  it("feltöltött szerződéshez fájl hivatkozás kell", async () => {
    const input = szerzodesSchema.parse({
      tipus: "feltoltott",
      nev: "Papír",
      kategoria: "Egyéb",
      partnerId: "p1",
    });
    expect(
      (await ertekesitesApi.createSzerzodes(input, { partnerNev: "A" }, szereplo)).ok,
    ).toBe(false);
    expect(
      (
        await ertekesitesApi.createSzerzodes(
          { ...input, fajlHivatkozas: "/media/abc" },
          { partnerNev: "A" },
          szereplo,
        )
      ).ok,
    ).toBe(true);
  });
});

describe("Megrendelőlap", () => {
  const input = () =>
    megrendeloSchema.parse({
      beszallitoId: "s1",
      sorok: [
        {
          leiras: "Kamera",
          mennyiseg: 3,
          egyseg: "db",
          nettoEgysegar: 10000,
          afaKulcs: 27,
        },
      ],
    });
  const kuldve = async () => {
    const r = await ertekesitesApi.createMegrendelo(
      input(),
      { beszallitoNev: "Besz Kft." },
      szereplo,
    );
    await ertekesitesApi.changeMegrendeloAllapot(r.id, "elkuldve", szereplo);
    return r.id;
  };

  it("összeget számol, sorszámot ad, csak piszkozat szerkeszthető", async () => {
    const r = await ertekesitesApi.createMegrendelo(
      input(),
      { beszallitoNev: "Besz Kft." },
      szereplo,
    );
    const d = await ertekesitesApi.getMegrendelo(r.id);
    expect(d?.azonosito).toBe("MR-000001");
    expect(d?.bruttoOsszeg).toBe(38100);
    await ertekesitesApi.changeMegrendeloAllapot(r.id, "elkuldve", szereplo);
    expect(
      await ertekesitesApi.updateMegrendelo(r.id, input(), { beszallitoNev: "X" }),
    ).toMatchObject({ ok: false, code: "nem_szerkesztheto" });
  });

  it("teljesítéskor meghívja a készlet portot és rögzíti az eredményt", async () => {
    const id = await kuldve();
    const bevetelez = vi.fn().mockResolvedValue({ ok: true, uzenet: "3 db bevételezve" });
    const port: KeszletBevetelPort = { bevetelez };
    expect((await ertekesitesApi.teljesitMegrendelo(id, szereplo, port)).ok).toBe(true);
    expect(bevetelez).toHaveBeenCalledTimes(1);
    expect(bevetelez.mock.calls[0]?.[1]).toMatchObject({ tipus: "megrendelolap", id });
    const d = await ertekesitesApi.getMegrendelo(id);
    expect(d?.allapot).toBe("teljesitve");
    expect(d?.bevetelezes).toMatchObject({ ok: true, uzenet: "3 db bevételezve" });
    // Második teljesítés nem hívja újra a portot.
    expect((await ertekesitesApi.teljesitMegrendelo(id, szereplo, port)).ok).toBe(false);
    expect(bevetelez).toHaveBeenCalledTimes(1);
  });

  it("port nélkül is teljesül; sikertelen port jelölve, újrapróbálható", async () => {
    const a = await kuldve();
    expect((await ertekesitesApi.teljesitMegrendelo(a, szereplo)).ok).toBe(true);
    expect((await ertekesitesApi.getMegrendelo(a))?.bevetelezes).toBeUndefined();

    const b = await kuldve();
    const bevetelez = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, message: "raktár nem elérhető" })
      .mockResolvedValueOnce({ ok: true });
    const port: KeszletBevetelPort = { bevetelez };
    const r = await ertekesitesApi.teljesitMegrendelo(b, szereplo, port);
    expect(r.ok).toBe(false);
    const d = await ertekesitesApi.getMegrendelo(b);
    expect(d?.allapot).toBe("teljesitve");
    expect(d?.bevetelezes).toMatchObject({ ok: false, uzenet: "raktár nem elérhető" });
    expect((await ertekesitesApi.ujraBevetelezMegrendelo(b, port)).ok).toBe(true);
    expect((await ertekesitesApi.getMegrendelo(b))?.bevetelezes?.ok).toBe(true);
    // Már sikeres: nincs újabb hívás.
    await ertekesitesApi.ujraBevetelezMegrendelo(b, port);
    expect(bevetelez).toHaveBeenCalledTimes(2);
  });

  it("piszkozat nem teljesíthető közvetlenül", async () => {
    const r = await ertekesitesApi.createMegrendelo(
      input(),
      { beszallitoNev: "B" },
      szereplo,
    );
    expect((await ertekesitesApi.teljesitMegrendelo(r.id, szereplo)).ok).toBe(false);
  });
});
