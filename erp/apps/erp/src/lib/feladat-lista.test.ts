import { describe, expect, it } from "vitest";
import type { FeladatCsoportTag, FeladatSor } from "@erp/feladat/client";
import { csoportositSorok, feladatSorok, rendez, teendoSor } from "./feladat-lista";
import type { Teendo } from "./teendo";

const MA = "2026-11-19";

function feladat(extra: Partial<FeladatSor> = {}): FeladatSor {
  return {
    id: "a".repeat(24),
    cim: "Ajánlat visszahívása",
    hatarido: "2026-11-25",
    allapot: "kiadva",
    kesik: false,
    kiadoId: "k",
    kiadoNev: "Nagy Béla",
    felelosNev: "Kiss Anna",
    createdAt: "2026-11-18T08:00:00.000Z",
    prioritas: "normal",
    mediaIds: [],
    megjegyzesek: [],
    naplo: [],
    szerep: "felelos",
    sajat: false,
    lepesek: [],
    muveletek: {
      dont: true,
      lezar: false,
      visszavon: false,
      ujrakiad: false,
      megjegyzes: true,
      tovabbad: false,
      lepesek: false,
      kezel: false,
    },
    ...extra,
  };
}

const teendo = (f: FeladatSor, uj: boolean): Teendo => ({
  key: `feladat-${f.id}`,
  kategoria: f.sajat ? "sajat" : "kollegatol",
  cim: f.cim,
  allapot: "",
  hatarido: f.hatarido,
  uj,
  feladat: f,
  prioritas: f.prioritas,
});

describe("Feladatok list rows", () => {
  it("every task row opens the task page; a module item opens its own page", () => {
    const f = feladat();
    expect(teendoSor(teendo(f, true), MA)).toMatchObject({
      href: `/feladatok/${f.id}`,
      allapot: "elfogadasra_var",
      allapotTon: "info",
      alcim: "Kiadta: Nagy Béla",
    });
    const gep = teendoSor(
      {
        key: "gepeszet-gep-1",
        kategoria: "egyeb",
        cim: "Műszaki vizsga lejár",
        alcim: "ABC-123",
        allapot: "Lejár",
        hatarido: "2026-11-18",
        uj: false,
        url: "/gepeszet/gepek/1",
      },
      MA,
    );
    expect(gep).toMatchObject({
      href: "/gepeszet/gepek/1",
      allapot: "modul",
      sav: "lejart",
      kesik: true,
      alcim: "ABC-123 · Lejár",
    });
  });

  it("a refused task the viewer gave is flagged for them to act on", () => {
    const f = feladat({ allapot: "elutasitva", szerep: "kiado" });
    expect(teendoSor(teendo(f, false), MA)).toMatchObject({
      allapot: "elutasitva",
      allapotTon: "danger",
    });
  });

  it("orders overdue, then due today, then urgent, then waiting for acceptance", () => {
    const sor = (id: string, extra: Partial<FeladatSor>, uj = false) =>
      teendoSor(teendo(feladat({ id: id.padEnd(24, "0"), cim: id, ...extra }), uj), MA);
    const sorrend = rendez([
      sor("kesobb", { hatarido: "2026-12-30", allapot: "elfogadva" }),
      sor("var", { hatarido: "2026-12-30" }, true),
      sor("surgos", {
        hatarido: "2026-12-30",
        prioritas: "surgos",
        allapot: "elfogadva",
      }),
      sor("ma", { hatarido: MA, allapot: "elfogadva" }),
      sor("lejart", { hatarido: "2026-11-01", kesik: true, allapot: "elfogadva" }),
    ]).map((s) => s.cim);
    expect(sorrend).toEqual(["lejart", "ma", "surgos", "var", "kesobb"]);
  });

  it("shows a group task once, with progress and every member as felelős", () => {
    const tagok = [
      { id: "1".repeat(24), felelosNev: "Kiss Anna", allapot: "lezarva" as const },
      { id: "2".repeat(24), felelosNev: "Tóth Pál", allapot: "elfogadva" as const },
    ].map<FeladatCsoportTag>((t, i) => ({
      ...t,
      sajat: false,
      elsodleges: i === 0,
      hatarido: "2026-11-25",
      kesik: false,
      lepesKesz: 0,
      lepesOsszes: 0,
    }));
    const csoport = {
      id: "c".repeat(24),
      tagok,
      haladas: {
        aktiv: 2,
        kesz: 1,
        kesik: 0,
        allapotonkent: { lezarva: 1, elfogadva: 1 },
      },
    };
    const sorok = feladatSorok(
      [
        feladat({ id: tagok[0]!.id, szerep: "kiado", allapot: "lezarva", csoport }),
        feladat({ id: tagok[1]!.id, szerep: "kiado", allapot: "elfogadva", csoport }),
      ],
      MA,
    );
    expect(sorok).toHaveLength(1);
    expect(sorok[0]).toMatchObject({
      haladas: "1/2 kész",
      felelos: "Kiss Anna, Tóth Pál",
    });
  });
});

describe("csoportosítás (#65)", () => {
  it("carries the category and the linked entity onto the row", () => {
    const sor = teendoSor(
      teendo(
        feladat({
          kategoria: "Szerződés",
          kapcsolat: {
            modul: "vallalkozas",
            tipus: "szerzodes",
            id: "b".repeat(24),
            szakasz: "velemenyezes",
            url: "/vallalkozas/szerzodesek/x",
          },
        }),
        false,
      ),
      MA,
    );
    expect(sor.kategoria).toBe("Szerződés");
    expect(sor.kapcsolatKulcs).toBe(`vallalkozas:szerzodes:${"b".repeat(24)}`);
  });

  it("groups rows by category with open / overdue counts, empty bucket last", () => {
    const sorok = feladatSorok(
      [
        feladat({ id: "1".repeat(24), kategoria: "Iroda" }),
        feladat({ id: "2".repeat(24), kategoria: "Beszerzés", kesik: true }),
        feladat({ id: "3".repeat(24), kategoria: "Beszerzés", allapot: "lezarva" }),
        feladat({ id: "4".repeat(24) }),
      ],
      MA,
    );
    const csoportok = csoportositSorok(sorok, "kategoria");
    expect(csoportok.map((c) => [c.nev, c.sorok.length, c.nyitott, c.lejart])).toEqual([
      ["Beszerzés", 2, 1, 1],
      ["Iroda", 1, 1, 0],
      ["Nincs kategória", 1, 1, 0],
    ]);
    expect(csoportositSorok(sorok, "kiado").map((c) => c.nev)).toEqual(["Nagy Béla"]);
  });
});
