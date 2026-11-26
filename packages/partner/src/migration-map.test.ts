import { describe, expect, it } from "vitest";
import { ERDEKLODO_ALLAPOTOK } from "./constants";
import { LEGACY_LEAD_STATUS, mapContact, mapLead, mapSupplier } from "./migration-map";

describe("mapContact", () => {
  it("maps types, roles, pricing profile, addresses and contacts", () => {
    const m = mapContact({
      _id: "c1",
      contact_number: "C-1",
      partner_id: "VE123456",
      type: "one_time",
      name: " Teszt Kft. ",
      tax_number: "123",
      address: { zip: "1111", city: "Budapest", street: "Fő u. 1", country: "HU" },
      billing_address: null,
      contact_persons: [
        { name: "Kiss", title: "Igazgató", is_primary: true },
        { name: " ", is_primary: false },
      ],
      partner_role: "subcontractor_employer",
      client_category: "smb",
      pricing_contract_type: "6month",
      subcontractor_work_types: ["security_tech", "bogus"],
      subcontractor_presence_type: "both",
      subcontractor_billing_cycle: "weekly",
      contract_renewal_reminder_days: null,
    });
    expect(m).toMatchObject({
      regiForras: "contact",
      regiId: "c1",
      regiAzonosito: "VE123456",
      tipus: "eseti",
      nev: "Teszt Kft.",
      partnerSzerep: "alvallalkozo_megbizo",
      ugyfelKategoria: "kkv",
      arazasiSzerzodesTipus: "6_honap",
      alvallalkozoMunkateruletek: ["biztonsagtechnika"],
      alvallalkozoJelenletTipus: "mindketto",
      alvallalkozoSzamlazasiCiklus: "heti",
      megujitasEmlekeztetoNap: 30,
      szekhely: {
        iranyitoszam: "1111",
        varos: "Budapest",
        utca: "Fő u. 1",
        orszag: "HU",
      },
    });
    expect(m.szamlazasiCim).toBeUndefined();
    expect(m.kapcsolattartok).toEqual([
      {
        nev: "Kiss",
        beosztas: "Igazgató",
        telefon: undefined,
        email: undefined,
        elsodleges: true,
      },
    ]);
  });

  it("defaults an unknown type to ceg", () => {
    expect(mapContact({ _id: "x", name: "A", type: "???" }).tipus).toBe("ceg");
  });
});

describe("mapSupplier", () => {
  it("folds a supplier into a beszallito partner", () => {
    const m = mapSupplier({
      _id: "s1",
      partner_id: "SU000001",
      name: "Szállító Zrt.",
      headquarters: "1000 Valahol, Fő út 2.",
      bank_account: "11111111-22222222",
    });
    expect(m).toMatchObject({
      regiForras: "supplier",
      partnerSzerep: "beszallito",
      tipus: "ceg",
      bankszamlaszam: "11111111-22222222",
      szekhely: { utca: "1000 Valahol, Fő út 2." },
    });
  });
});

describe("mapLead", () => {
  const ctx = {
    userId: (id: string) => (id === "u1" ? "NEWUSER" : undefined),
    partnerId: (id: string) => (id === "c1" ? "NEWPARTNER" : undefined),
    fallbackUserId: "FALLBACK",
  };

  it("covers every legacy status", () => {
    expect(new Set(Object.values(LEGACY_LEAD_STATUS))).toEqual(
      new Set(ERDEKLODO_ALLAPOTOK),
    );
  });

  it("maps status, links, lost reason and activities", () => {
    const m = mapLead(
      {
        _id: "l1",
        lead_number: "L-1",
        company_name: "Lead Kft.",
        status: "lost",
        lost_reason: "price",
        lost_reason_custom: "túl drága",
        assigned_to: "u1",
        contact_id: "c1",
        activities: [
          {
            type: "call",
            user_id: "u1",
            user_name: "A",
            text: "hívás",
            timestamp: new Date(1),
          },
          {
            type: "weird",
            user_id: "gone",
            user_name: "B",
            text: "?",
            timestamp: new Date(2),
          },
        ],
      },
      ctx,
    );
    expect(m.allapot).toBe("elveszett");
    expect(m.elvesztesOka).toBe("price: túl drága");
    expect(m.felelosId).toBe("NEWUSER");
    expect(m.partnerId).toBe("NEWPARTNER");
    expect(m.tevekenysegek.map((t) => [t.tipus, t.felhasznaloId])).toEqual([
      ["hivas", "NEWUSER"],
      ["jegyzet", "FALLBACK"],
    ]);
  });

  it("falls back to the initial status for unknown values", () => {
    expect(mapLead({ _id: "l", company_name: "X", status: "???" }, ctx).allapot).toBe(
      "cel",
    );
  });
});
