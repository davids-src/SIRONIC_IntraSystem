import { describe, expect, it } from "vitest";
import { ALAP_ARAZASI_BEALLITASOK, type ArazasiBeallitasok } from "./constants";
import {
  arMatrixSor,
  bruttoAr,
  calculateServicePrice,
  calculateServicePriceForPartner,
  kerekit,
  mapPartnerProfilToSzorzoKulcs,
} from "./szamitas";

const B: ArazasiBeallitasok = ALAP_ARAZASI_BEALLITASOK;

describe("mapPartnerProfilToSzorzoKulcs", () => {
  it("alvállalkozó megbízó: napi jelenlét vs. minden más", () => {
    const kulcs = (alvallalkozoiJelenlet?: "napi_jelenlet" | "projekt" | "mindketto") =>
      mapPartnerProfilToSzorzoKulcs({
        szerep: "alvallalkozo_megbizo",
        alvallalkozoiJelenlet,
      });
    expect(kulcs("napi_jelenlet")).toBe("alvallalkozo_jelenlet");
    expect(kulcs("projekt")).toBe("alvallalkozo_projekt");
    expect(kulcs("mindketto")).toBe("alvallalkozo_projekt");
    expect(kulcs()).toBe("alvallalkozo_projekt");
  });

  it("magánszemély és nagyvállalat a szerződéstípustól függetlenül", () => {
    expect(
      mapPartnerProfilToSzorzoKulcs({
        ugyfelKategoria: "maganszemely",
        szerzodesTipus: "2_eves",
      }),
    ).toBe("maganszemely");
    expect(
      mapPartnerProfilToSzorzoKulcs({
        ugyfelKategoria: "nagyvallalat",
        szerzodesTipus: "eseti",
      }),
    ).toBe("nagyvallalat");
  });

  it("KKV a szerződés hossza szerint, alapértelmezés eseti", () => {
    const kulcs = (szerzodesTipus?: "eseti" | "6_honapos" | "1_eves" | "2_eves" | null) =>
      mapPartnerProfilToSzorzoKulcs({ ugyfelKategoria: "kkv", szerzodesTipus });
    expect(kulcs("eseti")).toBe("kkv_eseti");
    expect(kulcs("6_honapos")).toBe("kkv_6_honapos");
    expect(kulcs("1_eves")).toBe("kkv_1_eves");
    expect(kulcs("2_eves")).toBe("kkv_2_eves");
    expect(kulcs(undefined)).toBe("kkv_eseti");
    expect(mapPartnerProfilToSzorzoKulcs({})).toBe("kkv_eseti");
  });
});

describe("calculateServicePrice", () => {
  it("egyedi árajánlat: nincs kalkulált ár", () => {
    const r = calculateServicePrice({ arazasiTipus: "egyedi" }, "kkv_1_eves", B, {
      surgosseg: "ejszakai",
    });
    expect(r).toMatchObject({ egyedi: true, vegAr: 0, kalkulaltAr: 0, ugyfelSzorzo: 1 });
  });

  it("fix ár: alap × ügyfélszorzó, 100-ra kerekítve", () => {
    const r = calculateServicePrice(
      { arazasiTipus: "fix", belsoAlapar: 10_000 },
      "maganszemely",
      B,
    );
    expect(r.belsoAlapar).toBe(10_000);
    expect(r.ugyfelSzorzo).toBe(1.3);
    expect(r.kalkulaltAr).toBe(13_000);
    expect(r.vegAr).toBe(13_000);
    expect(r.egyedi).toBe(false);
  });

  it("kerekítés 100-ra (1 234 × 1,08 = 1 332,72 → 1 300)", () => {
    const r = calculateServicePrice(
      { arazasiTipus: "fix", belsoAlapar: 1_234 },
      "kkv_6_honapos",
      B,
    );
    expect(r.kalkulaltAr).toBe(1_300);
  });

  it("óradíj: óradíj × rezsi, 100-ra kerekítve, majd ügyfélszorzó", () => {
    // 5500 × 1,45 = 7975 → 8000; × 0,88 = 7040 → 7000
    const r = calculateServicePrice(
      { arazasiTipus: "oradij", oradijKategoria: "it_uzemeltetes" },
      "nagyvallalat",
      B,
    );
    expect(r.belsoAlapar).toBe(8_000);
    expect(r.kalkulaltAr).toBe(7_000);
  });

  it("ismeretlen óradíj-kategória: 0 alap", () => {
    const r = calculateServicePrice(
      { arazasiTipus: "oradij", oradijKategoria: "nincs" },
      "kkv_1_eves",
      B,
    );
    expect(r.belsoAlapar).toBe(0);
    expect(r.vegAr).toBe(0);
  });

  it("egységalapú: a darabszámnak megfelelő sáv, nyitott felső határral", () => {
    const tetel = {
      arazasiTipus: "egysegalapu" as const,
      egysegSavok: [
        { cimke: "1–10", minEgyseg: 1, maxEgyseg: 10, alapar: 20_000 },
        { cimke: "11+", minEgyseg: 11, maxEgyseg: null, alapar: 50_000 },
      ],
    };
    const alap = (egysegDb?: number) =>
      calculateServicePrice(tetel, "kkv_1_eves", B, { egysegDb }).belsoAlapar;
    expect(alap(5)).toBe(20_000);
    expect(alap(10)).toBe(20_000);
    expect(alap(11)).toBe(50_000);
    expect(alap(500)).toBe(50_000);
    expect(alap(0)).toBe(0);
    expect(alap()).toBe(0);
  });

  it("sürgősségi szorzó a kalkulált áron, újra kerekítve", () => {
    const r = calculateServicePrice(
      { arazasiTipus: "fix", belsoAlapar: 10_000 },
      "kkv_1_eves",
      B,
      { surgosseg: "hetvege" },
    );
    expect(r.kalkulaltAr).toBe(10_000);
    expect(r.surgossegiSzorzo).toBe(1.75);
    expect(r.vegAr).toBe(17_500);
  });

  it("sürgősség nélkül a szorzó 1", () => {
    const r = calculateServicePrice(
      { arazasiTipus: "fix", belsoAlapar: 10_000 },
      "kkv_1_eves",
      B,
    );
    expect(r.surgossegiSzorzo).toBe(1);
    expect(r.vegAr).toBe(r.kalkulaltAr);
  });

  it("a módosított beállítás számít (tiszta függvény, nincs rejtett állapot)", () => {
    const m = { ...B, ugyfelSzorzok: { ...B.ugyfelSzorzok, kkv_1_eves: 2 } };
    const t = { arazasiTipus: "fix" as const, belsoAlapar: 1_000 };
    expect(calculateServicePrice(t, "kkv_1_eves", m).vegAr).toBe(2_000);
    expect(calculateServicePrice(t, "kkv_1_eves", B).vegAr).toBe(1_000);
  });

  it("belső alapár hiányában 0", () => {
    expect(calculateServicePrice({ arazasiTipus: "fix" }, "kkv_1_eves", B).vegAr).toBe(0);
  });
});

describe("calculateServicePriceForPartner / arMatrixSor", () => {
  it("a partnerprofilból oldja fel az oszlopot", () => {
    const r = calculateServicePriceForPartner(
      { arazasiTipus: "fix", belsoAlapar: 10_000 },
      { ugyfelKategoria: "kkv", szerzodesTipus: "2_eves" },
      B,
    );
    expect(r.szorzoKulcs).toBe("kkv_2_eves");
    expect(r.vegAr).toBe(9_200);
  });

  it("mind a 9 oszlop ki van töltve", () => {
    const sor = arMatrixSor({ arazasiTipus: "fix", belsoAlapar: 10_000 }, B);
    expect(Object.keys(sor)).toHaveLength(9);
    expect(sor.maganszemely).toBe(13_000);
    expect(sor.alvallalkozo_jelenlet).toBe(7_500);
  });
});

describe("kerekit / bruttoAr", () => {
  it("kerekít", () => {
    expect(kerekit(149)).toBe(100);
    expect(kerekit(150)).toBe(200);
    expect(kerekit(0)).toBe(0);
  });
  it("bruttó", () => {
    expect(bruttoAr(10_000, 0.27)).toBe(12_700);
  });
});
