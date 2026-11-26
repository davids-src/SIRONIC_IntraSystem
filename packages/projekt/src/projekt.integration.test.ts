import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import { createTestMongo } from "@erp/test-utils/mongo-memory";
import { connectDB, User } from "@erp/db-core";
import { projektApi } from "./api";
import type { HetiSzereplo, Szereplo } from "./shared";
import type { Nezo } from "./constants";

let mongo: MongoMemoryServer;
const query = { page: 1, pageSize: 50 };
const staff = (userId = "x"): Nezo => ({ kind: "staff", userId });
const portal = (partnerId: string): Nezo => ({ kind: "portal", partnerId });

async function felhasznalo(name: string) {
  const u = await User.create({
    email: `${name.toLowerCase()}@example.com`,
    name,
    roleIds: [],
    isActive: true,
  });
  return { id: String(u._id), nev: name } satisfies Szereplo;
}

async function ujProjekt(sz: Szereplo, o: Record<string, unknown> = {}) {
  const r = await projektApi.createProjekt(
    { nev: "Irodaház", portalLathato: false, ...o },
    sz,
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

describe("projekt lifecycle", () => {
  it("creates with sequence id, partner snapshot and responsible user", async () => {
    const a = await felhasznalo("Admin");
    const id = await ujProjekt(a, {
      partnerId: "p1",
      partnerNev: "Acme Kft.",
      felelosId: a.id,
    });
    const d = await projektApi.getProjekt(id, staff());
    expect(d?.azonosito).toBe("PRJ-000001");
    expect(d?.partnerNev).toBe("Acme Kft.");
    expect(d?.allapot).toBe("nyitott");
    expect(d?.felelosNev).toBe("Admin");
    const my = await projektApi.listMyAssignments(a.id);
    expect(my.map((t) => t.entityType)).toEqual(["projekt"]);
  });

  it("status moves, closing blocked by open required checklist items", async () => {
    const a = await felhasznalo("Admin");
    const id = await ujProjekt(a);
    await projektApi.addChecklistTetel(id, {
      cimke: "Átadás",
      kotelezo: true,
      kategoria: "egyeb",
    });
    const blocked = await projektApi.setAllapot(id, "lezart", undefined, a);
    expect(blocked.ok).toBe(false);
    const d0 = await projektApi.getProjekt(id, staff());
    expect((await projektApi.setChecklistKesz(id, d0!.checklist[0]!.id, true)).ok).toBe(
      true,
    );
    expect((await projektApi.setAllapot(id, "felfuggesztett", "Várunk", a)).ok).toBe(
      true,
    );
    expect((await projektApi.setAllapot(id, "lezart", undefined, a)).ok).toBe(true);
    expect((await projektApi.setAllapot(id, "felfuggesztett", undefined, a)).ok).toBe(
      false,
    );
    const d = await projektApi.getProjekt(id, staff());
    expect(d?.allapot).toBe("lezart");
    expect(d?.lezarasIdopont).toBeDefined();
    expect((await projektApi.setAllapot(id, "nyitott", undefined, a)).ok).toBe(true);
    expect((await projektApi.getProjekt(id, staff()))?.lezarasIdopont).toBeUndefined();
  });

  it("phases keep the overall percentage in sync", async () => {
    const a = await felhasznalo("Admin");
    const id = await ujProjekt(a);
    await projektApi.addFazis(id, { nev: "Tervezés", allapot: "kesz", szazalek: 0 });
    await projektApi.addFazis(id, {
      nev: "Kivitelezés",
      allapot: "fuggoben",
      szazalek: 0,
    });
    let d = await projektApi.getProjekt(id, staff());
    expect(d?.szazalek).toBe(50);
    expect(d?.fazisok[0]?.allapot).toBe("kesz");
    await projektApi.updateFazis(id, d!.fazisok[1]!.id, {
      nev: "Kivitelezés",
      allapot: "folyamatban",
      szazalek: 50,
    });
    d = await projektApi.getProjekt(id, staff());
    expect(d?.szazalek).toBe(75);
    await projektApi.removeFazis(id, d!.fazisok[0]!.id);
    expect((await projektApi.getProjekt(id, staff()))?.szazalek).toBe(50);
  });

  it("required-attachment items cannot be ticked without a media id", async () => {
    const a = await felhasznalo("Admin");
    const id = await ujProjekt(a);
    await projektApi.addChecklistTetel(id, {
      cimke: "Fotó",
      kotelezo: true,
      mellekletKotelezo: true,
      kategoria: "dokumentumok",
    });
    const tetel = (await projektApi.getProjekt(id, staff()))!.checklist[0]!;
    const nincs = await projektApi.setChecklistKesz(id, tetel.id, true);
    expect(nincs.ok).toBe(false);
    expect((await projektApi.setChecklistKesz(id, tetel.id, true, ["media1"])).ok).toBe(
      true,
    );
    let d = await projektApi.getProjekt(id, staff());
    expect(d?.checklist[0]).toMatchObject({ kesz: true, mellekletMediaIds: ["media1"] });
    // the last attachment of a ticked required-attachment item stays
    expect((await projektApi.removeMelleklet(id, tetel.id, "media1")).ok).toBe(false);
    await projektApi.setChecklistKesz(id, tetel.id, false);
    expect((await projektApi.removeMelleklet(id, tetel.id, "media1")).ok).toBe(true);
    d = await projektApi.getProjekt(id, staff());
    expect(d?.checklist[0]?.mellekletMediaIds).toEqual([]);
  });

  it("applies a checklist template onto a project", async () => {
    const a = await felhasznalo("Admin");
    const id = await ujProjekt(a);
    const s = await projektApi.createSablon(
      {
        nev: "Kamera",
        tetelek: [
          { szoveg: "Kábelezés", kotelezo: true, mellekletKotelezo: false },
          { szoveg: "Beüzemelés fotó", kotelezo: false, mellekletKotelezo: true },
        ],
      },
      a,
    );
    if (!s.ok || !s.id) throw new Error();
    expect((await projektApi.sablonAlkalmaz(id, s.id)).ok).toBe(true);
    const d = await projektApi.getProjekt(id, staff());
    expect(d?.checklist.map((c) => c.cimke)).toEqual(["Kábelezés", "Beüzemelés fotó"]);
    expect(d?.checklist[1]?.mellekletKotelezo).toBe(true);
    await projektApi.archiveSablon(s.id, "Elavult", a);
    expect((await projektApi.sablonAlkalmaz(id, s.id)).ok).toBe(false);
    expect((await projektApi.listSablonok(query)).total).toBe(0);
    expect((await projektApi.listSablonok(query, { archivaltakkal: true })).total).toBe(
      1,
    );
  });

  it("staging links with approval; archive blocks edits and restores", async () => {
    const a = await felhasznalo("Admin");
    const id = await ujProjekt(a);
    expect(
      (await projektApi.addStagingLink(id, { cimke: "x", url: "ftp://x" }, a)).ok,
    ).toBe(false);
    await projektApi.addStagingLink(
      id,
      { cimke: "Staging", url: "https://s.example.com" },
      a,
    );
    const link = (await projektApi.getProjekt(id, staff()))!.stagingLinkek[0]!;
    expect(link.jovahagyas).toBe("fuggoben");
    await projektApi.setStagingJovahagyas(id, link.id, { jovahagyas: "jovahagyva" }, a);
    expect((await projektApi.getProjekt(id, staff()))?.stagingLinkek[0]?.jovahagyas).toBe(
      "jovahagyva",
    );
    expect((await projektApi.archiveProjekt(id, "", a)).ok).toBe(false);
    expect((await projektApi.archiveProjekt(id, "Lemondta", a)).ok).toBe(true);
    expect((await projektApi.archiveProjekt(id, "Megint", a)).ok).toBe(false);
    expect(
      (await projektApi.addFazis(id, { nev: "F", allapot: "fuggoben", szazalek: 0 })).ok,
    ).toBe(false);
    expect((await projektApi.listProjektek(query, staff())).total).toBe(0);
    expect(
      (await projektApi.listProjektek(query, staff(), { archivaltakkal: true })).total,
    ).toBe(1);
    expect((await projektApi.restoreProjekt(id)).ok).toBe(true);
    expect((await projektApi.listProjektek(query, staff())).total).toBe(1);
  });

  it("deletion is refused once expenses exist", async () => {
    const a = await felhasznalo("Admin");
    const id = await ujProjekt(a);
    await projektApi.createKoltseg(
      { projektId: id, tipus: "anyag", osszeg: 1000, datum: "2026-03-01" },
      a,
    );
    expect((await projektApi.deleteProjekt(id)).ok).toBe(false);
    const id2 = await ujProjekt(a, { nev: "Üres" });
    expect((await projektApi.deleteProjekt(id2)).ok).toBe(true);
  });
});

describe("portal viewer isolation", () => {
  it("only sees visible, non-archived projects of its own partner", async () => {
    const a = await felhasznalo("Admin");
    const lathato = await ujProjekt(a, {
      nev: "Látható",
      partnerId: "p1",
      partnerNev: "P1",
      portalLathato: true,
    });
    const rejtett = await ujProjekt(a, {
      nev: "Rejtett",
      partnerId: "p1",
      partnerNev: "P1",
      portalLathato: false,
    });
    const masE = await ujProjekt(a, {
      nev: "Másé",
      partnerId: "p2",
      partnerNev: "P2",
      portalLathato: true,
    });
    const archiv = await ujProjekt(a, {
      nev: "Archív",
      partnerId: "p1",
      partnerNev: "P1",
      portalLathato: true,
    });
    await projektApi.archiveProjekt(archiv, "Régi", a);
    const partnerNelkuli = await ujProjekt(a, { nev: "Gazdátlan", portalLathato: true });

    const lista = await projektApi.listProjektek(query, portal("p1"));
    expect(lista.data.map((p) => p.nev)).toEqual(["Látható"]);
    // even asking for archived rows does not widen a portal viewer
    const archivaltakkal = await projektApi.listProjektek(query, portal("p1"), {
      archivaltakkal: true,
    });
    expect(archivaltakkal.data.map((p) => p.nev)).toEqual(["Látható"]);
    expect((await projektApi.listProjektek(query, portal(""))).total).toBe(0);

    expect(await projektApi.getProjekt(lathato, portal("p1"))).not.toBeNull();
    for (const id of [rejtett, masE, archiv, partnerNelkuli]) {
      expect(await projektApi.getProjekt(id, portal("p1"))).toBeNull();
    }
    // staff sees everything (non-archived by default)
    expect((await projektApi.listProjektek(query, staff())).total).toBe(4);
  });

  it("never exposes internal notes, checklist, responsible user or expenses", async () => {
    const a = await felhasznalo("Admin");
    const id = await ujProjekt(a, {
      partnerId: "p1",
      partnerNev: "P1",
      portalLathato: true,
      belsoJegyzet: "TITOK belső jegyzet",
      felelosId: a.id,
    });
    await projektApi.addChecklistTetel(id, {
      cimke: "Belső lépés",
      kotelezo: false,
      kategoria: "egyeb",
    });
    await projektApi.addFazis(id, {
      nev: "Tervezés",
      allapot: "folyamatban",
      szazalek: 30,
    });
    await projektApi.addStagingLink(id, { cimke: "S", url: "https://s.example.com" }, a);
    await projektApi.createKoltseg(
      {
        projektId: id,
        tipus: "szallas",
        osszeg: 99999,
        datum: "2026-03-01",
        leiras: "TITOK költség",
      },
      a,
    );

    const nezet = await projektApi.getProjekt(id, portal("p1"));
    expect(nezet).not.toBeNull();
    const json = JSON.stringify(nezet);
    expect(json).not.toContain("TITOK");
    expect(json).not.toContain("Belső lépés");
    expect(json).not.toContain("Admin");
    expect(Object.keys(nezet!).sort()).toEqual(
      [
        "allapot",
        "azonosito",
        "fazisok",
        "hatarido",
        "id",
        "leiras",
        "nev",
        "stagingLinkek",
        "szazalek",
      ].sort(),
    );
    const lista = await projektApi.listProjektek(query, portal("p1"));
    expect(JSON.stringify(lista)).not.toContain("Admin");

    // every expense read is closed to a portal viewer
    expect(await projektApi.listKoltsegek(query, portal("p1"))).toEqual({
      data: [],
      total: 0,
    });
    expect(
      await projektApi.listKoltsegek(query, portal("p1"), {
        projektId: id,
        archivaltakkal: true,
      }),
    ).toEqual({ data: [], total: 0 });
    expect(await projektApi.getKoltsegOsszesito(id, portal("p1"))).toBeNull();
    const k = await projektApi.listKoltsegek(query, staff(), { projektId: id });
    expect(k.total).toBe(1);
    expect(await projektApi.getKoltseg(k.data[0]!._id, portal("p1"))).toBeNull();
    expect((await projektApi.getKoltsegOsszesito(id, staff()))?.osszeg).toBe(99999);
  });
});

describe("koltseg", () => {
  it("creates, edits, archives with reason, restores, deletes; not on archived projects", async () => {
    const a = await felhasznalo("Admin");
    const id = await ujProjekt(a);
    const r = await projektApi.createKoltseg(
      {
        projektId: id,
        tipus: "uzemanyag",
        osszeg: "12000",
        datum: "2026-03-01",
        leiras: "Tank",
      },
      a,
    );
    if (!r.ok || !r.id) throw new Error();
    expect(
      (
        await projektApi.updateKoltseg(r.id, {
          projektId: id,
          tipus: "parkolas",
          osszeg: 500,
          datum: "2026-03-02",
        })
      ).ok,
    ).toBe(true);
    expect((await projektApi.getKoltseg(r.id, staff()))?.tipus).toBe("parkolas");
    expect((await projektApi.archiveKoltseg(r.id, "Duplikált", a)).ok).toBe(true);
    expect(
      (await projektApi.listKoltsegek(query, staff(), { projektId: id })).total,
    ).toBe(0);
    expect((await projektApi.getKoltsegOsszesito(id, staff()))?.db).toBe(0);
    expect((await projektApi.restoreKoltseg(r.id)).ok).toBe(true);
    expect((await projektApi.deleteKoltseg(r.id)).ok).toBe(true);
    await projektApi.archiveProjekt(id, "Kész", a);
    expect(
      (
        await projektApi.createKoltseg(
          { projektId: id, tipus: "anyag", osszeg: 1, datum: "2026-03-01" },
          a,
        )
      ).ok,
    ).toBe(false);
  });
});

describe("heti terv ownership", () => {
  const mint = (s: Szereplo, delegalhat: boolean): HetiSzereplo => ({ ...s, delegalhat });
  const terv = (felelosId: string, o: Record<string, unknown> = {}) => ({
    felelosId,
    cim: "Kábelezés",
    ev: 2026,
    het: 10,
    prioritas: "magas" as const,
    ...o,
  });

  it("staff may only plan for themselves; delegation permits anyone and notifies", async () => {
    const admin = await felhasznalo("Admin");
    const bela = await felhasznalo("Bela");
    const cili = await felhasznalo("Cili");

    expect((await projektApi.createHetiTerv(terv(bela.id), mint(bela, false))).ok).toBe(
      true,
    );
    const masnak = await projektApi.createHetiTerv(terv(cili.id), mint(bela, false));
    expect(masnak.ok).toBe(false);

    const delegalt = await projektApi.createHetiTerv(terv(cili.id), mint(admin, true));
    if (!delegalt.ok || !delegalt.id) throw new Error();
    expect(delegalt.ertesitesek[0]?.userIds).toEqual([cili.id]);

    // Bela cannot edit, move, archive Cili's plan
    expect(
      (
        await projektApi.updateHetiTerv(
          delegalt.id,
          terv(cili.id, { cim: "Más" }),
          mint(bela, false),
        )
      ).ok,
    ).toBe(false);
    expect(
      (await projektApi.setHetiAllapot(delegalt.id, "kesz", mint(bela, false))).ok,
    ).toBe(false);
    expect(
      (await projektApi.archiveHetiTerv(delegalt.id, "Ok", mint(bela, false))).ok,
    ).toBe(false);
    // ... nor hand her own plan to somebody else
    const own = (
      await projektApi.listHetiTervek({ ev: 2026, het: 10, felelosId: bela.id })
    )[0]!;
    expect(
      (await projektApi.updateHetiTerv(own.id, terv(cili.id), mint(bela, false))).ok,
    ).toBe(false);
    // Cili herself can
    expect(
      (await projektApi.setHetiAllapot(delegalt.id, "folyamatban", mint(cili, false))).ok,
    ).toBe(true);
    // admin can reassign
    const at = await projektApi.updateHetiTerv(
      delegalt.id,
      terv(bela.id),
      mint(admin, true),
    );
    expect(at.ok).toBe(true);
    expect(at.ok && at.ertesitesek[0]?.userIds).toEqual([bela.id]);
    expect((await projektApi.getHetiTerv(delegalt.id))?.felelosNev).toBe("Bela");
  });

  it("week filter, quick status move, archive/restore, Teendőim feed and links", async () => {
    const bela = await felhasznalo("Bela");
    const b = mint(bela, false);
    const r = await projektApi.createHetiTerv(
      terv(bela.id, {
        hibajegyId: "h1",
        projektId: "pr1",
        munkalapId: "m1",
        hatarido: "2026-03-06",
      }),
      b,
    );
    if (!r.ok || !r.id) throw new Error();
    await projektApi.createHetiTerv(terv(bela.id, { het: 11, cim: "Következő" }), b);
    const het10 = await projektApi.listHetiTervek({ ev: 2026, het: 10 });
    expect(het10).toHaveLength(1);
    expect(het10[0]).toMatchObject({
      hibajegyId: "h1",
      projektId: "pr1",
      munkalapId: "m1",
      hatarido: "2026-03-06",
      allapot: "todo",
    });

    expect((await projektApi.setHetiAllapot(r.id, "blokkolt", b)).ok).toBe(true);
    expect((await projektApi.getHetiTerv(r.id))?.allapot).toBe("blokkolt");
    expect((await projektApi.setHetiAllapot(r.id, "nincs" as never, b)).ok).toBe(false);

    const feed = await projektApi.listMyAssignments(bela.id);
    expect(feed.map((t) => t.entityType)).toEqual(["heti-terv", "heti-terv"]);
    expect(feed.find((t) => t.entityId === r.id)?.dueDate).toBe("2026-03-06");

    await projektApi.setHetiAllapot(r.id, "kesz", b);
    expect((await projektApi.listMyAssignments(bela.id)).length).toBe(1);

    expect((await projektApi.archiveHetiTerv(r.id, "", b)).ok).toBe(false);
    expect((await projektApi.archiveHetiTerv(r.id, "Elavult", b)).ok).toBe(true);
    expect(await projektApi.listHetiTervek({ ev: 2026, het: 10 })).toHaveLength(0);
    expect(
      await projektApi.listHetiTervek({ ev: 2026, het: 10, archivaltakkal: true }),
    ).toHaveLength(1);
    expect((await projektApi.setHetiAllapot(r.id, "todo", b)).ok).toBe(false);
    expect((await projektApi.restoreHetiTerv(r.id, b)).ok).toBe(true);
    expect(await projektApi.listHetiTervek({ ev: 2026, het: 10 })).toHaveLength(1);
  });
});

describe("alaprajz", () => {
  it("stores file refs with markers, archives and restores", async () => {
    const a = await felhasznalo("Admin");
    expect(
      (await projektApi.createAlaprajz({ nev: "1. emelet", fajlMediaId: "m1" }, a)).ok,
    ).toBe(false);
    const r = await projektApi.createAlaprajz(
      {
        nev: "1. emelet",
        projektId: "pr1",
        fajlMediaId: "m1",
        jelolok: [{ x: 10, y: 20, tipus: "kamera", cimke: "K1" }],
      },
      a,
    );
    if (!r.ok || !r.id) throw new Error();
    let l = await projektApi.listAlaprajzok({ projektId: "pr1" });
    expect(l[0]).toMatchObject({ fajlMediaId: "m1" });
    expect(l[0]?.jelolok[0]).toMatchObject({ tipus: "kamera", x: 10 });
    await projektApi.archiveAlaprajz(r.id, "Cserélve", a);
    expect(await projektApi.listAlaprajzok({ projektId: "pr1" })).toHaveLength(0);
    await projektApi.restoreAlaprajz(r.id);
    l = await projektApi.listAlaprajzok({ projektId: "pr1" });
    expect(l).toHaveLength(1);
  });
});
