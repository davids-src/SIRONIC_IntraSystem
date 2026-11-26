import { describe, expect, it, vi } from "vitest";
import {
  alairasEllenorzes,
  alairasKeszit,
  esemenyKinyeres,
  feldolgozBillingoWebhook,
} from "./billingo-webhook";
import {
  evekHozzaad,
  igazolasLevel,
  importSorokNormalizalasa,
  jotallasAllapot,
  jotallasLejarat,
  jotallasiJegyHtml,
  szamlaAllapot,
  sorokOsszesites,
} from "./szamitas";
import { igazolasElfogadasSchema, szamlaSchema } from "./validation";
import { igazolasNezoSzuro, lazyAllapotSzuro } from "./api";
import { bizonylatPermissions } from "./permissions";

const SECRET = "teszt-titok-nem-valodi";
const PNG = `data:image/png;base64,${"A".repeat(400)}`;

describe("totals", () => {
  it("rounds per line and sums net/VAT/gross", () => {
    const o = sorokOsszesites([
      { mennyiseg: 3, nettoEgysegar: 333.33, afaKulcs: 27 },
      { mennyiseg: 1, nettoEgysegar: 1000, afaKulcs: 5 },
    ]);
    expect(o.nettoOsszeg).toBe(1999.99);
    expect(o.afaOsszeg).toBe(320);
    expect(o.bruttoOsszeg).toBe(2319.99);
  });
  it("import drops empty / non-positive lines", () => {
    const r = importSorokNormalizalasa({
      forras: "ajanlat",
      sorok: [
        {
          leiras: " Munka ",
          mennyiseg: 2,
          egyseg: "óra",
          nettoEgysegar: 10,
          afaKulcs: 27,
        },
        { leiras: "", mennyiseg: 1, egyseg: "db", nettoEgysegar: 1, afaKulcs: 27 },
        { leiras: "x", mennyiseg: 0, egyseg: "db", nettoEgysegar: 1, afaKulcs: 27 },
      ],
    });
    expect(r.sorok).toHaveLength(1);
    expect(r.sorok[0]!.leiras).toBe("Munka");
  });
});

describe("lazy states", () => {
  const now = new Date("2026-11-21T12:00:00Z");
  it("invoice: elkuldve past due reads as lejart, others unchanged", () => {
    expect(szamlaAllapot("elkuldve", new Date("2026-11-01"), now)).toBe("lejart");
    expect(szamlaAllapot("elkuldve", new Date("2026-12-01"), now)).toBe("elkuldve");
    expect(szamlaAllapot("elkuldve", undefined, now)).toBe("elkuldve");
    expect(szamlaAllapot("kifizetve", new Date("2020-01-01"), now)).toBe("kifizetve");
    expect(szamlaAllapot("piszkozat", new Date("2020-01-01"), now)).toBe("piszkozat");
  });
  it("warranty: only aktiv expires", () => {
    expect(jotallasAllapot("aktiv", new Date("2026-01-01"), now)).toBe("lejart");
    expect(jotallasAllapot("aktiv", new Date("2027-01-01"), now)).toBe("aktiv");
    expect(jotallasAllapot("igenyelt", new Date("2020-01-01"), now)).toBe("igenyelt");
  });
  it("adds years with Feb 29 clamping and picks the latest end", () => {
    expect(evekHozzaad(new Date("2024-02-29T00:00:00Z"), 1).toISOString()).toBe(
      "2025-02-28T00:00:00.000Z",
    );
    expect(evekHozzaad(new Date("2026-03-15T00:00:00Z"), 2).toISOString()).toBe(
      "2028-03-15T00:00:00.000Z",
    );
    expect(
      jotallasLejarat([{ vege: new Date("2027-01-01") }, { vege: "2029-01-01" }])
        ?.toISOString()
        .slice(0, 10),
    ).toBe("2029-01-01");
  });
  it("list filter maps the virtual state onto stored fields", () => {
    const now2 = new Date("2026-11-21T00:00:00Z");
    const f = lazyAllapotSzuro(
      { "status.key": "lejart" },
      { tarolt: "elkuldve", virtualis: "lejart", mezo: "esedekes", now: now2 },
    );
    expect(f["status.key"]).toBeUndefined();
    expect(JSON.stringify(f.$and)).toContain('"status.key":"elkuldve"');
    expect(JSON.stringify(f.$and)).toContain("esedekes");
    const unchanged = { "status.key": "kifizetve" };
    expect(
      lazyAllapotSzuro(unchanged, {
        tarolt: "elkuldve",
        virtualis: "lejart",
        mezo: "esedekes",
      })["status.key"],
    ).toBeUndefined();
    const nincs = { x: 1 };
    expect(lazyAllapotSzuro(nincs, { tarolt: "a", virtualis: "b", mezo: "c" })).toBe(
      nincs,
    );
  });
});

describe("portal viewer filter", () => {
  it("staff unrestricted, portal pinned to own non-draft non-archived", () => {
    expect(igazolasNezoSzuro({ kind: "staff", userId: "u" })).toEqual({});
    expect(igazolasNezoSzuro({ kind: "portal", partnerId: "p1" })).toEqual({
      partnerId: "p1",
      archivalt: { $ne: true },
      "status.key": { $ne: "piszkozat" },
    });
    expect(igazolasNezoSzuro({ kind: "portal", partnerId: "" })).toEqual({
      _id: { $in: [] },
    });
  });
});

describe("signature validation", () => {
  const ok = { nev: "Kiss Béla", beosztas: "Ügyvezető", kep: PNG };
  it("accepts a png data URI", () => {
    expect(igazolasElfogadasSchema.safeParse(ok).success).toBe(true);
  });
  it("rejects missing name/title, wrong mime, non data-URI and oversize", () => {
    expect(igazolasElfogadasSchema.safeParse({ ...ok, nev: " " }).success).toBe(false);
    expect(igazolasElfogadasSchema.safeParse({ ...ok, beosztas: "" }).success).toBe(
      false,
    );
    expect(
      igazolasElfogadasSchema.safeParse({
        ...ok,
        kep: `data:image/svg+xml;base64,${"A".repeat(400)}`,
      }).success,
    ).toBe(false);
    expect(
      igazolasElfogadasSchema.safeParse({ ...ok, kep: "http://x/y.png" }).success,
    ).toBe(false);
    expect(
      igazolasElfogadasSchema.safeParse({
        ...ok,
        kep: `data:image/png;base64,${"A".repeat(200_001)}`,
      }).success,
    ).toBe(false);
  });
  it("invoice needs at least one line", () => {
    expect(szamlaSchema.safeParse({ partnerId: "p", sorok: [] }).success).toBe(false);
  });
});

describe("Billingo webhook", () => {
  const body = JSON.stringify({ event: "invoice_paid", data: { id: 4242 } });

  it("verifies HMAC-SHA256 over the raw body (with or without sha256= prefix)", () => {
    const sig = alairasKeszit(body, SECRET);
    expect(alairasEllenorzes(body, sig, SECRET)).toBe(true);
    expect(alairasEllenorzes(body, `sha256=${sig}`, SECRET)).toBe(true);
  });
  it("rejects forged, wrong-secret, tampered, malformed and missing signatures", () => {
    const sig = alairasKeszit(body, SECRET);
    expect(alairasEllenorzes(body, "0".repeat(64), SECRET)).toBe(false);
    expect(alairasEllenorzes(body, sig, "masik-titok")).toBe(false);
    expect(alairasEllenorzes(body + " ", sig, SECRET)).toBe(false);
    expect(alairasEllenorzes(body, "xyz", SECRET)).toBe(false);
    expect(alairasEllenorzes(body, null, SECRET)).toBe(false);
    expect(alairasEllenorzes(body, sig, "")).toBe(false);
  });
  it("forged signature never reaches the state transition", async () => {
    const alkalmaz = vi.fn(async () => ({ ok: true }));
    const r = await feldolgozBillingoWebhook(body, "f".repeat(64), SECRET, alkalmaz);
    expect(r.status).toBe(401);
    expect(alkalmaz).not.toHaveBeenCalled();
  });
  it("missing secret fails closed", async () => {
    const alkalmaz = vi.fn(async () => ({ ok: true }));
    const r = await feldolgozBillingoWebhook(
      body,
      alairasKeszit(body, "x"),
      undefined,
      alkalmaz,
    );
    expect(r.status).toBe(503);
    expect(alkalmaz).not.toHaveBeenCalled();
  });
  it("valid paid event calls the transition once with the Billingo reference", async () => {
    const alkalmaz = vi.fn(async () => ({ ok: true, message: "Kifizetve" }));
    const r = await feldolgozBillingoWebhook(
      body,
      alairasKeszit(body, SECRET),
      SECRET,
      alkalmaz,
    );
    expect(r.status).toBe(200);
    expect(alkalmaz).toHaveBeenCalledWith({ tipus: "kifizetve", billingoRef: "4242" });
  });
  it("ignores other events, rejects malformed signed bodies, surfaces failures as 500", async () => {
    const masik = JSON.stringify({ event: "invoice_created", data: { id: 1 } });
    const alkalmaz = vi.fn(async () => ({ ok: true }));
    expect(
      (
        await feldolgozBillingoWebhook(
          masik,
          alairasKeszit(masik, SECRET),
          SECRET,
          alkalmaz,
        )
      ).status,
    ).toBe(200);
    expect(alkalmaz).not.toHaveBeenCalled();
    const hibas = "{nem json";
    expect(
      (await feldolgozBillingoWebhook(hibas, alairasKeszit(hibas, SECRET), SECRET))
        .status,
    ).toBe(400);
    expect(esemenyKinyeres(JSON.stringify({ event: "paid" }))).toBe("hibas");
    const bukik = vi.fn(async () => ({ ok: false, message: "db" }));
    expect(
      (await feldolgozBillingoWebhook(body, alairasKeszit(body, SECRET), SECRET, bukik))
        .status,
    ).toBe(500);
  });
});

describe("HTML / mail builders", () => {
  it("warranty HTML escapes user text and carries the frozen legal text", () => {
    const html = jotallasiJegyHtml(
      {
        azonosito: "JJY-000001",
        partnerNev: "<b>Kft</b>",
        kiallitasNap: "2026-11-21",
        sorok: [
          {
            termekNev: "Kamera <script>",
            evek: 2,
            kezdet: "2026-11-21T00:00:00.000Z",
            vege: "2028-11-21T00:00:00.000Z",
          },
        ],
        jogiSzoveg: "Jogi & szöveg",
        allapot: "aktiv",
      },
      { nev: "SIRONIC" },
    );
    expect(html).not.toContain("<script>");
    expect(html).not.toContain("<b>Kft</b>");
    expect(html).toContain("Jogi &amp; szöveg");
    expect(html).toContain("JJY-000001");
  });
  it("certificate mail escapes names", () => {
    const m = igazolasLevel({
      azonosito: "TI-000001",
      cim: "<i>x</i>",
      partnerNev: "A&B",
      link: "https://e.hu/portal/igazolas/t",
    });
    expect(m.html).toContain("A&amp;B");
    expect(m.html).not.toContain("<i>x</i>");
    expect(m.text).toContain("https://e.hu/portal/igazolas/t");
  });
});

describe("permissions", () => {
  it("declares the specified keys", () => {
    const keys = bizonylatPermissions.permissions.map((p) => p.key);
    for (const k of [
      "bizonylat:szallitolevel:read",
      "bizonylat:szallitolevel:write",
      "bizonylat:szallitolevel:delete",
      "bizonylat:szallitolevel:kiad",
      "bizonylat:igazolas:kuld",
      "bizonylat:szamla:kiallit",
      "bizonylat:jotallas:delete",
    ])
      expect(keys).toContain(k);
  });
});
