import { describe, expect, it } from "vitest";
import {
  mapAjanlat,
  mapMegrendelo,
  mapSzerzodes,
  mapSzerzodesSablon,
  tervezErtekesitesMigraciot,
  type MigraciosIdMapok,
} from "../../../scripts/migrate/ertekesites";

const idMapok: MigraciosIdMapok = {
  partnerek: new Map([
    ["c1", "P1"],
    ["s1", "P2"],
  ]),
  felhasznalok: new Map([["u1", "U1"]]),
  arlistaTetelek: new Map([["pl1", "T1"]]),
};

describe("mapAjanlat", () => {
  const legacy = {
    _id: "o1",
    offer_number: "AJ-000007",
    title: "Kamera",
    contact_id: "c1",
    status: "rejected",
    lost_reason: "price",
    created_by: "u1",
    is_archived: true,
    archive_reason: "régi",
    lines: [
      {
        price_list_item_id: "pl1",
        description: "Kamera",
        quantity: 2,
        unit: "db",
        net_unit_price: 35000,
        tax_rate: 27,
        purchase_unit_price_snapshot: 20000,
        line_type: "product" as const,
      },
      {
        service_price_list_item_id: "sv1",
        description: "Telepítés",
        quantity: 1,
        unit: "óra",
        net_unit_price: 9000,
        tax_rate: 27,
        line_type: "service" as const,
        price_snapshot: {
          internal_base_price: 6000,
          client_multiplier: 1.5,
          multiplier_key: "kkv_eseti",
          calculated_price: 9000,
        },
      },
    ],
  };

  it("státuszt, okot, archiválást, sorokat és összegeket képez le", () => {
    const r = mapAjanlat(legacy, idMapok);
    expect(r.kihagy).toBe(false);
    expect(r.ajanlat).toMatchObject({
      azonosito: "AJ-000007",
      partnerId: "P1",
      allapot: "elutasitva",
      elvesztesOka: "ar",
      archivalt: true,
      letrehozoUserId: "U1",
    });
    expect(r.ajanlat.osszegek.nettoOsszeg).toBe(79000);
    expect(r.ajanlat.sorok[0]).toMatchObject({ forras: "termek", sorTipus: "termek" });
    expect(r.ajanlat.sorok[1]?.forras).toBe("szolgaltatas");
    expect(r.ajanlat.sorok[1]?.arSnapshot?.ugyfelSzorzo).toBe(1.5);
  });

  it("ismeretlen partner: kihagyva, figyelmeztetéssel", () => {
    const r = mapAjanlat({ ...legacy, contact_id: "nincs" }, idMapok);
    expect(r.kihagy).toBe(true);
    expect(r.figyelmeztetesek).toHaveLength(1);
  });

  it("árlista-hivatkozás leképezés nélkül kézi tételre esik vissza", () => {
    const r = mapAjanlat(
      { ...legacy, lines: [{ ...legacy.lines[0]!, price_list_item_id: "ismeretlen" }] },
      idMapok,
    );
    expect(r.ajanlat.sorok[0]?.forras).toBe("kezi");
  });
});

describe("szerződés és sablon", () => {
  it("a sablon változóit kigyűjti", () => {
    const s = mapSzerzodesSablon({
      _id: "t1",
      name: "N",
      category: "K",
      body: "{{partner_nev}} {{dij}}",
      requires_digital_signature: true,
    });
    expect(s.valtozok).toEqual(["dij"]);
    expect(s.digitalisAlairasKell).toBe(true);
    expect(s.aktiv).toBe(true);
  });

  it("állapot, aláírás típus, feltöltött figyelmeztetés", () => {
    const r = mapSzerzodes(
      {
        _id: "k1",
        contract_number: "SZ-000003",
        contact_id: "c1",
        type: "uploaded",
        category: "x",
        name: "n",
        status: "signed_paper",
        signing_type: "paper",
        pdf_url: "/api/contracts/k1/pdf",
      },
      idMapok,
    );
    expect(r.szerzodes).toMatchObject({
      allapot: "papiron_alairt",
      alairasTipus: "papir",
      tipus: "feltoltott",
    });
    expect(r.figyelmeztetesek.some((f) => f.uzenet.includes("médiatár"))).toBe(true);
  });
});

describe("mapMegrendelo", () => {
  it("összeget számol, a teljesítettre figyelmeztet", () => {
    const r = mapMegrendelo(
      {
        _id: "m1",
        order_number: "MR-000002",
        supplier_id: "s1",
        status: "fulfilled",
        lines: [
          {
            price_list_item_id: "pl1",
            description: "Kamera",
            quantity: 3,
            unit: "db",
            net_unit_price: 10000,
            tax_rate: 27,
          },
        ],
      },
      idMapok,
    );
    expect(r.megrendelo).toMatchObject({
      beszallitoId: "P2",
      allapot: "teljesitve",
      bruttoOsszeg: 38100,
    });
    expect(r.megrendelo.sorok[0]?.arlistaTetelId).toBe("T1");
    expect(r.figyelmeztetesek).toHaveLength(1);
  });
});

describe("tervezErtekesitesMigraciot", () => {
  it("kihagyja a partner nélkülieket és megadja a számláló maximumokat", () => {
    const terv = tervezErtekesitesMigraciot({
      ajanlatok: [
        { _id: "a", offer_number: "AJ-000010", title: "x", contact_id: "c1" },
        { _id: "b", offer_number: "AJ-000011", title: "y", contact_id: "nincs" },
      ],
      szerzodesSablonok: [],
      szerzodesek: [],
      megrendelok: [],
      idMapok,
    });
    expect(terv.ajanlatok).toHaveLength(1);
    expect(terv.szamlaloMax["ertekesites:ajanlat"]).toBe(11);
    expect(terv.figyelmeztetesek).toHaveLength(1);
  });
});
