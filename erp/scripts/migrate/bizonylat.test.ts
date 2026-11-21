import { describe, expect, it } from "vitest";
import {
  mapIgazolas,
  mapJotallas,
  mapSzallitolevel,
  mapSzamla,
  migraljBizonylat,
} from "./bizonylat";

const partnerek = new Map([["c1", "P1"]]);
const termekek = new Map([["pl1", "A1"]]);

describe("bizonylat migration", () => {
  it("delivery note: maps ids, marks issued as already deducted, warns on unknowns", () => {
    const w: string[] = [];
    const r = mapSzallitolevel(
      {
        _id: "d1",
        delivery_number: "SZL-0042",
        contact_id: "c1",
        status: "issued",
        issue_date: "2026-03-01T10:00:00Z",
        lines: [
          { price_list_item_id: "pl1", name: "Kamera", quantity: 2, unit: "db" },
          { price_list_item_id: "nincs", name: "X", quantity: 1, unit: "db" },
        ],
      },
      partnerek,
      termekek,
      w,
    );
    expect(r).toMatchObject({
      allapot: "kiadva",
      partnerId: "P1",
      kiadasNap: "2026-03-01",
    });
    expect(r?.sorok).toHaveLength(1);
    expect(r?.keszletKiadas?.allapot).toBe("kesz");
    expect(w.some((x) => x.includes("ismeretlen termék"))).toBe(true);
    expect(
      mapSzallitolevel(
        { _id: "d", delivery_number: "1", contact_id: "x", issue_date: "2026-01-01" },
        partnerek,
        termekek,
        [],
      ),
    ).toBeNull();
  });

  it("certificate: keeps signature of accepted, recomputes totals, reports gaps", () => {
    const w: string[] = [];
    const r = mapIgazolas(
      {
        _id: "i1",
        certificate_number: "TI-7",
        contact_id: "c1",
        status: "accepted",
        title: "Átadás",
        work_summary: "kész",
        client_name: "Kiss",
        client_title: "Ügyvezető",
        client_signature: "data:image/png;base64,AAAA",
        signed_at: "2026-04-01T00:00:00Z",
        lines: [{ description: "Munka", quantity: 2, unit: "óra", net_unit_price: 1000 }],
      },
      partnerek,
      w,
    );
    expect(r?.allapot).toBe("elfogadva");
    expect(r?.alairas?.nev).toBe("Kiss");
    expect(r?.osszegek.bruttoOsszeg).toBe(2540);
    const hianyos = mapIgazolas(
      {
        _id: "i2",
        certificate_number: "TI-8",
        contact_id: "c1",
        status: "accepted",
        title: "t",
        work_summary: "s",
      },
      partnerek,
      w,
    );
    expect(hianyos?.alairas).toBeUndefined();
    expect(w.some((x) => x.includes("hiányos"))).toBe(true);
  });

  it("invoice: overdue/expired become lazily computed stored states", () => {
    const r = mapSzamla(
      {
        _id: "n1",
        invoice_number: "SIR-1",
        contact_id: "c1",
        total_amount: 1000,
        currency: "HUF",
        status: "overdue",
        due_at: "2026-01-01",
      },
      partnerek,
      [],
    );
    expect(r?.allapot).toBe("elkuldve");
    expect(r?.osszeg).toBe(1000);
    expect(
      mapSzamla(
        {
          _id: "n",
          invoice_number: "1",
          contact_id: "c1",
          total_amount: 1,
          currency: "HUF",
          status: "???",
        },
        partnerek,
        [],
      ),
    ).toBeNull();
  });

  it("warranty: expired stays aktiv (lazy), end date derived, legal text frozen", () => {
    const r = mapJotallas(
      {
        _id: "j1",
        warranty_number: "JJY-000042",
        contact_id: "c1",
        issue_date: "2024-01-01",
        status: "expired",
        lines: [
          {
            name: "Kamera",
            warranty_years: 2,
            warranty_start: "2024-01-01T00:00:00Z",
            price_list_item_id: "pl1",
          },
        ],
      },
      partnerek,
      termekek,
      "Jogi",
      [],
    );
    expect(r?.allapot).toBe("aktiv");
    expect(r?.sorok[0]?.vege.toISOString().slice(0, 10)).toBe("2026-01-01");
    expect(r?.sorok[0]?.arlistaTermekId).toBe("A1");
    expect(r?.jogiSzoveg).toBe("Jogi");
  });

  it("plan reports max counters", () => {
    const p = migraljBizonylat({
      szallitolevelek: [
        {
          _id: "d",
          delivery_number: "SZL-0042",
          contact_id: "c1",
          issue_date: "2026-01-01",
        },
      ],
      igazolasok: [],
      szamlak: [],
      jotallasok: [
        {
          _id: "j",
          warranty_number: "JJY-000099",
          contact_id: "c1",
          issue_date: "2026-01-01",
        },
      ],
      partnerek,
      termekek,
      jogiSzoveg: "x",
    });
    expect(p.maxSzamok["bizonylat:szallitolevel"]).toBe(42);
    expect(p.maxSzamok["bizonylat:jotallas"]).toBe(99);
    expect(p.szallitolevelek).toHaveLength(1);
  });
});
