import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import { createTestMongo } from "@erp/test-utils/mongo-memory";
import { connectDB, getNativeClient } from "@erp/db-core";
import type { DataTableQuery } from "@erp/ui";
import { arlistaApi } from "./api";
import {
  ARLISTA_PERMISSIONS,
  ALAP_ARAZASI_BEALLITASOK,
  type ArlistaViewer,
} from "./constants";
import { createTermekSchema, szolgaltatasSchema } from "./validation";

let mongo: MongoMemoryServer;

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

const lat: ArlistaViewer = {
  userId: "u1",
  permissions: [ARLISTA_PERMISSIONS.termekRead],
};
const titkosLat: ArlistaViewer = {
  userId: "u2",
  permissions: [
    ARLISTA_PERMISSIONS.termekRead,
    ARLISTA_PERMISSIONS.beszerzesRead,
    ARLISTA_PERMISSIONS.beszerzesWrite,
  ],
};
const query: DataTableQuery = {
  page: 1,
  pageSize: 50,
  filters: {},
} as unknown as DataTableQuery;

function termek(extra: Record<string, unknown> = {}) {
  return createTermekSchema.parse({
    nev: "Switch 24 port",
    kategoria: "Hálózat",
    egyseg: "db",
    nettoAr: 50_000,
    ...extra,
  });
}

async function letrehoz(extra: Record<string, unknown> = {}): Promise<string> {
  const r = await arlistaApi.createTermek(termek(extra));
  if (!r.ok || !r.id) throw new Error("create failed");
  return r.id;
}

describe("termék katalógus", () => {
  it("előtag-alapú, folyamatos kódgenerálás, előtagonként külön számláló", async () => {
    const ids = [
      await letrehoz(),
      await letrehoz({ nev: "Patch kábel" }),
      await letrehoz({ nev: "Telepítés", tipus: "munkadij" }),
      await letrehoz({ nev: "Egyedi", kodElotag: "xy" }),
    ];
    const kodok: Array<string | undefined> = [];
    for (const id of ids) kodok.push((await arlistaApi.getTermek(titkosLat, id))?.kod);
    expect(kodok).toEqual(["HW-0001", "HW-0002", "MD-0001", "XY-0001"]);
  });

  it("a beszerzési adat a facade-ban levágva: a kulcs sem kerül a válaszba", async () => {
    const id = await letrehoz();
    const hozzaad = await arlistaApi.addBeszerzes(titkosLat, id, {
      beszallitoNev: "Titkos Kft.",
      nettoBeszerzesiAr: 31_000,
      beszerzesDatuma: new Date("2026-01-10"),
    });
    expect(hozzaad.ok).toBe(true);
    await arlistaApi.addBeszerzes(titkosLat, id, {
      beszallitoNev: "Újabb Zrt.",
      nettoBeszerzesiAr: 29_500,
      beszerzesDatuma: new Date("2026-03-01"),
    });

    const lathato = await arlistaApi.getTermek(lat, id);
    expect(lathato).not.toBeNull();
    expect("beszerzes" in lathato!).toBe(false);
    expect("utolsoBeszerzesiAr" in lathato!).toBe(false);
    expect(JSON.stringify(lathato)).not.toContain("Titkos Kft.");

    const titkos = await arlistaApi.getTermek(titkosLat, id);
    expect(titkos?.beszerzes?.beszerzesiAdatok).toHaveLength(2);
    expect(titkos?.beszerzes?.utolsoBeszerzesiAr).toBe(29_500);
    expect(titkos?.beszerzes?.elonyosBeszallito).toBe("Újabb Zrt.");

    const listaLat = await arlistaApi.listTermekek(lat, query);
    expect(JSON.stringify(listaLat.data)).not.toContain("utolsoBeszerzesiAr");
    expect(JSON.stringify(listaLat.data)).not.toContain("Titkos");
    const listaTitkos = await arlistaApi.listTermekek(titkosLat, query);
    expect(listaTitkos.data[0]?.utolsoBeszerzesiAr).toBe(29_500);
  });

  it("beszerzési rekord írása jogosultság nélkül elutasítva; törlés újraszámol", async () => {
    const id = await letrehoz();
    const input = {
      beszallitoNev: "X",
      nettoBeszerzesiAr: 1,
      beszerzesDatuma: new Date(),
    };
    expect((await arlistaApi.addBeszerzes(lat, id, input)).ok).toBe(false);
    await arlistaApi.addBeszerzes(titkosLat, id, input);
    const reszlet = await arlistaApi.getTermek(titkosLat, id);
    const bid = reszlet!.beszerzes!.beszerzesiAdatok[0]!._id;
    expect((await arlistaApi.removeBeszerzes(lat, id, bid)).ok).toBe(false);
    expect((await arlistaApi.removeBeszerzes(titkosLat, id, bid)).ok).toBe(true);
    const utana = await arlistaApi.getTermek(titkosLat, id);
    expect(utana?.beszerzes?.utolsoBeszerzesiAr).toBeUndefined();
  });

  it("archiválás okkal; archivált kimarad a listából, nem szerkeszthető, visszaállítható", async () => {
    const id = await letrehoz();
    expect((await arlistaApi.archivalTermek(id, "  ")).ok).toBe(false);
    expect((await arlistaApi.archivalTermek(id, "Kivezetett típus")).ok).toBe(true);
    expect((await arlistaApi.listTermekek(lat, query)).total).toBe(0);
    const d = await arlistaApi.getTermek(lat, id);
    expect(d).toMatchObject({
      archivalt: true,
      aktiv: false,
      archivalasOka: "Kivezetett típus",
    });
    const { tipus: _tipus, kodElotag: _kodElotag, ...modositas } = termek();
    void _tipus;
    void _kodElotag;
    expect((await arlistaApi.updateTermek(id, { ...modositas, nev: "Új név" })).ok).toBe(
      false,
    );
    expect((await arlistaApi.visszaallitTermek(id)).ok).toBe(true);
    expect((await arlistaApi.listTermekek(lat, query)).total).toBe(1);
  });
});

describe("szolgáltatások és árképzés", () => {
  async function kategoria(elotag = "IT") {
    await arlistaApi.createKategoria({
      nev: "IT",
      kodElotag: elotag,
      ikon: "Monitor",
      szin: "#6366f1",
      sorrend: 1,
      aktiv: true,
    });
    return (await arlistaApi.listKategoriak())[0]!;
  }

  async function szolgaltatas(extra: Record<string, unknown>): Promise<string> {
    const k = await kategoria();
    const r = await arlistaApi.createSzolgaltatas(
      szolgaltatasSchema.parse({ kategoriaId: k._id, egyseg: "db", ...extra }),
    );
    if (!r.ok || !r.id) throw new Error("create failed");
    return r.id;
  }

  it("alap kategóriák seedelése idempotens", async () => {
    expect((await arlistaApi.seedAlapKategoriak()).letrehozva).toBe(10);
    expect((await arlistaApi.seedAlapKategoriak()).letrehozva).toBe(0);
    expect(await arlistaApi.listKategoriak()).toHaveLength(10);
  });

  it("kategória-fa és kódgenerálás a kategória előtagjával; előtag egyedi", async () => {
    const k = await kategoria();
    const duplikalt = await arlistaApi.createKategoria({
      nev: "Másik",
      kodElotag: "IT",
      ikon: "Tag",
      szin: "#000000",
      sorrend: 2,
      aktiv: true,
    });
    expect(duplikalt.ok).toBe(false);
    const al = await arlistaApi.createAlkategoria({
      kategoriaId: k._id,
      nev: "Szerver",
      sorrend: 1,
      aktiv: true,
    });
    expect(al.ok).toBe(true);
    const alId = (al as { id: string }).id;
    const r = await arlistaApi.createSzolgaltatas(
      szolgaltatasSchema.parse({
        kategoriaId: k._id,
        alkategoriaId: alId,
        nev: "Szerver karbantartás",
        egyseg: "óra",
        arazasiTipus: "oradij",
        oradijKategoria: "it_uzemeltetes",
      }),
    );
    expect(r.ok).toBe(true);
    expect((await arlistaApi.listSzolgaltatasok())[0]?.kod).toBe("IT-0001");
    expect((await arlistaApi.listKategoriak())[0]?.alkategoriak).toHaveLength(1);
    expect((await arlistaApi.deleteAlkategoria(alId)).ok).toBe(false);
  });

  it("beállítások: alapérték mentés előtt, mentés után a módosított", async () => {
    expect(await arlistaApi.getBeallitasok()).toEqual(ALAP_ARAZASI_BEALLITASOK);
    await arlistaApi.saveBeallitasok(
      {
        ...ALAP_ARAZASI_BEALLITASOK,
        ugyfelSzorzok: { ...ALAP_ARAZASI_BEALLITASOK.ugyfelSzorzok, kkv_1_eves: 1.5 },
      },
      "u1",
    );
    const be = await arlistaApi.getBeallitasok();
    expect(be.ugyfelSzorzok.kkv_1_eves).toBe(1.5);
    expect(be.ugyfelSzorzok.maganszemely).toBe(1.3);
  });

  it("priceSnapshot: befagyasztott ár; későbbi beállítás-változás nem érinti a kiadott snapshotot", async () => {
    const id = await szolgaltatas({
      nev: "Helyszíni kiszállás",
      egyseg: "alkalom",
      arazasiTipus: "fix",
      belsoAlapar: 10_000,
    });
    const profil = { ugyfelKategoria: "kkv" as const, szerzodesTipus: "1_eves" as const };
    const r = await arlistaApi.priceSnapshot(id, {
      partnerProfil: profil,
      surgosseg: "hetvege",
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.snapshot).toMatchObject({
      forras: "szolgaltatas",
      kod: "IT-0001",
      szorzoKulcs: "kkv_1_eves",
      ugyfelSzorzo: 1,
      kalkulaltAr: 10_000,
      surgosseg: "hetvege",
      vegAr: 17_500,
      egyedi: false,
      afaKulcs: 27,
    });
    const regi = structuredClone(r.snapshot);
    await arlistaApi.saveBeallitasok(
      {
        ...ALAP_ARAZASI_BEALLITASOK,
        ugyfelSzorzok: { ...ALAP_ARAZASI_BEALLITASOK.ugyfelSzorzok, kkv_1_eves: 2 },
      },
      "u1",
    );
    const uj = await arlistaApi.priceSnapshot(id, { partnerProfil: profil });
    expect(uj.ok && uj.snapshot.vegAr).toBe(20_000);
    expect(r.snapshot).toEqual(regi);
  });

  it("priceSnapshot termékre: a nettó ár, titkos mező nélkül; archivált/ismeretlen elutasítva", async () => {
    const id = await letrehoz();
    await arlistaApi.addBeszerzes(titkosLat, id, {
      beszallitoNev: "Titkos Kft.",
      nettoBeszerzesiAr: 1,
      beszerzesDatuma: new Date(),
    });
    const r = await arlistaApi.priceSnapshot(id, { partnerProfil: {} });
    expect(r.ok && r.snapshot).toMatchObject({
      forras: "termek",
      vegAr: 50_000,
      afaKulcs: 27,
    });
    expect(JSON.stringify(r)).not.toContain("Titkos");
    await arlistaApi.archivalTermek(id, "Kivezetve");
    expect((await arlistaApi.priceSnapshot(id, { partnerProfil: {} })).ok).toBe(false);
    const ismeretlen = String(new mongoose.Types.ObjectId());
    expect((await arlistaApi.priceSnapshot(ismeretlen, { partnerProfil: {} })).ok).toBe(
      false,
    );
    expect((await arlistaApi.priceSnapshot("nem-id", { partnerProfil: {} })).ok).toBe(
      false,
    );
  });

  it("egyedi árajánlatú szolgáltatás snapshotja 0 és egyedi", async () => {
    const id = await szolgaltatas({ nev: "Egyedi", arazasiTipus: "egyedi" });
    const r = await arlistaApi.priceSnapshot(id, { partnerProfil: {} });
    expect(r.ok && r.snapshot).toMatchObject({ egyedi: true, vegAr: 0 });
  });
});
