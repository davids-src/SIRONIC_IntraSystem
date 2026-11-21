import { describe, expect, it } from "vitest";
import {
  ajanlatHtml,
  ajanlatOsszesites,
  ajanlatPdfKeszit,
  kitoltendoValtozok,
  megrendeloOsszesites,
  munkanapHozzaad,
  sanitizeDocumentHtml,
  szerzodesRender,
  szerzodesValtozok,
  type PdfRenderer,
} from "./szamitas";
import { assertSzerkesztheto, NemSzerkeszthetoError } from "./constants";
import type { AjanlatSor } from "./types";

const sor = (o: Partial<AjanlatSor>): AjanlatSor => ({
  forras: "kezi",
  sorTipus: "termek",
  leiras: "Tétel",
  mennyiseg: 1,
  egyseg: "db",
  nettoEgysegar: 0,
  afaKulcs: 27,
  ...o,
});

describe("ajanlatOsszesites (offer-calculations.test.ts portja)", () => {
  it("normál termék tételek", () => {
    const r = ajanlatOsszesites([
      sor({
        leiras: "IP Kamera 4MP",
        mennyiseg: 2,
        nettoEgysegar: 35000,
        beszerzesiEgysegar: 20000,
      }),
    ]);
    expect(r.nettoOsszeg).toBe(70000);
    expect(r.termekBevetel).toBe(70000);
    expect(r.afaOsszeg).toBe(18900);
    expect(r.bruttoOsszeg).toBe(88900);
    expect(r.kozvetlenKoltseg).toBe(40000);
    expect(r.fedezet).toBe(30000);
    expect(r.fedezetSzazalek).toBeCloseTo(42.86, 1);
    expect(r.vanKoltsegAdat).toBe(true);
  });

  it("munkadíj és belső munkaköltség", () => {
    const r = ajanlatOsszesites([
      sor({
        sorTipus: "munkadij",
        mennyiseg: 10,
        egyseg: "óra",
        nettoEgysegar: 15000,
        belsoKoltseg: 6000,
      }),
    ]);
    expect(r.nettoOsszeg).toBe(150000);
    expect(r.munkadijBevetel).toBe(150000);
    expect(r.belsoMunkaKoltseg).toBe(60000);
    expect(r.kozvetlenKoltseg).toBe(0);
    expect(r.fedezet).toBe(90000);
    expect(r.fedezetSzazalek).toBe(60);
  });

  it("a csomag gyerek sorai nem számolódnak duplán, de a költségük igen", () => {
    const r = ajanlatOsszesites([
      sor({ leiras: "Csomag", nettoEgysegar: 250000, csomagId: "g1", csomagSzulo: true }),
      sor({
        mennyiseg: 4,
        nettoEgysegar: 30000,
        csomagId: "g1",
        beszerzesiEgysegar: 18000,
      }),
      sor({ nettoEgysegar: 80000, csomagId: "g1", beszerzesiEgysegar: 45000 }),
    ]);
    expect(r.nettoOsszeg).toBe(250000);
    expect(r.bruttoOsszeg).toBe(317500);
    expect(r.kozvetlenKoltseg).toBe(117000);
    expect(r.fedezet).toBe(133000);
    expect(r.fedezetSzazalek).toBeCloseTo(53.2, 1);
  });

  it("soronkénti és globális kedvezmény", () => {
    const r = ajanlatOsszesites(
      [sor({ nettoEgysegar: 100000, kedvezmenySzazalek: 10, beszerzesiEgysegar: 50000 })],
      5,
    );
    expect(r.nettoOsszeg).toBe(90000);
    expect(r.globalisKedvezmenyOsszeg).toBe(4500);
    expect(r.kedvezmenyesNetto).toBe(85500);
    expect(r.fedezet).toBe(35500);
    expect(r.fedezetSzazalek).toBeCloseTo(41.52, 1);
    // ÁFA a kedvezményes nettón: 85500 * 0.27
    expect(r.afaOsszeg).toBe(23085);
    expect(r.bruttoOsszeg).toBe(108585);
  });

  it("nulla értékek: nincs NaN és nullával osztás", () => {
    const r = ajanlatOsszesites(
      [sor({ sorTipus: "szolgaltatas", afaKulcs: 0, beszerzesiEgysegar: 0 })],
      0,
    );
    expect(r.nettoOsszeg).toBe(0);
    expect(r.bruttoOsszeg).toBe(0);
    expect(r.fedezetSzazalek).toBe(0);
    expect(Number.isNaN(r.fedezetSzazalek)).toBe(false);
  });

  it("üres lista", () => {
    const r = ajanlatOsszesites([]);
    expect(r.bruttoOsszeg).toBe(0);
    expect(r.sorok).toEqual([]);
  });

  it("a snapshot belső alapára a költség tartaléka, az ÁFA-bontás kulcsonként", () => {
    const r = ajanlatOsszesites([
      sor({
        forras: "szolgaltatas",
        sorTipus: "szolgaltatas",
        nettoEgysegar: 10000,
        afaKulcs: 27,
        arSnapshot: {
          forras: "szolgaltatas",
          tetelId: "x",
          kod: "SW-1",
          nev: "n",
          egyseg: "óra",
          arazasiTipus: "fix",
          belsoAlapar: 6000,
          szorzoKulcs: null,
          ugyfelSzorzo: 1,
          kalkulaltAr: 10000,
          surgosseg: null,
          surgossegiSzorzo: 1,
          vegAr: 10000,
          egyedi: false,
          egysegDb: null,
          afaKulcs: 27,
          penznem: "HUF",
          keszult: "2026-01-01T00:00:00.000Z",
        },
      }),
      sor({ nettoEgysegar: 1000, afaKulcs: 5 }),
    ]);
    expect(r.kozvetlenKoltseg).toBe(6000);
    expect(r.afaBontas.map((b) => b.afaKulcs)).toEqual([5, 27]);
  });
});

describe("megrendeloOsszesites", () => {
  it("nettó, ÁFA, bruttó", () => {
    const r = megrendeloOsszesites([
      { leiras: "a", mennyiseg: 3, egyseg: "db", nettoEgysegar: 1000, afaKulcs: 27 },
      { leiras: "b", mennyiseg: 1, egyseg: "db", nettoEgysegar: 500, afaKulcs: 0 },
    ]);
    expect(r).toEqual({ nettoOsszeg: 3500, afaOsszeg: 810, bruttoOsszeg: 4310 });
  });
});

describe("munkanapHozzaad", () => {
  it("péntek + 3 munkanap = szerda", () => {
    const d = munkanapHozzaad(new Date(2026, 10, 20), 3); // 2026-11-20 péntek
    expect(d.getDay()).toBe(3);
    expect(d.getDate()).toBe(25);
  });
});

describe("szerződés változók", () => {
  it("kigyűjti a változókat, a rendszerváltozó nem kitöltendő", () => {
    const sz = "Megbízó: {{partner_nev}}, díj: {{ dij }}, {{dij}}, határidő {{hatarido}}";
    expect(szerzodesValtozok(sz)).toEqual(["partner_nev", "dij", "hatarido"]);
    expect(kitoltendoValtozok(sz)).toEqual(["dij", "hatarido"]);
  });

  it("behelyettesít, escape-el és szanitál", () => {
    const html = szerzodesRender(
      "<p>{{partner_nev}} fizet: {{dij}} / {{ures}}</p><script>x()</script>",
      { dij: "<b>5</b>" },
      { partner_nev: "Acme & Fiai" },
    );
    expect(html).toBe("<p>Acme &amp; Fiai fizet: &lt;b&gt;5&lt;/b&gt; / </p>");
  });

  it("sanitizeDocumentHtml: eseménykezelő és javascript: URL eltávolítva", () => {
    const s = sanitizeDocumentHtml(
      '<a href="javascript:alert(1)" onclick="x()">a</a><img src="a.png" onerror=boom()>',
    );
    expect(s).not.toMatch(/javascript:/i);
    expect(s).not.toMatch(/onclick|onerror/i);
  });
});

describe("ajanlatHtml / PdfRenderer", () => {
  const adat = {
    azonosito: "AJ-000001",
    cim: "Kamerarendszer <teszt>",
    partnerNev: "Acme Kft.",
    partnerCim: "1111 Budapest, Fő u. 1.",
    penznem: "HUF",
    sorok: [sor({ leiras: "Kamera", mennyiseg: 2, nettoEgysegar: 35000 })],
    osszegek: {
      nettoOsszeg: 70000,
      globalisKedvezmenySzazalek: 0,
      globalisKedvezmenyOsszeg: 0,
      kedvezmenyesNetto: 70000,
      afaOsszeg: 18900,
      bruttoOsszeg: 88900,
      afaBontas: [{ afaKulcs: 27, netto: 70000, afa: 18900, brutto: 88900 }],
    },
  };

  it("csak a beágyazott értékekből épít, escape-el", () => {
    const h = ajanlatHtml(adat, { nev: "SIRONIC Kft." });
    expect(h).toContain("AJ-000001");
    expect(h).toContain("Kamerarendszer &lt;teszt&gt;");
    expect(h).toContain("Kamera");
    expect(h).toContain("SIRONIC Kft.");
    expect(h.replace(/\s/g, " ")).toContain("88 900 Ft");
  });

  it("a renderer seamen át megy", async () => {
    const hivasok: Array<[string, string]> = [];
    const renderer: PdfRenderer = {
      render: (html, nev) => void hivasok.push([html, nev]),
    };
    await ajanlatPdfKeszit(renderer, adat, { nev: "SIRONIC" });
    expect(hivasok[0]?.[1]).toBe("AJ-000001.pdf");
    expect(hivasok[0]?.[0]).toContain("<html");
  });
});

describe("assertSzerkesztheto", () => {
  it("piszkozatnál átmegy, másnál típusos hibát dob", () => {
    expect(() => assertSzerkesztheto("ajanlat", "piszkozat")).not.toThrow();
    expect(() => assertSzerkesztheto("ajanlat", "elkuldve")).toThrow(
      NemSzerkeszthetoError,
    );
  });
});
