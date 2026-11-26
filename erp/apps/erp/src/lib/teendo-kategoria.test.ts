// @vitest-environment node
import { describe, expect, it } from "vitest";
import { kategoriaOf } from "./teendo-feed";
import { TEENDO_KATEGORIAK, TEENDO_KATEGORIA_LABELS } from "./teendo";

describe("Teendőim kategóriák", () => {
  it("minden modul a saját kategóriájába kerül, nem az 'egyébbe'", () => {
    const eloleg: Record<string, string> = {
      eszkoz: "eszkoz",
      partner: "partner",
      projekt: "projekt",
      keszlet: "keszlet",
      ertekesites: "ertekesites",
      szerviz: "szerviz",
      bizonylat: "bizonylat",
      infra: "infra",
    };
    for (const [modul, kat] of Object.entries(eloleg))
      expect(kategoriaOf({ module: modul, entityType: "x" })).toBe(kat);
  });

  it("a feladat modul forrás szerint osztódik, az ismeretlen modul 'egyéb'", () => {
    expect(kategoriaOf({ module: "feladat", entityType: "feladat-sajat" })).toBe("sajat");
    expect(kategoriaOf({ module: "feladat", entityType: "feladat" })).toBe("kollegatol");
    expect(kategoriaOf({ module: "ismeretlen", entityType: "x" })).toBe("egyeb");
  });

  it("minden kategóriának van magyar címkéje", () => {
    for (const k of TEENDO_KATEGORIAK) expect(TEENDO_KATEGORIA_LABELS[k]).toBeTruthy();
  });
});
