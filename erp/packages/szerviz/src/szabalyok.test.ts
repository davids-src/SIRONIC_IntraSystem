import { describe, expect, it } from "vitest";
import {
  alairasHiba,
  ciklusEsedekes,
  honapHozzaad,
  hibajegyNezoSzuro,
  karbantartasAllapot,
  keszletKiadasTerv,
  kovetkezoEsedekes,
  munkalapHtml,
  munkalapNezoSzuro,
  munkalapOsszesites,
  napokHatra,
  type TervIdoadat,
} from "./szabalyok";
import { munkalapSchema, hibajegyPortalSchema } from "./validation";
import { munkalapSorokNormalizalasa } from "./api";
import type { ArSnapshotAdat, MunkalapSor } from "./types";

const PNG = "data:image/png;base64,iVBORw0KGgo=";

describe("nézői szűrők", () => {
  it("a staff nézőre nincs szűrő", () => {
    expect(hibajegyNezoSzuro({ kind: "staff", userId: "u" })).toEqual({});
    expect(munkalapNezoSzuro({ kind: "staff", userId: "u" })).toEqual({});
  });
  it("a portál néző csak a saját partnerét látja, az üres partner semmit", () => {
    expect(hibajegyNezoSzuro({ kind: "portal", partnerId: "p1" })).toEqual({
      partnerId: "p1",
      archivalt: { $ne: true },
    });
    expect(hibajegyNezoSzuro({ kind: "portal", partnerId: "" })).toEqual({
      _id: { $in: [] },
    });
    expect(munkalapNezoSzuro({ kind: "portal", partnerId: "p1" })).toMatchObject({
      partnerId: "p1",
      "status.key": "lezart",
    });
    expect(munkalapNezoSzuro({ kind: "portal", partnerId: "" })).toEqual({
      _id: { $in: [] },
    });
  });
});

describe("alairasHiba", () => {
  it("elfogad PNG data-URI-t és média azonosítót", () => {
    expect(alairasHiba(PNG)).toBeNull();
    expect(alairasHiba("a".repeat(24))).toBeNull();
  });
  it("elutasítja a nem kép mime-ot, a hibás formátumot és a túl nagyot", () => {
    expect(alairasHiba("data:text/html;base64,PGI+")).toMatch(/PNG, JPEG/);
    expect(alairasHiba("data:image/svg+xml;base64,PHN2Zz4=")).toMatch(/PNG, JPEG/);
    expect(alairasHiba("javascript:alert(1)")).toMatch(/formátuma/);
    expect(alairasHiba(`data:image/png;base64,${"A".repeat(200_000)}`)).toMatch(
      /túl nagy/,
    );
  });
  it("a séma is érvényesíti", () => {
    const alap = {
      munkaDatum: "2026-11-20",
      szerelo: "Pista",
      leiras: "Kábelezés",
    };
    expect(munkalapSchema.safeParse({ ...alap, ugyfelAlairas: PNG }).success).toBe(true);
    expect(
      munkalapSchema.safeParse({ ...alap, ugyfelAlairas: "data:text/plain;base64,QQ==" })
        .success,
    ).toBe(false);
  });
});

describe("munkalapOsszesites / keszletKiadasTerv", () => {
  const sorok: MunkalapSor[] = [
    {
      tipus: "munka",
      forras: "kezi",
      leiras: "Munka",
      mennyiseg: 2.5,
      egyseg: "óra",
      nettoEgysegar: 10000,
    },
    {
      tipus: "anyag",
      forras: "termek",
      leiras: "Kamera",
      mennyiseg: 2,
      egyseg: "db",
      nettoEgysegar: 5000,
      keszletbolKiad: true,
      arlistaTetelId: "T1",
    },
    {
      tipus: "anyag",
      forras: "kezi",
      leiras: "Csavar",
      mennyiseg: 10,
      egyseg: "db",
      keszletbolKiad: false,
    },
  ];
  it("összegez", () => {
    expect(munkalapOsszesites(sorok)).toEqual({
      munkaOra: 2.5,
      munkaNetto: 25000,
      anyagNetto: 10000,
      osszesNetto: 35000,
    });
  });
  it("csak a készletből kiadandó terméksorok kerülnek a tervbe", () => {
    expect(keszletKiadasTerv(sorok)).toEqual([
      { sorIndex: 1, arlistaTermekId: "T1", mennyiseg: 2, nev: "Kamera", egyseg: "db" },
    ]);
  });
  it("a készletből kiadás csak árlistás termék anyagra engedett", () => {
    const r = munkalapSchema.safeParse({
      munkaDatum: "2026-11-20",
      szerelo: "x",
      leiras: "y",
      sorok: [
        {
          tipus: "munka",
          forras: "kezi",
          leiras: "a",
          mennyiseg: 1,
          egyseg: "óra",
          keszletbolKiad: true,
        },
      ],
    });
    expect(r.success).toBe(false);
  });
});

describe("munkalapSorokNormalizalasa", () => {
  it("a snapshot ára felülírja a kliens árát", () => {
    const snap = {
      forras: "termek",
      tetelId: "T9",
      vegAr: 4200,
      egyseg: "db",
    } as ArSnapshotAdat;
    const [s] = munkalapSorokNormalizalasa([
      {
        tipus: "anyag",
        forras: "termek",
        leiras: "x",
        mennyiseg: 1,
        egyseg: "db",
        nettoEgysegar: 1,
        keszletbolKiad: true,
        arSnapshot: snap,
      },
    ]);
    expect(s?.nettoEgysegar).toBe(4200);
    expect(s?.arlistaTetelId).toBe("T9");
  });
});

describe("karbantartás esedékesség (lusta)", () => {
  const terv = (o: Partial<TervIdoadat> = {}): TervIdoadat => ({
    elsoEsedekes: new Date("2026-01-31T00:00:00Z"),
    intervallumHonap: 1,
    utolsoCiklus: -1,
    elorejelzesNap: 14,
    aktiv: true,
    ...o,
  });
  it("hónapvégi horgony nem sodródik", () => {
    expect(
      honapHozzaad(new Date("2026-01-31T00:00:00Z"), 1).toISOString().slice(0, 10),
    ).toBe("2026-02-28");
    expect(ciklusEsedekes(terv(), 2).toISOString().slice(0, 10)).toBe("2026-03-31");
    expect(ciklusEsedekes(terv(), 13).toISOString().slice(0, 10)).toBe("2027-02-28");
  });
  it("a következő esedékesség a ciklusmutatóból számolódik", () => {
    expect(kovetkezoEsedekes(terv()).toISOString().slice(0, 10)).toBe("2026-01-31");
    expect(
      kovetkezoEsedekes(terv({ utolsoCiklus: 0 }))
        .toISOString()
        .slice(0, 10),
    ).toBe("2026-02-28");
  });
  it("lejárt / hamarosan / rendben / inaktív", () => {
    const ma = new Date("2026-02-01T10:00:00Z");
    expect(karbantartasAllapot(terv(), ma)).toBe("lejart");
    expect(napokHatra(terv(), ma)).toBe(-1);
    const kozel = new Date("2026-02-20T10:00:00Z");
    expect(karbantartasAllapot(terv({ utolsoCiklus: 0 }), ma)).toBe("rendben");
    expect(karbantartasAllapot(terv({ utolsoCiklus: 0 }), kozel)).toBe("hamarosan");
    expect(karbantartasAllapot(terv({ utolsoCiklus: 0, elorejelzesNap: 3 }), kozel)).toBe(
      "rendben",
    );
    expect(karbantartasAllapot(terv({ aktiv: false }), ma)).toBe("inaktiv");
  });
});

describe("munkalapHtml", () => {
  it("csak a beágyazott értékeket használja, és escape-el", () => {
    const html = munkalapHtml(
      {
        azonosito: "ML-000001",
        partnerNev: "<b>Acme</b>",
        munkaDatum: "2026-11-20T00:00:00.000Z",
        szerelo: "Pista",
        szereloAlairas: PNG,
        ugyfelNev: "Ügyfél",
        kategoria: "Általános",
        leiras: "Sor1\nSor2 <script>",
        sorok: [
          {
            tipus: "munka",
            forras: "kezi",
            leiras: "Munka",
            mennyiseg: 2,
            egyseg: "óra",
          },
        ],
        osszegzes: { munkaOra: 2, anyagNetto: 0, munkaNetto: 0, osszesNetto: 0 },
      },
      { nev: "SIRONIC" },
    );
    expect(html).toContain("ML-000001");
    expect(html).toContain("&lt;b&gt;Acme&lt;/b&gt;");
    expect(html).not.toContain("<script>");
    expect(html).toContain(PNG);
  });
  it("érvénytelen aláírás nem kerül a HTML-be", () => {
    const html = munkalapHtml(
      {
        azonosito: "ML-2",
        munkaDatum: "2026-11-20T00:00:00.000Z",
        szerelo: "P",
        szereloAlairas: 'data:text/html;base64,"><script>',
        kategoria: "k",
        leiras: "l",
        sorok: [],
        osszegzes: { munkaOra: 0, anyagNetto: 0, munkaNetto: 0, osszesNetto: 0 },
      },
      { nev: "S" },
    );
    expect(html).not.toContain("<img");
  });
});

describe("portál hibajegy-séma", () => {
  it("nem fogad partnert, forrást, felelőst", () => {
    const r = hibajegyPortalSchema.parse({
      targy: "t",
      leiras: "l",
      partnerId: "masik",
      forras: "crm",
      felelosId: "x",
      belsoJegyzet: "titok",
    } as never);
    expect(r).not.toHaveProperty("partnerId");
    expect(r).not.toHaveProperty("forras");
    expect(r).not.toHaveProperty("felelosId");
    expect(r).not.toHaveProperty("belsoJegyzet");
  });
});
