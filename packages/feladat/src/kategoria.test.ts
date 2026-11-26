import { describe, expect, it } from "vitest";
import {
  NINCS_KATEGORIA,
  csoportStatisztika,
  kapcsolatKategoria,
  kategoriaKulcs,
  tisztaKategoria,
  type KategoriaTetel,
} from "./kategoria";

const MA = "2026-11-20";
const d = (s: string) => new Date(`${s}T10:00:00.000Z`);

function tetel(extra: Partial<KategoriaTetel> = {}): KategoriaTetel {
  return {
    kategoria: "Beszerzés",
    felelosNev: "Kiss Anna",
    kiadoNev: "Nagy Béla",
    allapot: "elfogadva",
    hatarido: "2026-11-25",
    createdAt: d("2026-11-10"),
    ...extra,
  };
}

describe("kategória (#65)", () => {
  it("cleans the display spelling and caps its length", () => {
    expect(tisztaKategoria("  Projekt   X  ")).toBe("Projekt X");
    expect(tisztaKategoria("   ")).toBeUndefined();
    expect(tisztaKategoria(undefined)).toBeUndefined();
    expect(tisztaKategoria("a".repeat(80))).toHaveLength(60);
  });

  it("matches spellings ignoring case, accents and spacing", () => {
    expect(kategoriaKulcs("Szerződés")).toBe(kategoriaKulcs(" szerzodes "));
    expect(kategoriaKulcs("SZERZŐDÉS")).toBe("szerzodes");
    expect(kategoriaKulcs("Iroda  ügyek")).toBe("iroda ugyek");
    expect(kategoriaKulcs("Beszerzés")).not.toBe(kategoriaKulcs("Beszerzés 2"));
  });

  it("gives linked tasks their module default", () => {
    expect(kapcsolatKategoria({ modul: "ertekesites", tipus: "szerzodes" })).toBe(
      "Értékesítés",
    );
    expect(kapcsolatKategoria({ modul: "ertekesites", tipus: "ajanlatkeres" })).toBe(
      "Értékesítés",
    );
    expect(kapcsolatKategoria({ modul: "x", tipus: "y" })).toBeUndefined();
  });

  it("groups stats: open, overdue, done on time, lead time — empty bucket last", () => {
    const stat = csoportStatisztika(
      [
        tetel(),
        tetel({ hatarido: "2026-11-18" }), // overdue
        tetel({
          allapot: "lezarva",
          hatarido: "2026-11-15",
          lezarva: d("2026-11-14"),
          lezarvaNap: "2026-11-14",
        }), // on time, 4 days
        tetel({
          allapot: "lezarva",
          hatarido: "2026-11-12",
          lezarva: d("2026-11-16"),
          lezarvaNap: "2026-11-16",
        }), // late, 6 days
        tetel({ allapot: "tovabbadva" }), // not counted
        tetel({ kategoria: undefined, allapot: "elutasitva" }),
        tetel({ kategoria: "Iroda", allapot: "visszavonva" }),
      ],
      "kategoria",
      MA,
    );
    expect(stat.map((s) => s.nev)).toEqual(["Beszerzés", "Iroda", NINCS_KATEGORIA]);
    expect(stat[0]).toMatchObject({
      osszes: 4,
      nyitott: 2,
      lejart: 1,
      kesz: 2,
      hataridoreKesz: 1,
      hataridoreSzazalek: 50,
      atlagNap: 5,
    });
    expect(stat[1]).toMatchObject({ osszes: 1, visszavont: 1, nyitott: 0 });
    expect(stat[2]).toMatchObject({ osszes: 1, elutasitott: 1, nyitott: 1 });
    expect(stat[2]!.hataridoreSzazalek).toBeUndefined();
  });

  it("groups by felelős and kiadó too", () => {
    const tetelek = [
      tetel(),
      tetel({ felelosNev: "Tóth Ede" }),
      tetel({ felelosNev: "Tóth Ede", kiadoNev: "Kiss Anna" }),
    ];
    expect(
      csoportStatisztika(tetelek, "felelos", MA).map((s) => [s.nev, s.osszes]),
    ).toEqual([
      ["Tóth Ede", 2],
      ["Kiss Anna", 1],
    ]);
    expect(
      csoportStatisztika(tetelek, "kiado", MA).map((s) => [s.nev, s.osszes]),
    ).toEqual([
      ["Nagy Béla", 2],
      ["Kiss Anna", 1],
    ]);
  });
});
