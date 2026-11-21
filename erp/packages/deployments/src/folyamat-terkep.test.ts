import { describe, expect, it } from "vitest";
import { FOLYAMAT_LEPES_ALLAPOTOK } from "@erp/core/folyamat";
import { LEPES_ALLAPOTOK } from "./constants";
import { LEPES_FOLYAMAT_ALLAPOT, telepitesFolyamatNezet } from "./folyamat-terkep";

describe("step state → folyamat vocabulary", () => {
  it("maps every step state to a known folyamat state", () => {
    const ismert = new Set<string>([...FOLYAMAT_LEPES_ALLAPOTOK, "kihagyva"]);
    for (const a of LEPES_ALLAPOTOK) expect(ismert.has(LEPES_FOLYAMAT_ALLAPOT[a])).toBe(true);
  });

  it("documented mapping", () => {
    expect(LEPES_FOLYAMAT_ALLAPOT).toEqual({
      fuggo: "tervezett",
      fut: "aktiv",
      kezi: "aktiv",
      kesz: "kesz",
      adoptalva: "kesz",
      hibas: "elutasitva",
      kihagyva: "kihagyva",
    });
  });
});

describe("telepitesFolyamatNezet", () => {
  it("builds the shared FolyamatNezet with the blocking step as current", () => {
    const n = telepitesFolyamatNezet({
      id: "t1",
      azonosito: "DEP-000001",
      nev: "Teszt",
      domain: "a.hu",
      allapot: "serult",
      frissitve: "2026-11-21T10:00:00.000Z",
      lepesek: [
        { kulcs: "cloudflare_zona", allapot: "kesz" },
        { kulcs: "ns_delegalas", allapot: "hibas", utolsoHiba: "boom" },
        { kulcs: "dns_rekordok", allapot: "fuggo" },
      ],
    });
    expect(n.modul).toBe("deployments");
    expect(n.url).toBe("/telepitesek/t1");
    expect(n.lepesek.map((l) => l.allapot)).toEqual(["kesz", "elutasitva", "tervezett"]);
    expect(n.aktualis?.nev).toBe("NS delegálás");
    expect(n.lezart).toBe(false);
  });
});
