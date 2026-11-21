import { describe, expect, it } from "vitest";
import {
  csoportHaladas,
  feladatEgysegek,
  feladatSorrend,
  monogram,
  osszesitettAllapot,
} from "./egyseg";
import type { FeladatCsoportTag, FeladatSor } from "./types";

function tag(
  p: Partial<FeladatCsoportTag> & Pick<FeladatCsoportTag, "id">,
): FeladatCsoportTag {
  return {
    felelosNev: p.id,
    allapot: "kiadva",
    elsodleges: false,
    hatarido: "2026-11-20",
    kesik: false,
    lepesKesz: 0,
    lepesOsszes: 0,
    sajat: false,
    ...p,
  };
}

function sor(p: Partial<FeladatSor> & Pick<FeladatSor, "id">): FeladatSor {
  return {
    cim: "Feladat",
    hatarido: "2026-11-20",
    allapot: "kiadva",
    kesik: false,
    kiadoId: "k",
    kiadoNev: "Kiadó",
    felelosNev: "Felelős",
    createdAt: "2026-11-01T10:00:00.000Z",
    prioritas: "normal",
    mediaIds: [],
    megjegyzesek: [],
    naplo: [],
    szerep: "kiado",
    sajat: false,
    lepesek: [],
    muveletek: {
      dont: false,
      lezar: false,
      visszavon: false,
      ujrakiad: false,
      megjegyzes: false,
      tovabbad: false,
      lepesek: false,
      kezel: false,
    },
    ...p,
  };
}

describe("csoportos feladat egységként (8m)", () => {
  it("progress leaves out withdrawn and handed-on copies", () => {
    const h = csoportHaladas([
      tag({ id: "a", allapot: "lezarva" }),
      tag({ id: "b", allapot: "elfogadva", kesik: true }),
      tag({ id: "c", allapot: "visszavonva" }),
      tag({ id: "d", allapot: "tovabbadva" }),
      tag({ id: "e", allapot: "kiadva" }),
    ]);
    expect(h).toEqual({
      aktiv: 3,
      kesz: 1,
      kesik: 1,
      allapotonkent: {
        lezarva: 1,
        elfogadva: 1,
        visszavonva: 1,
        tovabbadva: 1,
        kiadva: 1,
      },
    });
  });

  it("one state for the group: refusal first, then waiting, then in progress, then done", () => {
    const t = (...a: FeladatCsoportTag["allapot"][]) =>
      osszesitettAllapot(a.map((allapot, i) => tag({ id: String(i), allapot })));
    expect(t("lezarva", "elutasitva", "kiadva")).toBe("elutasitva");
    expect(t("lezarva", "elfogadva", "kiadva")).toBe("kiadva");
    expect(t("lezarva", "elfogadva")).toBe("elfogadva");
    expect(t("lezarva", "visszavonva", "tovabbadva")).toBe("lezarva");
    expect(t("visszavonva", "tovabbadva")).toBe("visszavonva");
  });

  it("sorts overdue first, then urgent, then by deadline", () => {
    const a = {
      kesik: false,
      prioritas: "normal" as const,
      hatarido: "2026-11-18",
      createdAt: "",
    };
    const b = {
      kesik: false,
      prioritas: "surgos" as const,
      hatarido: "2026-11-30",
      createdAt: "",
    };
    const c = {
      kesik: true,
      prioritas: "normal" as const,
      hatarido: "2026-11-10",
      createdAt: "",
    };
    const d = {
      kesik: false,
      prioritas: "normal" as const,
      hatarido: "2026-11-17",
      createdAt: "",
    };
    expect([a, b, c, d].sort(feladatSorrend)).toEqual([c, b, d, a]);
  });

  it("folds the copies of a group into one unit, single tasks stay as they are", () => {
    const tagok = [
      tag({ id: "g1", felelosNev: "Anna", elsodleges: true, allapot: "lezarva" }),
      tag({ id: "g2", felelosNev: "Csaba", hatarido: "2026-11-19" }),
    ];
    const csoport = { id: "cs", tagok, haladas: csoportHaladas(tagok) };
    const egysegek = feladatEgysegek([
      sor({ id: "g2", cim: "Leltár", csoport, hatarido: "2026-11-19" }),
      sor({ id: "egy", cim: "Egyéni", felelosNev: "Dóra", prioritas: "surgos" }),
      sor({ id: "g1", cim: "Leltár", csoport, allapot: "lezarva" }),
    ]);
    expect(egysegek.map((e) => [e.kulcs, e.csoportos, e.peldanyok.length])).toEqual([
      ["egy", false, 1],
      ["cs", true, 2],
    ]);
    const cs = egysegek[1]!;
    expect(cs).toMatchObject({
      // The open copy's deadline, the primary's name, the primary's copy to open.
      hatarido: "2026-11-19",
      felelosNev: "Anna",
      id: "g1",
      allapot: "kiadva",
      haladas: { aktiv: 2, kesz: 1 },
    });
    expect(egysegek[0]!.tagok).toEqual([
      expect.objectContaining({ id: "egy", felelosNev: "Dóra" }),
    ]);
  });

  it("initials for avatars", () => {
    expect(monogram("Kiss Anna")).toBe("KA");
    expect(monogram("Nagy Béla Ferenc")).toBe("NF");
    expect(monogram("admin")).toBe("AD");
    expect(monogram("  ")).toBe("?");
  });
});
