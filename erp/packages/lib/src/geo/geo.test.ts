import { describe, expect, it } from "vitest";
import { tavolsagKm, validateGeoPont } from "./geo";
import { legkozelebbiTelepules, telepulesSzovegbol } from "./telepules";

describe("tavolsagKm", () => {
  it("is ~0 for the same point and ~165 km Budapest–Győr", () => {
    expect(tavolsagKm({ lat: 47.5, lng: 19.04 }, { lat: 47.5, lng: 19.04 })).toBeCloseTo(
      0,
      5,
    );
    const d = tavolsagKm({ lat: 47.4979, lng: 19.0402 }, { lat: 47.6875, lng: 17.6504 });
    expect(d).toBeGreaterThan(100);
    expect(d).toBeLessThan(130);
  });
});

describe("validateGeoPont", () => {
  it("accepts a good fix", () => {
    expect(validateGeoPont({ lat: 47.5, lng: 19, pontossag: 20 }).ok).toBe(true);
  });
  it("rejects missing, out-of-range and NaN positions", () => {
    expect(validateGeoPont(undefined).ok).toBe(false);
    expect(validateGeoPont({ lat: 91, lng: 0 }).ok).toBe(false);
    expect(validateGeoPont({ lat: NaN, lng: 0 }).ok).toBe(false);
    expect(validateGeoPont({ lat: "47", lng: 19 }).ok).toBe(false);
  });
  it("rejects a too-inaccurate fix", () => {
    expect(validateGeoPont({ lat: 47.5, lng: 19, pontossag: 5000 }).ok).toBe(false);
  });
});

describe("legkozelebbiTelepules", () => {
  it("resolves well-known towns", () => {
    expect(legkozelebbiTelepules({ lat: 47.4979, lng: 19.0402 })?.nev).toBe("Budapest");
    expect(legkozelebbiTelepules({ lat: 47.4, lng: 19.11 })?.nev).toBe("Budapest"); // XXIII. ker.
    expect(legkozelebbiTelepules({ lat: 47.53, lng: 21.627 })?.nev).toBe("Debrecen");
  });
  it("returns nothing far outside Hungary", () => {
    expect(legkozelebbiTelepules({ lat: 48.85, lng: 2.35 })).toBeUndefined();
  });
});

describe("telepulesSzovegbol", () => {
  const nev = (s: string) => telepulesSzovegbol(s)?.nev;

  it("finds the settlement in the free-text helyszín", () => {
    expect(nev("Somogytúr")).toBe("Somogytúr");
    expect(nev("9000_Somogytúr BG 22 151217450 ép.vez, étkező,pihenő")).toBe("Somogytúr");
    expect(nev("Dunakeszi SWIETTELSKY telephely")).toBe("Dunakeszi");
    expect(nev("Üllő Aszfalt Hungária")).toBe("Üllő");
    expect(nev("Euroaszfalt Hungária Üllő")).toBe("Üllő");
    expect(nev("Diósd-albérlet")).toBe("Diósd");
    expect(nev("Tárnok PUHI")).toBe("Tárnok");
    expect(nev("????_Füzesabony Borosjenői Ernő és a törősök raktárkonténere")).toBe(
      "Füzesabony",
    );
    expect(nev("Martonvásár Soma Trans telephely( Kaufmann Jenő telefon alapján)")).toBe(
      "Martonvásár",
    );
  });

  it("averages a city with several entries close together", () => {
    const bp = telepulesSzovegbol("Budapest XI. kerület");
    expect(bp?.nev).toBe("Budapest");
    expect(bp!.lat).toBeGreaterThan(47.4);
    expect(bp!.lat).toBeLessThan(47.6);
  });

  it("matches without accents as a fallback", () => {
    expect(nev("Ullo raktar")).toBe("Üllő");
  });

  it("never matches a person, a placeholder or a company name", () => {
    for (const s of [
      "Bekker János",
      "Omisch Róbert",
      "Halász Róbert",
      "Nagy László",
      "Szentes Péter",
      "Dénes",
      "nincs pozíció",
      "nem ismert",
      "ellopták",
      "nem tudja senki hol van?",
      "3152_Egis TESCAR ",
      "3838_FEKE iroda, szerszám raktár",
      "",
    ]) {
      expect(nev(s), s).toBeUndefined();
    }
  });
});
