import { describe, expect, it } from "vitest";
import {
  mapHibajegy,
  mapKarbantartasiTerv,
  mapMunkalap,
  tervezSzervizMigraciot,
  type SzervizIdMapok,
} from "../../../scripts/migrate/szerviz";

const ids: SzervizIdMapok = {
  partnerek: new Map([["c1", { id: "PN1", nev: "Acme Kft." }]]),
  felhasznalok: new Map([
    ["u1", { id: "N1", nev: "Kiss Béla" }],
    ["u2", { id: "N2", nev: "Nagy Éva" }],
  ]),
  arlistaTetelek: new Map([
    ["pl1", "AT1"],
    ["sv1", "AS1"],
  ]),
  projektek: new Map([["pr1", "PRN1"]]),
  hibajegyek: new Map([["t1", "HN1"]]),
};

const ticket = {
  _id: "t1",
  ticket_number: "TK-000042",
  contact_id: "c1",
  created_by: "u1",
  assigned_to: "u2",
  source: "partner_portal",
  priority: "critical",
  status: "waiting",
  category: "Hálózat",
  title: "Nincs net",
  description: "Leírás",
  project_id: "pr1",
  comments: [
    {
      _id: "k1",
      author_id: "u1",
      author_role: "crm_staff",
      message: "Belső",
      is_internal: true,
      created_at: "2026-01-02T00:00:00Z",
    },
    {
      _id: "k2",
      author_id: "px",
      author_role: "partner",
      message: "Kérem",
      is_internal: false,
      created_at: "2026-01-03T00:00:00Z",
    },
  ],
  is_archived: true,
  archive_reason: "Duplikált",
};

describe("mapHibajegy", () => {
  it("átnevezi a mezőket, a státuszt, és megőrzi a belső jelzőt", () => {
    const w: string[] = [];
    const r = mapHibajegy(ticket, ids, w);
    expect(r).toMatchObject({
      regiId: "t1",
      azonosito: "TK-000042",
      partnerId: "PN1",
      partnerNev: "Acme Kft.",
      forras: "portal",
      prioritas: "kritikus",
      allapot: "varakozik",
      felelosId: "N2",
      projektId: "PRN1",
      archivalt: true,
      archivalasOka: "Duplikált",
    });
    expect(r.megjegyzesek.map((m) => [m.szerepkor, m.belso])).toEqual([
      ["munkatars", true],
      ["partner", false],
    ]);
    expect(r).not.toHaveProperty("tenantId");
    expect(w).toEqual([]);
  });
  it("ismeretlen partnert, felhasználót, státuszt figyelmeztetésként jelez", () => {
    const w: string[] = [];
    const r = mapHibajegy(
      {
        ...ticket,
        contact_id: "?",
        assigned_to: "?",
        status: "foo",
        source: "x",
        priority: "y",
      },
      ids,
      w,
    );
    expect(r.allapot).toBe("uj");
    expect(r.partnerId).toBeUndefined();
    expect(w.length).toBeGreaterThanOrEqual(5);
  });
});

describe("mapMunkalap", () => {
  const wl = {
    _id: "w1",
    worklog_number: "ML-000007",
    contact_id: "c1",
    ticket_id: "t1",
    created_by: "u1",
    status: "finalized",
    work_date: "2026-03-01",
    technician_name: "Szerelő",
    technician_signature: "data:image/png;base64,iVBORw0KGgo=",
    client_name: "Ügyfél",
    client_signature: "data:text/html;base64,PGI+",
    work_category: "Telepítés",
    work_description: "Kész",
    items: [
      {
        description: "Kamera",
        quantity: 2,
        unit: "db",
        unit_price: 100,
        price_list_item_id: "pl1",
      },
      {
        description: "Szerelés",
        quantity: 1,
        unit: "óra",
        service_price_list_item_id: "sv1",
        price_snapshot: {
          internal_base_price: 5000,
          client_multiplier: 1.5,
          multiplier_key: "kkv",
          calculated_price: 7500,
        },
      },
      { description: "Kézi", quantity: 1, unit: "óra" },
    ],
  };
  it("a lezárt munkalap nem ad ki újra készletet, az érvénytelen aláírást eldobja", () => {
    const w: string[] = [];
    const r = mapMunkalap(wl, ids, w);
    expect(r.allapot).toBe("lezart");
    expect(r.keszletKiadva).toBe(true);
    expect(r.sorok.every((s) => s.keszletbolKiad === false)).toBe(true);
    expect(r.hibajegyId).toBe("HN1");
    expect(r.szereloAlairas).toBeDefined();
    expect(r.ugyfelAlairas).toBeUndefined();
    expect(w.some((x) => x.includes("ügyfél aláírás"))).toBe(true);
    expect(r.sorok[0]).toMatchObject({
      tipus: "anyag",
      forras: "termek",
      arlistaTetelId: "AT1",
    });
    expect(r.sorok[1]).toMatchObject({ tipus: "munka", forras: "szolgaltatas" });
    expect(r.sorok[1]?.arSnapshot?.vegAr).toBe(7500);
    expect(r.sorok[2]).toMatchObject({ tipus: "munka", forras: "kezi" });
  });
  it("a piszkozat piszkozat marad", () => {
    expect(mapMunkalap({ ...wl, status: "draft" }, ids).keszletKiadva).toBe(false);
  });
});

describe("mapKarbantartasiTerv", () => {
  const plan = {
    _id: "m1",
    title: "Éves szerviz",
    contact_id: "c1",
    frequency_months: 12,
    next_due_date: "2026-12-15T10:00:00Z",
    template_title: "x",
    template_priority: "high",
    advance_days: 30,
    created_by: "u1",
  };
  it("a legacy következő esedékesség a 0. ciklus", () => {
    const r = mapKarbantartasiTerv(plan, ids);
    expect(r).toMatchObject({
      intervallumHonap: 12,
      utolsoCiklus: -1,
      prioritas: "magas",
      elorejelzesNap: 30,
    });
    expect(r?.elsoEsedekes.toISOString()).toBe("2026-12-15T00:00:00.000Z");
  });
  it("ismeretlen partnerrel kihagyja", () => {
    const w: string[] = [];
    expect(mapKarbantartasiTerv({ ...plan, contact_id: "?" }, ids, w)).toBeNull();
    expect(w).toHaveLength(1);
  });
});

describe("tervezSzervizMigraciot", () => {
  it("összegyűjti a számláló maximumot", () => {
    const t = tervezSzervizMigraciot(
      {
        hibajegyek: [ticket, { ...ticket, _id: "t2", ticket_number: "TK-000099" }],
        munkalapok: [],
        karbantartasiTervek: [],
      },
      ids,
    );
    expect(t.szamlaloMax).toEqual({ hibajegy: 99, munkalap: 0 });
  });
});
