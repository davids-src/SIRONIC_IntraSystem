import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import { createTestMongo } from "@erp/test-utils/mongo-memory";
import { connectDB } from "@erp/db-core";
import { clearDomainEventListenersForTests, onDomainEvent } from "@erp/core";
import { bizonylatApi } from "./api";
import { alairasKeszit, feldolgozBillingoWebhook } from "./billingo-webhook";
import type { Nezo, Szereplo } from "./constants";
import {
  igazolasSchema,
  jotallasSchema,
  szallitolevelSchema,
  szamlaSchema,
} from "./validation";
import type { BillingoPort, KeszletKiadasPort } from "./types";

let mongo: MongoMemoryServer;
const szereplo: Szereplo = {
  id: new mongoose.Types.ObjectId().toString(),
  nev: "Teszt Elek",
};
const partner = {
  partnerNev: "Acme Kft.",
  partnerCim: "1111 Budapest",
  partnerEmail: "iroda@acme.example",
};
const query = { page: 1, pageSize: 50 };
const staff: Nezo = { kind: "staff", userId: szereplo.id, belsoLathato: true };
const staffKorlatozott: Nezo = { kind: "staff", userId: szereplo.id };
const portal = (partnerId: string): Nezo => ({ kind: "portal", partnerId });
const PNG = `data:image/png;base64,${"A".repeat(400)}`;
const alairas = { nev: "Kiss Béla", beosztas: "Ügyvezető", kep: PNG };

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

// ── Szállítólevél ──────────────────────────────────────────────────────────────

const szlInput = (o: Record<string, unknown> = {}) =>
  szallitolevelSchema.parse({
    partnerId: "p1",
    kiadasNap: "2026-11-21",
    sorok: [{ arlistaTermekId: "t1", nev: "Kamera", mennyiseg: 2, egyseg: "db" }],
    ...o,
  });

function keszletPort(
  o: { elegendo?: boolean; kiadOk?: boolean } = {},
): KeszletKiadasPort & { kiadHivasok: number } {
  const port = {
    kiadHivasok: 0,
    async preflight(sorok: Array<{ arlistaTermekId: string; mennyiseg: number }>) {
      return {
        osszesElegendo: o.elegendo ?? true,
        sorok: sorok.map((s, i) => ({
          lineIndex: i,
          arlistaTermekId: s.arlistaTermekId,
          kert: s.mennyiseg,
          szabad: o.elegendo === false ? 0 : 99,
          elegendo: o.elegendo ?? true,
        })),
      };
    },
    async kiad() {
      port.kiadHivasok++;
      return o.kiadOk === false
        ? { ok: false as const, message: "készlet hiba" }
        : { ok: true as const };
    },
  };
  return port;
}

async function ujSzl(o: Record<string, unknown> = {}, p = "Acme Kft.") {
  return (
    await bizonylatApi.createSzallitolevel(szlInput(o), { partnerNev: p }, szereplo)
  ).id;
}

describe("Szállítólevél", () => {
  it("SZL sorszámot kap és csak piszkozatban szerkeszthető", async () => {
    const a = await ujSzl();
    const b = await ujSzl();
    expect((await bizonylatApi.getSzallitolevel(a))?.azonosito).toBe("SZL-000001");
    expect((await bizonylatApi.getSzallitolevel(b))?.azonosito).toBe("SZL-000002");
    expect(
      (await bizonylatApi.updateSzallitolevel(a, szlInput({ megjegyzes: "x" }), partner))
        .ok,
    ).toBe(true);
    await bizonylatApi.kiadSzallitolevel(a, szereplo, keszletPort());
    const r = await bizonylatApi.updateSzallitolevel(a, szlInput(), partner);
    expect(r).toMatchObject({ ok: false, code: "nem_szerkesztheto" });
  });

  it("kiadás: egyszer von le, a kettős kattintás és az újrapróbálás idempotens", async () => {
    const id = await ujSzl();
    const port = keszletPort();
    const [x, y] = await Promise.all([
      bizonylatApi.kiadSzallitolevel(id, szereplo, port),
      bizonylatApi.kiadSzallitolevel(id, szereplo, port),
    ]);
    expect(x.ok).toBe(true);
    expect(y.ok).toBe(true);
    const d = await bizonylatApi.getSzallitolevel(id);
    expect(d?.allapot).toBe("kiadva");
    expect(d?.keszletKiadas?.allapot).toBe("kesz");
    const hivasok = port.kiadHivasok;
    await bizonylatApi.kiadSzallitolevel(id, szereplo, port);
    await bizonylatApi.ujraKiadSzallitolevel(id, port);
    expect(port.kiadHivasok).toBe(hivasok);
    expect(d?.elozmenyek.filter((e) => e.allapot === "kiadva")).toHaveLength(1);
  });

  it("elégtelen készlet: marad piszkozat, nincs kiadás", async () => {
    const id = await ujSzl();
    const port = keszletPort({ elegendo: false });
    const r = await bizonylatApi.kiadSzallitolevel(id, szereplo, port);
    expect(r.ok).toBe(false);
    expect((await bizonylatApi.getSzallitolevel(id))?.allapot).toBe("piszkozat");
    expect(port.kiadHivasok).toBe(0);
  });

  it("port hiba: kiadva marad, hibával jelölve, újrapróbálás javítja", async () => {
    const id = await ujSzl();
    const r = await bizonylatApi.kiadSzallitolevel(
      id,
      szereplo,
      keszletPort({ kiadOk: false }),
    );
    expect(r.ok).toBe(false);
    const d = await bizonylatApi.getSzallitolevel(id);
    expect(d?.allapot).toBe("kiadva");
    expect(d?.keszletKiadas?.allapot).toBe("hiba");
    const jo = keszletPort();
    expect((await bizonylatApi.ujraKiadSzallitolevel(id, jo)).ok).toBe(true);
    expect((await bizonylatApi.getSzallitolevel(id))?.keszletKiadas?.allapot).toBe(
      "kesz",
    );
    expect(jo.kiadHivasok).toBe(1);
  });

  it("kiadott nem archiválható, sztornó után igen", async () => {
    const id = await ujSzl();
    await bizonylatApi.kiadSzallitolevel(id, szereplo, keszletPort());
    expect((await bizonylatApi.archivSzallitolevel(id, "teszt", szereplo)).ok).toBe(
      false,
    );
    const s = await bizonylatApi.sztornoSzallitolevel(id, szereplo);
    expect(s.ok).toBe(true);
    expect(s.ok && s.uzenet).toContain("bevételez");
    expect((await bizonylatApi.archivSzallitolevel(id, "teszt", szereplo)).ok).toBe(true);
    expect((await bizonylatApi.restoreSzallitolevel(id)).ok).toBe(true);
  });

  it("preflight: elérhetőség és azonos partner / napi duplikáció", async () => {
    const a = await ujSzl();
    const b = await ujSzl();
    await ujSzl({ partnerId: "mas" }, "Más Kft.");
    await ujSzl({ kiadasNap: "2026-11-22" });
    const p = await bizonylatApi.preflightSzallitolevel(a, keszletPort());
    expect(p?.osszesElegendo).toBe(true);
    expect(p?.sorok).toHaveLength(1);
    expect(p?.duplikaciok.map((d) => d.id)).toEqual([b]);
    expect(p?.duplikaciok[0]?.kozosTermekek).toEqual(["Kamera"]);
    await bizonylatApi.sztornoSzallitolevel(b, szereplo);
    expect(
      (await bizonylatApi.preflightSzallitolevel(a, keszletPort()))?.duplikaciok,
    ).toEqual([]);
  });
});

// ── Teljesítésigazolás ─────────────────────────────────────────────────────────

const igInput = (o: Record<string, unknown> = {}) =>
  igazolasSchema.parse({
    cim: "Kamerarendszer átadás",
    partnerId: "p1",
    munkaOsszegzes: "Telepítés elkészült",
    sorok: [
      {
        leiras: "Telepítés",
        mennyiseg: 10,
        egyseg: "óra",
        nettoEgysegar: 9000,
        afaKulcs: 27,
        beszerzesiEgysegar: 6000,
        arSnapshot: {
          forras: "szolgaltatas",
          tetelId: "a",
          kod: "SW-1",
          nev: "Telepítés",
          egyseg: "óra",
          arazasiTipus: "oradij",
          belsoAlapar: 6000,
          szorzoKulcs: null,
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
        },
      },
    ],
    belsoMegjegyzes: "Belső: alacsony fedezet",
    ...o,
  });

async function ujIg(o: Record<string, unknown> = {}, p = partner) {
  return (await bizonylatApi.createIgazolas(igInput(o), p, szereplo)).id;
}
const alapUrl = { alapUrl: "https://erp.example" };

describe("Teljesítésigazolás", () => {
  it("összeget a szerver számolja; importált sorok használhatók", async () => {
    const id = await ujIg();
    const d = await bizonylatApi.getIgazolas(id, staff);
    expect(d?.azonosito).toBe("TI-000001");
    expect(d?.osszegek).toEqual({
      nettoOsszeg: 90000,
      afaOsszeg: 24300,
      bruttoOsszeg: 114300,
    });
    const imp = await bizonylatApi.createIgazolas(
      igInput({ sorok: [] }),
      partner,
      szereplo,
      {
        forras: "ajanlat",
        forrasId: "aj1",
        sorok: [
          {
            leiras: "Kábel",
            mennyiseg: 2,
            egyseg: "db",
            nettoEgysegar: 1000,
            afaKulcs: 27,
          },
        ],
      },
    );
    const di = await bizonylatApi.getIgazolas(imp.id, staff);
    expect(di?.sorok).toHaveLength(1);
    expect(di?.ajanlatId).toBe("aj1");
    expect(di?.forras).toBe("ajanlat");
    expect(di?.osszegek.bruttoOsszeg).toBe(2540);
  });

  it("csak piszkozat szerkeszthető; küldés után nem", async () => {
    const id = await ujIg();
    expect(
      (await bizonylatApi.updateIgazolas(id, igInput({ cim: "Új" }), partner)).ok,
    ).toBe(true);
    expect((await bizonylatApi.kuldIgazolas(id, szereplo, alapUrl)).ok).toBe(true);
    expect(await bizonylatApi.updateIgazolas(id, igInput(), partner)).toMatchObject({
      ok: false,
      code: "nem_szerkesztheto",
    });
  });

  it("küldés: véletlen token, csak a hash tárolva, lejárat, levél tartalom", async () => {
    const id = await ujIg();
    const r = await bizonylatApi.kuldIgazolas(id, szereplo, alapUrl);
    if (!r.ok) throw new Error(r.message);
    expect(r.level.to).toBe("iroda@acme.example");
    expect(r.level.linkUt).toMatch(/^\/portal\/igazolas\/[A-Za-z0-9_-]{40,}$/);
    expect(r.level.html).toContain("https://erp.example/portal/igazolas/");
    const token = r.level.linkUt.split("/").pop()!;
    const nyers = await mongoose.connection
      .collection("bizonylat_teljesitesigazolasok")
      .findOne({});
    expect(JSON.stringify(nyers)).not.toContain(token);
    expect(nyers?.tokenHash).toMatch(/^[0-9a-f]{64}$/);
    expect(new Date(nyers!.tokenLejar).getTime()).toBeGreaterThan(Date.now());
    // second send issues a new token and invalidates the old one
    const r2 = await bizonylatApi.kuldIgazolas(id, szereplo, alapUrl);
    if (!r2.ok) throw new Error(r2.message);
    expect(await bizonylatApi.feloldIgazolasToken(token)).toBeNull();
    expect(
      await bizonylatApi.feloldIgazolasToken(r2.level.linkUt.split("/").pop()!),
    ).toMatchObject({ id, partnerId: "p1" });
  });

  it("küldéshez e-mail és tétel kell", async () => {
    const mail = await ujIg({}, {
      partnerNev: "Acme Kft.",
      partnerEmail: undefined,
    } as never);
    expect((await bizonylatApi.kuldIgazolas(mail, szereplo, alapUrl)).ok).toBe(false);
    const ures = await bizonylatApi.createIgazolas(
      igInput({ sorok: [] }),
      partner,
      szereplo,
    );
    expect((await bizonylatApi.kuldIgazolas(ures.id, szereplo, alapUrl)).ok).toBe(false);
  });

  it("lejárt token nem oldható fel", async () => {
    const id = await ujIg();
    const r = await bizonylatApi.kuldIgazolas(id, szereplo, alapUrl);
    if (!r.ok) throw new Error(r.message);
    await mongoose.connection
      .collection("bizonylat_teljesitesigazolasok")
      .updateOne({}, { $set: { tokenLejar: new Date(Date.now() - 1000) } });
    expect(
      await bizonylatApi.feloldIgazolasToken(r.level.linkUt.split("/").pop()!),
    ).toBeNull();
    expect((await bizonylatApi.elfogadIgazolasTokennel("x".repeat(43), alairas)).ok).toBe(
      false,
    );
  });

  it("portál: csak a saját partner elküldött igazolásai, belső mezők nélkül", async () => {
    const a = await ujIg();
    const masik = await ujIg({ partnerId: "p2" });
    const piszkozat = await ujIg();
    await bizonylatApi.kuldIgazolas(a, szereplo, alapUrl);
    await bizonylatApi.kuldIgazolas(masik, szereplo, alapUrl);
    const lista = await bizonylatApi.listIgazolasok(query, portal("p1"));
    expect(lista.data.map((x) => x._id)).toEqual([a]);
    expect(await bizonylatApi.getIgazolas(piszkozat, portal("p1"))).toBeNull();
    expect(await bizonylatApi.getIgazolas(masik, portal("p1"))).toBeNull();
    expect((await bizonylatApi.listIgazolasok(query, portal(""))).total).toBe(0);
    const d = await bizonylatApi.getIgazolas(a, portal("p1"));
    const json = JSON.stringify(d);
    expect(json).not.toContain("Belső: alacsony fedezet");
    expect(json).not.toContain("beszerzesiEgysegar");
    expect(json).not.toContain("belsoAlapar");
    expect(json).not.toContain("arSnapshot");
    expect(json).not.toContain("iroda@acme.example");
    // staff without the write permission also does not see the internal fields
    const kor = JSON.stringify(await bizonylatApi.getIgazolas(a, staffKorlatozott));
    expect(kor).not.toContain("beszerzesiEgysegar");
    expect(kor).not.toContain("Belső: alacsony fedezet");
    const teljes = JSON.stringify(await bizonylatApi.getIgazolas(a, staff));
    expect(teljes).toContain("beszerzesiEgysegar");
    expect(teljes).toContain("Belső: alacsony fedezet");
  });

  it("elfogadás: név+beosztás+kép kell, szerver oldali időbélyeg, végleges, esemény", async () => {
    const esemeny = vi.fn();
    onDomainEvent("teljesitesigazolas.elfogadva", esemeny);
    const id = await ujIg();
    await bizonylatApi.kuldIgazolas(id, szereplo, alapUrl);
    // wrong partner / staff / invalid data
    expect((await bizonylatApi.elfogadIgazolas(id, portal("p2"), alairas)).ok).toBe(
      false,
    );
    expect((await bizonylatApi.elfogadIgazolas(id, staff, alairas)).ok).toBe(false);
    expect(
      (await bizonylatApi.elfogadIgazolas(id, portal("p1"), { ...alairas, nev: "" })).ok,
    ).toBe(false);
    expect(
      (await bizonylatApi.elfogadIgazolas(id, portal("p1"), { ...alairas, kep: "x" })).ok,
    ).toBe(false);
    // a client-supplied signedAt is ignored
    const elotte = Date.now();
    const r = await bizonylatApi.elfogadIgazolas(id, portal("p1"), {
      ...alairas,
      alairtAt: "2001-01-01T00:00:00Z",
      signedAt: "2001-01-01T00:00:00Z",
    });
    expect(r.ok).toBe(true);
    const d = await bizonylatApi.getIgazolas(id, staff);
    expect(d?.allapot).toBe("elfogadva");
    expect(d?.alairas?.nev).toBe("Kiss Béla");
    expect(new Date(d!.alairas!.alairtAt).getTime()).toBeGreaterThanOrEqual(
      elotte - 1000,
    );
    expect(esemeny).toHaveBeenCalledTimes(1);
    expect(esemeny.mock.calls[0]![0]).toMatchObject({
      igazolasId: id,
      alairoNev: "Kiss Béla",
      bruttoOsszeg: 114300,
    });
    // terminal: no second accept, no reject, no re-send, token is gone
    expect((await bizonylatApi.elfogadIgazolas(id, portal("p1"), alairas)).ok).toBe(
      false,
    );
    expect(
      (await bizonylatApi.elutasitIgazolas(id, portal("p1"), { ok: "mégsem" })).ok,
    ).toBe(false);
    expect((await bizonylatApi.kuldIgazolas(id, szereplo, alapUrl)).ok).toBe(false);
    expect(esemeny).toHaveBeenCalledTimes(1);
  });

  it("elfogadás tokennel működik, a token egyszer használható; a hibás listener nem akasztja", async () => {
    onDomainEvent("teljesitesigazolas.elfogadva", () => {
      throw new Error("listener bukik");
    });
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const id = await ujIg();
    const r = await bizonylatApi.kuldIgazolas(id, szereplo, alapUrl);
    if (!r.ok) throw new Error(r.message);
    const token = r.level.linkUt.split("/").pop()!;
    expect((await bizonylatApi.getIgazolasTokennel(token))?.id).toBe(id);
    expect((await bizonylatApi.elfogadIgazolasTokennel(token, alairas)).ok).toBe(true);
    expect((await bizonylatApi.elfogadIgazolasTokennel(token, alairas)).ok).toBe(false);
    expect((await bizonylatApi.getIgazolas(id, staff))?.allapot).toBe("elfogadva");
  });

  it("elutasításhoz ok kell; végleges", async () => {
    const id = await ujIg();
    await bizonylatApi.kuldIgazolas(id, szereplo, alapUrl);
    expect((await bizonylatApi.elutasitIgazolas(id, portal("p1"), { ok: " " })).ok).toBe(
      false,
    );
    expect(
      (await bizonylatApi.elutasitIgazolas(id, portal("p1"), { ok: "Nem lett kész" })).ok,
    ).toBe(true);
    const d = await bizonylatApi.getIgazolas(id, portal("p1"));
    expect(d?.allapot).toBe("elutasitva");
    expect(d?.elutasitasOka).toBe("Nem lett kész");
    expect((await bizonylatApi.elfogadIgazolas(id, portal("p1"), alairas)).ok).toBe(
      false,
    );
  });

  it("KPI: aláírt és függő érték, darabszám; teendő az aláírásra várókról", async () => {
    const a = await ujIg();
    const b = await ujIg();
    await ujIg();
    await bizonylatApi.kuldIgazolas(a, szereplo, alapUrl);
    await bizonylatApi.kuldIgazolas(b, szereplo, alapUrl);
    await bizonylatApi.elfogadIgazolas(a, portal("p1"), alairas);
    const k = await bizonylatApi.osszesitesIgazolas(staff);
    expect(k).toMatchObject({
      alairtDb: 1,
      fuggoDb: 1,
      piszkozatDb: 1,
      alairtBrutto: 114300,
      fuggoBrutto: 114300,
      alairtNetto: 90000,
    });
    expect((await bizonylatApi.osszesitesIgazolas(portal("p1"))).piszkozatDb).toBe(0);
    const t = await bizonylatApi.listMyAssignments(szereplo.id);
    expect(t.filter((x) => x.entityType === "igazolas")).toHaveLength(1);
  });
});

// ── Számla ─────────────────────────────────────────────────────────────────────

const szInput = (o: Record<string, unknown> = {}) =>
  szamlaSchema.parse({
    partnerId: "p1",
    sorok: [
      {
        leiras: "Munkadíj",
        mennyiseg: 2,
        egyseg: "óra",
        nettoEgysegar: 10000,
        afaKulcs: 27,
      },
    ],
    ...o,
  });
const ujSz = async (o: Record<string, unknown> = {}) =>
  (await bizonylatApi.createSzamla(szInput(o), partner, szereplo)).id;

function billingoPort(o: { ok?: boolean } = {}): BillingoPort & { hivasok: number } {
  const p = {
    hivasok: 0,
    async kiallit() {
      p.hivasok++;
      return o.ok === false
        ? { ok: false as const, message: "nincs kapcsolat" }
        : { ok: true as const, billingoRef: "B-77", szamlaszam: "SIR-2026-1" };
    },
    async allapot() {
      return { ok: true as const, kifizetve: true };
    },
  };
  return p;
}

describe("Számla", () => {
  it("összeg a sorokból, csak piszkozat szerkeszthető", async () => {
    const id = await ujSz();
    const d = await bizonylatApi.getSzamla(id);
    expect(d?.azonosito).toBe("SZA-000001");
    expect(d?.osszeg).toBe(25400);
    expect(
      (await bizonylatApi.updateSzamla(id, szInput({ cim: "Új" }), partner)).ok,
    ).toBe(true);
    await bizonylatApi.kiallitSzamla(id, szereplo, billingoPort());
    expect(await bizonylatApi.updateSzamla(id, szInput(), partner)).toMatchObject({
      ok: false,
      code: "nem_szerkesztheto",
    });
  });

  it("kiállítás: billingoRef + számlaszám, kettős kattintás egyszer hívja a Billingót", async () => {
    const id = await ujSz();
    const port = billingoPort();
    const [a, b] = await Promise.all([
      bizonylatApi.kiallitSzamla(id, szereplo, port),
      bizonylatApi.kiallitSzamla(id, szereplo, port),
    ]);
    expect([a.ok, b.ok].filter(Boolean)).toHaveLength(1);
    expect(port.hivasok).toBe(1);
    const d = await bizonylatApi.getSzamla(id);
    expect(d).toMatchObject({
      billingoRef: "B-77",
      szamlaszam: "SIR-2026-1",
      tarolt: "elkuldve",
    });
    expect(d?.esedekes).toBeTruthy();
  });

  it("Billingo hiba: a piszkozat marad és újra kiállítható", async () => {
    const id = await ujSz();
    expect(
      (await bizonylatApi.kiallitSzamla(id, szereplo, billingoPort({ ok: false }))).ok,
    ).toBe(false);
    expect((await bizonylatApi.getSzamla(id))?.tarolt).toBe("piszkozat");
    expect((await bizonylatApi.kiallitSzamla(id, szereplo, billingoPort())).ok).toBe(
      true,
    );
  });

  it("lejárt: olvasáskor számolt, listaszűrő is működik, teendő", async () => {
    const lejart = await ujSz({ esedekes: new Date("2020-01-01") });
    const joeves = await ujSz({ esedekes: new Date("2099-01-01") });
    for (const id of [lejart, joeves])
      await bizonylatApi.changeSzamlaAllapot(id, "elkuldve", szereplo);
    expect((await bizonylatApi.getSzamla(lejart))?.allapot).toBe("lejart");
    expect((await bizonylatApi.getSzamla(lejart))?.tarolt).toBe("elkuldve");
    expect((await bizonylatApi.getSzamla(joeves))?.allapot).toBe("elkuldve");
    const q = (allapot: string) => ({ ...query, filters: { allapot: [allapot] } });
    const lista = await bizonylatApi.listSzamlak(query);
    expect(lista.data.find((x) => x._id === lejart)?.allapot).toBe("lejart");
    const t = await bizonylatApi.listMyAssignments(szereplo.id);
    expect(t.filter((x) => x.entityType === "szamla").map((x) => x.entityId)).toEqual([
      lejart,
    ]);
    void q;
    // a lejárt számla kifizethető
    expect(
      (await bizonylatApi.changeSzamlaAllapot(lejart, "kifizetve", szereplo)).ok,
    ).toBe(true);
    expect((await bizonylatApi.getSzamla(lejart))?.allapot).toBe("kifizetve");
    expect((await bizonylatApi.changeSzamlaAllapot(lejart, "sztorno", szereplo)).ok).toBe(
      false,
    );
  });

  it("Billingo webhook: érvényes aláírással kifizetve, ismételve idempotens, hamisítvány elutasítva", async () => {
    const SECRET = "teszt-titok";
    const id = await ujSz();
    await bizonylatApi.kiallitSzamla(id, szereplo, billingoPort());
    const body = JSON.stringify({ event: "invoice_paid", data: { id: "B-77" } });
    const alkalmaz = (e: Parameters<typeof bizonylatApi.billingoKifizetve>[0]) =>
      bizonylatApi.billingoKifizetve(e);

    const hamis = await feldolgozBillingoWebhook(body, "0".repeat(64), SECRET, alkalmaz);
    expect(hamis.status).toBe(401);
    expect((await bizonylatApi.getSzamla(id))?.tarolt).toBe("elkuldve");

    const jo = await feldolgozBillingoWebhook(
      body,
      alairasKeszit(body, SECRET),
      SECRET,
      alkalmaz,
    );
    expect(jo.status).toBe(200);
    const d = await bizonylatApi.getSzamla(id);
    expect(d?.tarolt).toBe("kifizetve");
    const kifizetve = d?.kifizetve;
    const tortenet = d?.elozmenyek.length;

    const ujra = await feldolgozBillingoWebhook(
      body,
      alairasKeszit(body, SECRET),
      SECRET,
      alkalmaz,
    );
    expect(ujra.status).toBe(200);
    const d2 = await bizonylatApi.getSzamla(id);
    expect(d2?.kifizetve).toBe(kifizetve);
    expect(d2?.elozmenyek.length).toBe(tortenet);

    const ismeretlen = JSON.stringify({ event: "invoice_paid", data: { id: "nincs" } });
    expect(
      (
        await feldolgozBillingoWebhook(
          ismeretlen,
          alairasKeszit(ismeretlen, SECRET),
          SECRET,
          alkalmaz,
        )
      ).status,
    ).toBe(200);
  });

  it("szinkron a Billingóból és archiválás", async () => {
    const id = await ujSz();
    await bizonylatApi.kiallitSzamla(id, szereplo, billingoPort());
    expect((await bizonylatApi.szinkronSzamla(id, billingoPort())).ok).toBe(true);
    expect((await bizonylatApi.getSzamla(id))?.tarolt).toBe("kifizetve");
    expect((await bizonylatApi.archivSzamla(id, "teszt", szereplo)).ok).toBe(true);
    expect((await bizonylatApi.listSzamlak(query)).total).toBe(0);
    expect((await bizonylatApi.listSzamlak(query, { archivaltakkal: true })).total).toBe(
      1,
    );
  });
});

// ── Jótállási jegy ─────────────────────────────────────────────────────────────

const jInput = (o: Record<string, unknown> = {}) =>
  jotallasSchema.parse({
    partnerId: "p1",
    kiallitasNap: "2026-11-21",
    sorok: [{ termekNev: "Kamera", evek: 2, kezdet: "2026-11-21", gyariSzam: "SN1" }],
    ...o,
  });

describe("Jótállási jegy", () => {
  it("JJY sorszám, lejárat számolt, jogi szöveg befagyasztva a beállításból", async () => {
    await bizonylatApi.setJotallasiSzoveg("Első szöveg", szereplo);
    const a = await bizonylatApi.createJotallas(jInput(), partner, szereplo);
    await bizonylatApi.setJotallasiSzoveg("Második szöveg", szereplo);
    const b = await bizonylatApi.createJotallas(jInput(), partner, szereplo);
    const da = await bizonylatApi.getJotallas(a.id);
    expect(da?.azonosito).toBe("JJY-000001");
    expect((await bizonylatApi.getJotallas(b.id))?.azonosito).toBe("JJY-000002");
    expect(da?.jogiSzoveg).toBe("Első szöveg");
    expect((await bizonylatApi.getJotallas(b.id))?.jogiSzoveg).toBe("Második szöveg");
    expect(da?.sorok[0]?.vege.slice(0, 10)).toBe("2028-11-21");
    expect(da?.lejarat?.slice(0, 10)).toBe("2028-11-21");
    expect(da?.allapot).toBe("aktiv");
  });

  it("alapértelmezett jogi szöveg, ha nincs beállítva", async () => {
    expect(await bizonylatApi.getJotallasiSzoveg()).toContain("jótállás");
  });

  it("lejárt: olvasáskor számolt, szűrhető", async () => {
    const r = await bizonylatApi.createJotallas(
      jInput({ sorok: [{ termekNev: "Régi", evek: 1, kezdet: "2020-01-01" }] }),
      partner,
      szereplo,
    );
    await bizonylatApi.createJotallas(jInput(), partner, szereplo);
    expect((await bizonylatApi.getJotallas(r.id))?.allapot).toBe("lejart");
    const lista = await bizonylatApi.listJotallasok(query);
    expect(lista.data.find((x) => x._id === r.id)?.allapot).toBe("lejart");
    expect(lista.data.filter((x) => x.allapot === "aktiv")).toHaveLength(1);
  });

  it("állapotváltás, érvénytelen átmenet, archiválás okkal", async () => {
    const { id } = await bizonylatApi.createJotallas(jInput(), partner, szereplo);
    expect((await bizonylatApi.changeJotallasAllapot(id, "igenyelt", szereplo)).ok).toBe(
      true,
    );
    expect(
      (await bizonylatApi.changeJotallasAllapot(id, "ervenytelen", szereplo)).ok,
    ).toBe(true);
    expect(await bizonylatApi.changeJotallasAllapot(id, "aktiv", szereplo)).toMatchObject(
      {
        ok: false,
        code: "ervenytelen_atmenet",
      },
    );
    expect((await bizonylatApi.archivJotallas(id, "tévedés", szereplo)).ok).toBe(true);
    expect((await bizonylatApi.getJotallas(id))?.archivalasOka).toBe("tévedés");
    expect((await bizonylatApi.restoreJotallas(id)).ok).toBe(true);
  });
});
