import { describe, expect, it } from "vitest";
import {
  checklistKeszHiba,
  hetiTervJogosult,
  lezarasAkadalyok,
  normalizalFazis,
  projektAtmenetMegengedett,
  projektSzazalek,
} from "./szabalyok";
import { hetEltolas, hetHetfo, hetekSzama, isoHet } from "./het";
import { isPortal, projektNezoSzuro } from "./nezo";
import {
  alaprajzSchema,
  fazisSchema,
  hetiTervSchema,
  koltsegSchema,
  projektSchema,
  stagingLinkSchema,
} from "./validation";
import { projektPermissions } from "./permissions";

describe("normalizalFazis", () => {
  it("kész forces 100 %, 100 % forces kész, progress moves függőben to folyamatban", () => {
    expect(normalizalFazis("kesz", 10)).toEqual({ allapot: "kesz", szazalek: 100 });
    expect(normalizalFazis("folyamatban", 100)).toEqual({
      allapot: "kesz",
      szazalek: 100,
    });
    expect(normalizalFazis("fuggoben", 40)).toEqual({
      allapot: "folyamatban",
      szazalek: 40,
    });
    expect(normalizalFazis("fuggoben", 0)).toEqual({ allapot: "fuggoben", szazalek: 0 });
    expect(normalizalFazis("folyamatban", 150)).toEqual({
      allapot: "kesz",
      szazalek: 100,
    });
  });
});

describe("projektSzazalek", () => {
  it("averages phases", () => {
    expect(projektSzazalek([])).toBe(0);
    expect(projektSzazalek([{ szazalek: 100 }, { szazalek: 50 }, { szazalek: 0 }])).toBe(
      50,
    );
  });
});

describe("checklist rules", () => {
  it("requires an attachment for items that demand one", () => {
    expect(checklistKeszHiba({ mellekletKotelezo: true, mellekletMediaIds: [] })).toMatch(
      /csatolmány/,
    );
    expect(
      checklistKeszHiba({ mellekletKotelezo: true, mellekletMediaIds: ["m1"] }),
    ).toBeNull();
    expect(
      checklistKeszHiba({ mellekletKotelezo: false, mellekletMediaIds: [] }),
    ).toBeNull();
  });
  it("lists open required items as closing blockers", () => {
    expect(
      lezarasAkadalyok([
        { cimke: "A", kotelezo: true, kesz: false },
        { cimke: "B", kotelezo: true, kesz: true },
        { cimke: "C", kotelezo: false, kesz: false },
      ]),
    ).toEqual(["A"]);
  });
});

describe("projekt transitions", () => {
  it("allows the documented moves only", () => {
    expect(projektAtmenetMegengedett("nyitott", "lezart")).toBe(true);
    expect(projektAtmenetMegengedett("lezart", "nyitott")).toBe(true);
    expect(projektAtmenetMegengedett("lezart", "felfuggesztett")).toBe(false);
    expect(projektAtmenetMegengedett("nyitott", "nyitott")).toBe(false);
  });
});

describe("hetiTervJogosult", () => {
  it("owner always, others only with delegation", () => {
    expect(hetiTervJogosult({ id: "a", delegalhat: false }, "a")).toBe(true);
    expect(hetiTervJogosult({ id: "a", delegalhat: false }, "b")).toBe(false);
    expect(hetiTervJogosult({ id: "a", delegalhat: true }, "b")).toBe(true);
  });
});

describe("ISO weeks", () => {
  it("computes the ISO week across year boundaries", () => {
    expect(isoHet(new Date(2026, 0, 1))).toEqual({ ev: 2026, het: 1 });
    expect(isoHet(new Date(2021, 0, 3))).toEqual({ ev: 2020, het: 53 });
    expect(isoHet(new Date(2024, 11, 30))).toEqual({ ev: 2025, het: 1 });
    expect(isoHet(new Date(2026, 5, 15))).toEqual({ ev: 2026, het: 25 });
  });
  it("knows 52 vs 53 week years", () => {
    expect(hetekSzama(2020)).toBe(53);
    expect(hetekSzama(2026)).toBe(53);
    expect(hetekSzama(2025)).toBe(52);
  });
  it("shifts weeks with year rollover in both directions", () => {
    expect(hetEltolas({ ev: 2025, het: 52 }, 1)).toEqual({ ev: 2026, het: 1 });
    expect(hetEltolas({ ev: 2026, het: 1 }, -1)).toEqual({ ev: 2025, het: 52 });
    expect(hetEltolas({ ev: 2020, het: 53 }, 1)).toEqual({ ev: 2021, het: 1 });
    expect(hetEltolas({ ev: 2026, het: 10 }, 0)).toEqual({ ev: 2026, het: 10 });
  });
  it("Monday of a week", () => {
    expect(hetHetfo({ ev: 2026, het: 1 }).toISOString().slice(0, 10)).toBe("2025-12-29");
  });
});

describe("viewer filter", () => {
  it("staff is unrestricted, portal is pinned to its partner's visible projects", () => {
    expect(projektNezoSzuro({ kind: "staff", userId: "u" })).toEqual({});
    expect(projektNezoSzuro({ kind: "portal", partnerId: "p1" })).toEqual({
      partnerId: "p1",
      portalLathato: true,
      archivalt: { $ne: true },
    });
    expect(isPortal({ kind: "portal", partnerId: "p" })).toBe(true);
  });
  it("an empty partner id matches nothing", () => {
    expect(projektNezoSzuro({ kind: "portal", partnerId: "" })).toEqual({
      _id: { $in: [] },
    });
  });
});

describe("validation", () => {
  it("projekt: partnerId needs its name snapshot, dates validated", () => {
    expect(projektSchema.safeParse({ nev: "X", partnerId: "p" }).success).toBe(false);
    expect(
      projektSchema.safeParse({ nev: "X", partnerId: "p", partnerNev: "P" }).success,
    ).toBe(true);
    expect(projektSchema.safeParse({ nev: "X", hatarido: "nope" }).success).toBe(false);
    expect(projektSchema.safeParse({ nev: " " }).success).toBe(false);
  });
  it("fázis percentage range", () => {
    expect(fazisSchema.safeParse({ nev: "F", szazalek: 101 }).success).toBe(false);
    expect(fazisSchema.safeParse({ nev: "F", szazalek: "40" }).success).toBe(true);
  });
  it("staging link must be http(s)", () => {
    expect(
      stagingLinkSchema.safeParse({ cimke: "x", url: "javascript:alert(1)" }).success,
    ).toBe(false);
    expect(stagingLinkSchema.safeParse({ cimke: "x", url: "https://a.hu" }).success).toBe(
      true,
    );
  });
  it("költség and heti terv basics", () => {
    expect(
      koltsegSchema.safeParse({
        projektId: "p",
        tipus: "anyag",
        osszeg: -1,
        datum: "2026-01-01",
      }).success,
    ).toBe(false);
    expect(
      hetiTervSchema.safeParse({ felelosId: "u", cim: "C", ev: 2026, het: 54 }).success,
    ).toBe(false);
    expect(
      hetiTervSchema.safeParse({ felelosId: "u", cim: "C", ev: 2026, het: 7 }).success,
    ).toBe(true);
  });
  it("alaprajz needs a file and markers stay within 0-100", () => {
    expect(alaprajzSchema.safeParse({ nev: "N", fajlMediaId: "" }).success).toBe(false);
    expect(
      alaprajzSchema.safeParse({
        nev: "N",
        fajlMediaId: "m",
        jelolok: [{ x: 101, y: 5 }],
      }).success,
    ).toBe(false);
  });
});

describe("permissions", () => {
  it("declares the specified keys", () => {
    const keys = projektPermissions.permissions.map((p) => p.key);
    expect(keys).toEqual(
      expect.arrayContaining([
        "projekt:projekt:read",
        "projekt:projekt:write",
        "projekt:projekt:delete",
        "projekt:koltseg:read",
        "projekt:hetiterv:delegal",
        "projekt:sablon:delete",
      ]),
    );
    expect(keys).toHaveLength(12);
  });
});
