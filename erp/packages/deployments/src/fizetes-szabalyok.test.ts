import { describe, expect, it } from "vitest";
import {
  ciklusLeptet,
  esedekesIdoszakok,
  fizetesAllapot,
  hatekonyAr,
  hatekonyCiklus,
  honapHozzaad,
  idoszakVege,
} from "./fizetes-szabalyok";

const d = (s: string) => new Date(`${s}T00:00:00.000Z`);
const nap = (x: Date) => x.toISOString().slice(0, 10);

describe("month arithmetic", () => {
  it("clamps to the end of a shorter month", () => {
    expect(nap(honapHozzaad(d("2026-01-31"), 1))).toBe("2026-02-28");
    expect(nap(honapHozzaad(d("2028-01-31"), 1))).toBe("2028-02-29");
    expect(nap(honapHozzaad(d("2026-11-30"), 3))).toBe("2027-02-28");
  });
  it("rolls the year", () => {
    expect(nap(honapHozzaad(d("2026-12-15"), 1))).toBe("2027-01-15");
  });
  it("advances by cycle", () => {
    expect(nap(ciklusLeptet(d("2026-01-10"), "havi"))).toBe("2026-02-10");
    expect(nap(ciklusLeptet(d("2026-01-10"), "negyedeves"))).toBe("2026-04-10");
    expect(nap(ciklusLeptet(d("2026-01-10"), "eves"))).toBe("2027-01-10");
  });
  it("period end is the day before the next period starts", () => {
    expect(nap(idoszakVege(d("2026-01-10"), "havi"))).toBe("2026-02-09");
  });
});

describe("overdue is computed, never stored", () => {
  const veg = d("2026-03-31");
  it("an open payment is esedekes until its period end has passed", () => {
    expect(fizetesAllapot("esedekes", veg, d("2026-03-31"))).toBe("esedekes");
    expect(fizetesAllapot("esedekes", veg, new Date("2026-03-31T23:59:00Z"))).toBe(
      "esedekes",
    );
    expect(fizetesAllapot("esedekes", veg, d("2026-04-01"))).toBe("keso");
  });
  it("closed states are never overdue", () => {
    expect(fizetesAllapot("fizetve", veg, d("2027-01-01"))).toBe("fizetve");
    expect(fizetesAllapot("elengedve", veg, d("2027-01-01"))).toBe("elengedve");
    expect(fizetesAllapot("torolve", veg, d("2027-01-01"))).toBe("torolve");
  });
});

describe("effective price and cycle", () => {
  const csomag = { arHuf: 3500, alapCiklus: "havi" as const };
  it("override wins over the package price; package is the fallback", () => {
    expect(hatekonyAr({ arFelulirasHuf: 1000 }, csomag)).toBe(1000);
    expect(hatekonyAr({ arFelulirasHuf: 0 }, csomag)).toBe(0);
    expect(hatekonyAr({}, csomag)).toBe(3500);
    expect(hatekonyAr({}, null)).toBeNull();
  });
  it("own cycle wins over the package default", () => {
    expect(hatekonyCiklus({ szamlazasiCiklus: "eves" }, csomag)).toBe("eves");
    expect(hatekonyCiklus({}, csomag)).toBe("havi");
    expect(hatekonyCiklus({}, null)).toBeNull();
  });
});

describe("esedekesIdoszakok (period roll)", () => {
  it("creates nothing while the next date is in the future", () => {
    const r = esedekesIdoszakok(d("2026-05-01"), "havi", d("2026-04-15"));
    expect(r.kezdetek).toEqual([]);
    expect(nap(r.ujKovetkezo)).toBe("2026-05-01");
  });
  it("catches up every missed period and lands in the future", () => {
    const r = esedekesIdoszakok(d("2026-01-01"), "havi", d("2026-03-15"));
    expect(r.kezdetek.map(nap)).toEqual(["2026-01-01", "2026-02-01", "2026-03-01"]);
    expect(nap(r.ujKovetkezo)).toBe("2026-04-01");
  });
  it("caps a forgotten start date", () => {
    const r = esedekesIdoszakok(d("2010-01-01"), "havi", d("2026-01-01"), 12);
    expect(r.kezdetek).toHaveLength(12);
  });
});
