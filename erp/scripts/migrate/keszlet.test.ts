import { describe, expect, it } from "vitest";
import { mapRma, mapTetel, migraljKeszlet } from "./keszlet";

const ids = new Map([
  ["pl1", "A1"],
  ["pl2", "A2"],
]);

describe("mapTetel", () => {
  it("maps through the árlista id map and writes an opening movement that sums to the stock", () => {
    const w: string[] = [];
    const t = mapTetel(
      {
        _id: "s1",
        price_list_item_id: "pl1",
        quantity_in_stock: 10,
        quantity_allocated: 3,
        low_stock_threshold: 2,
        warehouse_location: "A-12",
      },
      ids,
      w,
    );
    expect(t).toMatchObject({
      arlistaTermekId: "A1",
      raktarhelyKod: "A-12",
      keszlet: 10,
      foglalt: 3,
      minimum: 2,
    });
    expect(t?.nyitoMozgas).toMatchObject({
      valtozas: 10,
      foglaltValtozas: 3,
      referenceId: "migracio:s1",
    });
    expect(w).toEqual([]);
  });

  it("clamps over-allocation and skips unknown products with a warning", () => {
    const w: string[] = [];
    expect(
      mapTetel(
        {
          _id: "s2",
          price_list_item_id: "pl1",
          quantity_in_stock: 2,
          quantity_allocated: 5,
        },
        ids,
        w,
      )?.foglalt,
    ).toBe(2);
    expect(
      mapTetel({ _id: "s3", price_list_item_id: "nincs", quantity_in_stock: 1 }, ids, w),
    ).toBeUndefined();
    expect(w).toHaveLength(2);
  });
});

describe("mapRma", () => {
  it("maps legacy statuses", () => {
    const r = mapRma(
      {
        _id: "r1",
        rma_number: "RMA-2026-000001",
        price_list_item_id: "pl2",
        contact_id: "c1",
        status: "sent_to_supplier",
        quantity: 0,
      },
      ids,
    );
    expect(r).toMatchObject({
      allapot: "beszallitonak_kuldve",
      mennyiseg: 1,
      legacyPartnerId: "c1",
    });
  });
});

describe("migraljKeszlet", () => {
  it("maps everything, keeps completed takings as history and flags orphans", () => {
    const r = migraljKeszlet({
      helyek: [{ _id: "l1", code: "FO", name: "Főraktár", type: "main" }],
      tetelek: [
        {
          _id: "s1",
          price_list_item_id: "pl1",
          quantity_in_stock: 4,
          warehouse_location: "FO",
        },
        {
          _id: "s2",
          price_list_item_id: "pl2",
          quantity_in_stock: 1,
          warehouse_location: "XX",
        },
      ],
      tranzakciok: [
        {
          _id: "t1",
          price_list_item_id: "pl1",
          type: "in",
          quantity: 4,
          reference_type: "delivery_note",
          reference_id: "d1",
        },
      ],
      leltarak: [
        {
          _id: "i1",
          warehouse_location: "FO",
          status: "completed",
          items: [
            {
              price_list_item_id: "pl1",
              expected_qty: 4,
              physical_qty: 3,
              notes: "hiány",
            },
          ],
        },
      ],
      rmaUgyek: [],
      arlistaIdMap: ids,
    });
    expect(r.raktarhelyek[0]).toMatchObject({ kod: "FO", tipus: "fo" });
    expect(r.tetelek).toHaveLength(2);
    expect(r.elozmenyek[0]).toMatchObject({ referenceType: "szallitolevel" });
    expect(r.leltarak[0]).toMatchObject({ allapot: "lezarva" });
    expect(r.figyelmeztetesek.some((w) => w.includes("XX"))).toBe(true);
  });
});
