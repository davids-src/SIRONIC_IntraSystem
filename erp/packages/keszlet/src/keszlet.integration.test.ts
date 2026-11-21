import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import { createTestMongo } from "@erp/test-utils/mongo-memory";
import { connectDB, User } from "@erp/db-core";
import { keszletApi } from "./api";
import { KeszletTetel } from "./models/KeszletTetel";
import { KeszletMozgas } from "./models/KeszletMozgas";
import { KESZLET_PERMISSIONS } from "./constants";

let mongo: MongoMemoryServer;
let actor: string;

const termek = (id: string) => ({ nev: `Termék ${id}`, kod: `AR-${id}`, egyseg: "db" });
const ref = (id: string, referenceType: "kezi" | "szallitolevel" = "szallitolevel") => ({
  referenceType,
  referenceId: id,
});
const ADMIN = { userId: "x", permissions: Object.values(KESZLET_PERMISSIONS) };
const RAKTAROS = {
  userId: "y",
  permissions: Object.values(KESZLET_PERMISSIONS).filter(
    (p) => p !== KESZLET_PERMISSIONS.ertekRead,
  ),
};

async function bevetel(id: string, mennyiseg: number, hely?: string, ar?: number) {
  const r = await keszletApi.bevetelez(
    [
      {
        arlistaTermekId: id,
        mennyiseg,
        raktarhelyKod: hely,
        termek: termek(id),
        beszerzesiAr: ar,
      },
    ],
    ref(`seed-${id}-${Math.random()}`, "kezi"),
    actor,
  );
  expect(r.ok).toBe(true);
}
const sor = async (id: string, hely = "") =>
  (await KeszletTetel.findOne({ arlistaTermekId: id, raktarhelyKod: hely }).lean())!;

beforeAll(async () => {
  mongo = await createTestMongo();
  process.env.MONGODB_URI = mongo.getUri();
  await connectDB();
  await KeszletTetel.init();
  await KeszletMozgas.init();
});

beforeEach(async () => {
  const u = await User.create({
    email: "a@example.com",
    name: "A",
    roleIds: [],
    isActive: true,
  });
  actor = String(u._id);
});

afterEach(async () => {
  await mongoose.connection.dropDatabase();
  await KeszletTetel.init();
  await KeszletMozgas.init();
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongo.stop();
});

describe("kiad — check-all then mutate-all", () => {
  it("insufficient stock on any line aborts with nothing changed", async () => {
    await bevetel("1", 5);
    await bevetel("2", 1);
    const before = await KeszletMozgas.countDocuments();
    const r = await keszletApi.kiad(
      [
        { arlistaTermekId: "1", mennyiseg: 3 },
        { arlistaTermekId: "2", mennyiseg: 2 },
      ],
      ref("SZL-1"),
      actor,
    );
    expect(r.ok).toBe(false);
    expect((await sor("1")).keszlet).toBe(5);
    expect((await sor("2")).keszlet).toBe(1);
    expect(await KeszletMozgas.countDocuments()).toBe(before);
  });

  it("two lines on the same product are checked cumulatively", async () => {
    await bevetel("1", 5);
    const r = await keszletApi.kiad(
      [
        { arlistaTermekId: "1", mennyiseg: 3 },
        { arlistaTermekId: "1", mennyiseg: 3 },
      ],
      ref("SZL-2"),
      actor,
    );
    expect(r.ok).toBe(false);
    expect((await sor("1")).keszlet).toBe(5);
  });

  it("concurrent issue of the last unit: exactly one wins", async () => {
    await bevetel("1", 1);
    const [a, b] = await Promise.all([
      keszletApi.kiad([{ arlistaTermekId: "1", mennyiseg: 1 }], ref("A"), actor),
      keszletApi.kiad([{ arlistaTermekId: "1", mennyiseg: 1 }], ref("B"), actor),
    ]);
    expect([a.ok, b.ok].filter(Boolean)).toHaveLength(1);
    expect((await sor("1")).keszlet).toBe(0);
    expect(await KeszletMozgas.countDocuments({ tipus: "kiadas" })).toBe(1);
  });

  it("retrying the same reference never double-applies", async () => {
    await bevetel("1", 10);
    const sorok = [{ arlistaTermekId: "1", mennyiseg: 4 }];
    const elso = await keszletApi.kiad(sorok, ref("SZL-3"), actor);
    const masodik = await keszletApi.kiad(sorok, ref("SZL-3"), actor);
    expect(elso.ok && !elso.idempotens).toBe(true);
    expect(masodik.ok && masodik.idempotens).toBe(true);
    expect((await sor("1")).keszlet).toBe(6);
    expect(await KeszletMozgas.countDocuments({ tipus: "kiadas" })).toBe(1);

    const be = [{ arlistaTermekId: "1", mennyiseg: 2, termek: termek("1") }];
    await keszletApi.bevetelez(be, ref("PO-1", "kezi"), actor);
    await keszletApi.bevetelez(be, ref("PO-1", "kezi"), actor);
    expect((await sor("1")).keszlet).toBe(8);
  });

  it("recovers a crash between the stock update and the log insert", async () => {
    await bevetel("1", 10);
    // Simulate: stock decremented + key stored, movement never written.
    const kulcs = "kiadas:szallitolevel:CRASH:0";
    await KeszletTetel.updateOne(
      { arlistaTermekId: "1" },
      { $inc: { keszlet: -3 }, $push: { mozgasKulcsok: kulcs } },
    );
    const r = await keszletApi.kiad(
      [{ arlistaTermekId: "1", mennyiseg: 3 }],
      ref("CRASH"),
      actor,
    );
    expect(r.ok).toBe(true);
    expect((await sor("1")).keszlet).toBe(7);
    expect(await KeszletMozgas.countDocuments({ kulcs })).toBe(1);
    expect(await keszletApi.ellenorzes()).toEqual([]);
  });

  it("a failure on line 2 leaves line 1 compensated (race lost between check and apply)", async () => {
    await bevetel("1", 5);
    await bevetel("2", 5);
    const r = await keszletApi.kiad(
      [
        { arlistaTermekId: "1", mennyiseg: 2 },
        { arlistaTermekId: "2", mennyiseg: 2 },
      ],
      ref("SZL-4"),
      actor,
      {
        // A concurrent consumer empties product 2 right before line 2 is applied.
        beforeLine: async (i) => {
          if (i === 1)
            await KeszletTetel.updateOne(
              { arlistaTermekId: "2" },
              { $set: { keszlet: 0 } },
            );
        },
      },
    );
    expect(r.ok).toBe(false);
    expect((await sor("1")).keszlet).toBe(5);
    expect((await sor("1")).mozgasKulcsok.filter((k) => k.startsWith("kiadas"))).toEqual(
      [],
    );
    expect(await KeszletMozgas.countDocuments({ tipus: "kiadas" })).toBe(0);
  });

  it("an unexpected error on line 2 compensates line 1, and the retry then succeeds", async () => {
    await bevetel("1", 5);
    await bevetel("2", 5);
    const sorok = [
      { arlistaTermekId: "1", mennyiseg: 2 },
      { arlistaTermekId: "2", mennyiseg: 2 },
    ];
    const r = await keszletApi.kiad(sorok, ref("SZL-5"), actor, {
      beforeLine: (i) => {
        if (i === 1) throw new Error("kapcsolat megszakadt");
      },
    });
    expect(r.ok).toBe(false);
    expect((await sor("1")).keszlet).toBe(5);
    const retry = await keszletApi.kiad(sorok, ref("SZL-5"), actor);
    expect(retry.ok).toBe(true);
    expect((await sor("1")).keszlet).toBe(3);
    expect((await sor("2")).keszlet).toBe(3);
    expect(await keszletApi.ellenorzes()).toEqual([]);
  });
});

describe("foglalás (allocation)", () => {
  it("can never exceed the physical stock and keeps szabad = keszlet - foglalt", async () => {
    await bevetel("1", 5);
    expect(
      (
        await keszletApi.foglal(
          [{ arlistaTermekId: "1", mennyiseg: 3 }],
          ref("F1"),
          actor,
        )
      ).ok,
    ).toBe(true);
    expect(
      (
        await keszletApi.foglal(
          [{ arlistaTermekId: "1", mennyiseg: 3 }],
          ref("F2"),
          actor,
        )
      ).ok,
    ).toBe(false);
    let t = await sor("1");
    expect([t.keszlet, t.foglalt]).toEqual([5, 3]);

    // Free issue may not touch reserved stock…
    expect(
      (await keszletApi.kiad([{ arlistaTermekId: "1", mennyiseg: 3 }], ref("K1"), actor))
        .ok,
    ).toBe(false);
    // …but can issue from the reservation itself.
    expect(
      (
        await keszletApi.kiad(
          [{ arlistaTermekId: "1", mennyiseg: 3, foglalasbol: true }],
          ref("K2"),
          actor,
        )
      ).ok,
    ).toBe(true);
    t = await sor("1");
    expect([t.keszlet, t.foglalt]).toEqual([2, 0]);

    // Releasing more than is reserved is refused.
    expect(
      (
        await keszletApi.foglalFeloldas(
          [{ arlistaTermekId: "1", mennyiseg: 1 }],
          ref("U1"),
          actor,
        )
      ).ok,
    ).toBe(false);
    expect(await keszletApi.ellenorzes()).toEqual([]);
  });

  it("concurrent reservations of the last free unit: exactly one wins", async () => {
    await bevetel("1", 1);
    const res = await Promise.all([
      keszletApi.foglal([{ arlistaTermekId: "1", mennyiseg: 1 }], ref("A"), actor),
      keszletApi.foglal([{ arlistaTermekId: "1", mennyiseg: 1 }], ref("B"), actor),
    ]);
    expect(res.filter((r) => r.ok)).toHaveLength(1);
    expect((await sor("1")).foglalt).toBe(1);
  });
});

describe("preflight", () => {
  it("reports availability per line without changing anything", async () => {
    await bevetel("1", 5);
    await keszletApi.foglal([{ arlistaTermekId: "1", mennyiseg: 2 }], ref("F"), actor);
    const p = await keszletApi.preflight([
      { arlistaTermekId: "1", mennyiseg: 3 },
      { arlistaTermekId: "1", mennyiseg: 2 },
      { arlistaTermekId: "nincs", mennyiseg: 1 },
    ]);
    expect(p.osszesElegendo).toBe(false);
    expect(p.sorok.map((s) => s.elegendo)).toEqual([true, false, false]);
    expect(p.sorok[0]).toMatchObject({ keszlet: 5, foglalt: 2, szabad: 3 });
    expect((await sor("1")).keszlet).toBe(5);
  });
});

describe("raktárhelyek és több hely", () => {
  it("stocks per location and picks the location with enough free stock", async () => {
    expect(
      (await keszletApi.createRaktarhely({ kod: "FO", nev: "Főraktár", tipus: "fo" })).ok,
    ).toBe(true);
    expect(
      (await keszletApi.createRaktarhely({ kod: "FO/A", nev: "A polc", tipus: "polc" }))
        .ok,
    ).toBe(true);
    expect(
      (await keszletApi.createRaktarhely({ kod: "X/Y", nev: "árva", tipus: "polc" })).ok,
    ).toBe(false);
    await bevetel("1", 2, "FO");
    await bevetel("1", 6, "FO/A");
    const r = await keszletApi.kiad(
      [{ arlistaTermekId: "1", mennyiseg: 5 }],
      ref("H1"),
      actor,
    );
    expect(r.ok).toBe(true);
    expect((await sor("1", "FO/A")).keszlet).toBe(1);
    expect((await sor("1", "FO")).keszlet).toBe(2);
    expect(
      (
        await keszletApi.bevetelez(
          [
            {
              arlistaTermekId: "1",
              mennyiseg: 1,
              raktarhelyKod: "NINCS",
              termek: termek("1"),
            },
          ],
          ref("H2", "kezi"),
          actor,
        )
      ).ok,
    ).toBe(false);
  });
});

describe("leltár", () => {
  it("closing creates korrekció movements per differing line, once", async () => {
    await keszletApi.createRaktarhely({ kod: "FO", nev: "Főraktár", tipus: "fo" });
    await bevetel("1", 10, "FO");
    await bevetel("2", 4, "FO");
    await bevetel("3", 7, "FO");
    const start = await keszletApi.leltarInditas("FO", actor);
    if (!start.ok || !start.id) throw new Error("start");
    const id = start.id;
    expect((await keszletApi.leltarInditas("FO", actor)).ok).toBe(false);
    // Not counted yet → cannot close.
    expect((await keszletApi.leltarLezar(id, actor)).ok).toBe(false);
    const l = (await keszletApi.getLeltar(id))!;
    const idx = (t: string) => l.sorok.find((s) => s.arlistaTermekId === t)!.lineIndex;
    await keszletApi.leltarSorMent(id, idx("1"), 8, "2 db elveszett");
    await keszletApi.leltarSorMent(id, idx("2"), 4, undefined);
    await keszletApi.leltarSorMent(id, idx("3"), 9, undefined);
    // Difference without justification is refused.
    expect((await keszletApi.leltarLezar(id, actor)).ok).toBe(false);
    await keszletApi.leltarSorMent(id, idx("3"), 9, "talált 2 db");

    const zar = await keszletApi.leltarLezar(id, actor);
    expect(zar.ok).toBe(true);
    expect((await sor("1", "FO")).keszlet).toBe(8);
    expect((await sor("2", "FO")).keszlet).toBe(4);
    expect((await sor("3", "FO")).keszlet).toBe(9);
    const korr = await KeszletMozgas.find({ tipus: "korrekcio" }).lean();
    expect(korr.map((m) => m.valtozas).sort()).toEqual([-2, 2]);
    expect(korr.every((m) => m.referenceType === "leltar" && m.referenceId === id)).toBe(
      true,
    );
    expect((await keszletApi.getLeltar(id))?.allapot).toBe("lezarva");
    expect((await keszletApi.leltarLezar(id, actor)).ok).toBe(false);
    expect(await keszletApi.ellenorzes()).toEqual([]);
  });

  it("refuses a correction that would drop stock below the reserved quantity", async () => {
    await bevetel("1", 5);
    await keszletApi.foglal([{ arlistaTermekId: "1", mennyiseg: 4 }], ref("F"), actor);
    const start = await keszletApi.leltarInditas("", actor);
    if (!start.ok || !start.id) throw new Error("start");
    await keszletApi.leltarSorMent(start.id, 0, 1, "hiány");
    const r = await keszletApi.leltarLezar(start.id, actor);
    expect(r.ok).toBe(false);
    expect((await sor("1")).keszlet).toBe(5);
    expect((await keszletApi.getLeltar(start.id))?.allapot).toBe("tervezet");
  });
});

describe("viewer cuts", () => {
  it("hides purchase prices and values without keszlet:ertek:read", async () => {
    await bevetel("1", 3, undefined, 1000);
    const id = String((await sor("1"))._id);
    const teljes = await keszletApi.getKeszlet(ADMIN, id);
    const vagott = await keszletApi.getKeszlet(RAKTAROS, id);
    expect(teljes?.ertek).toBe(3000);
    expect(teljes?.mozgasok[0]?.beszerzesiAr).toBe(1000);
    expect(vagott?.ertek).toBeUndefined();
    expect(vagott?.utolsoBeszerzesiAr).toBeUndefined();
    expect(vagott?.mozgasok[0]?.beszerzesiAr).toBeUndefined();
    expect((await keszletApi.getDashboard(ADMIN)).osszErtek).toBe(3000);
    expect((await keszletApi.getDashboard(RAKTAROS)).osszErtek).toBeNull();
  });
});

describe("dashboard", () => {
  it("counts low stock, dead stock (90 days) and active RMA", async () => {
    await bevetel("1", 2);
    await bevetel("2", 5);
    await KeszletTetel.updateOne({ arlistaTermekId: "1" }, { $set: { minimum: 3 } });
    await KeszletTetel.updateOne(
      { arlistaTermekId: "2" },
      { $set: { utolsoMozgasAt: new Date(Date.now() - 100 * 86_400_000) } },
    );
    const rma = await keszletApi.createRma(
      {
        arlistaTermekId: "1",
        termek: termek("1"),
        mennyiseg: 1,
        partnerId: "p1",
        partnerNev: "Partner Kft.",
      },
      actor,
    );
    expect(rma.ok).toBe(true);
    const d = await keszletApi.getDashboard(ADMIN);
    expect(d.alacsonyDb).toBe(1);
    expect(d.kritikus[0]?.arlistaTermekId).toBe("1");
    expect(d.elfekvo.map((e) => e.arlistaTermekId)).toEqual(["2"]);
    expect(d.aktivRma).toBe(1);
    expect(d.utolsoMozgasok.length).toBeGreaterThan(0);
  });
});

describe("RMA lifecycle", () => {
  it("follows the allowed transitions, conditionally, and lists assignments", async () => {
    const c = await keszletApi.createRma(
      {
        arlistaTermekId: "1",
        termek: termek("1"),
        mennyiseg: 1,
        partnerId: "p1",
        partnerNev: "P",
      },
      actor,
    );
    if (!c.ok || !c.id) throw new Error("create");
    const id = c.id;
    expect((await keszletApi.getRma(id))?.sorszam).toMatch(/^RMA-\d{4}-000001$/);
    expect((await keszletApi.rmaAtad(id, actor, actor)).ok).toBe(true);
    expect(await keszletApi.listMyAssignments(actor)).toHaveLength(1);
    expect(
      (
        await keszletApi.rmaAtmenet(id, "beszallitonak_kuldve", actor, {
          beszallitoNev: "Sup Kft.",
        })
      ).ok,
    ).toBe(true);
    expect((await keszletApi.rmaAtmenet(id, "beerkezett", actor)).ok).toBe(false);
    expect((await keszletApi.rmaAtmenet(id, "kicserelve", actor)).ok).toBe(true);
    expect(await keszletApi.listMyAssignments(actor)).toHaveLength(0);
    expect((await keszletApi.rmaAtmenet(id, "visszaadva_ugyfelnek", actor)).ok).toBe(
      true,
    );
    const d = await keszletApi.getRma(id);
    expect(d?.lehetsegesAtmenetek).toEqual([]);
    expect(d?.elozmenyek.map((e) => e.allapot)).toEqual([
      "visszaadva_ugyfelnek",
      "kicserelve",
      "beszallitonak_kuldve",
      "beerkezett",
    ]);
  });
});
