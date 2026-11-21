import { describe, expect, it } from "vitest";
import { applyClientQuery } from "./client-query";
import type { ColumnDef } from "./types";

type Row = { _id: string; nev: string; nap: string; cimkek: string[]; ora: number };

const cols: Array<ColumnDef<Row>> = [
  {
    key: "nev",
    label: "Név",
    type: "string",
    sortable: true,
    filterable: true,
    searchable: true,
    filterVariant: "select",
  },
  { key: "nap", label: "Nap", type: "date", sortable: true, filterable: true },
  {
    key: "cimkek",
    label: "Jelzések",
    type: "string",
    filterable: true,
    filterVariant: "select",
    searchable: true,
  },
  { key: "ora", label: "Óra", type: "number", sortable: true, filterable: true },
];

const rows: Row[] = [
  { _id: "1", nev: "Zoltán", nap: "2026-11-01", cimkek: ["elteres"], ora: 8 },
  { _id: "2", nev: "Ádám", nap: "2026-11-02", cimkek: [], ora: 7.5 },
  { _id: "3", nev: "Éva", nap: "2026-11-03", cimkek: ["automatikus", "elteres"], ora: 9 },
];

describe("applyClientQuery", () => {
  it("matches a select filter against any element of an array cell", () => {
    const r = applyClientQuery(rows, { filters: { cimkek: "elteres" } }, cols);
    expect(r.rows.map((x) => x._id)).toEqual(["1", "3"]);
  });

  it("searches inside array cells", () => {
    const r = applyClientQuery(rows, { search: "automat" }, cols);
    expect(r.rows.map((x) => x._id)).toEqual(["3"]);
  });

  it("filters a YYYY-MM-DD day column inclusively on both ends", () => {
    const r = applyClientQuery(
      rows,
      { filters: { nap: ["2026-11-02", "2026-11-03"] } },
      cols,
    );
    expect(r.rows.map((x) => x._id)).toEqual(["2", "3"]);
  });

  it("sorts strings in Hungarian order", () => {
    const r = applyClientQuery(rows, { sort: "nev" }, cols);
    expect(r.rows.map((x) => x.nev)).toEqual(["Ádám", "Éva", "Zoltán"]);
  });

  it("paginates after filtering and reports the filtered total", () => {
    const r = applyClientQuery(rows, { sort: "-ora", page: 2, pageSize: 2 }, cols);
    expect(r.total).toBe(3);
    expect(r.rows.map((x) => x._id)).toEqual(["2"]);
  });
});
