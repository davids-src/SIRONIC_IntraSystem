import { describe, expect, it } from "vitest";
import { applyClientQuery } from "./client-query";
import { matchesTerms, searchTerms, termRegexSource } from "./text-match";
import { buildDataTableMongoQuery } from "./query";
import type { ColumnDef } from "./types";

type R = { dms: string; partner: string };
const cols: Array<ColumnDef<R>> = [
  { key: "dms", label: "DMS", type: "string", filterable: true, searchable: true },
  {
    key: "partner",
    label: "Partner",
    type: "string",
    filterable: true,
    searchable: true,
  },
];
const rows: R[] = [
  { dms: "RSZ-086-1-2016", partner: "Hungária Kft." },
  { dms: "RSZ-012-1-2026", partner: "V-Híd Zrt." },
];

describe("forgiving text match", () => {
  it("splits terms on spaces, ; and ,", () => {
    expect(searchTerms("086; 2016,  hunga")).toEqual(["086", "2016", "hunga"]);
  });

  it("ignores accents and case, matches fragments", () => {
    expect(matchesTerms("Hungária Kft.", ["HUNGA"])).toBe(true);
    expect(matchesTerms("V-Híd Zrt.", ["vhid"])).toBe(false);
    expect(matchesTerms("V-Híd Zrt.", ["v-hid"])).toBe(true);
  });

  it("client search needs every term, across columns, any order", () => {
    const q = (search: string) => applyClientQuery(rows, { search }, cols).rows.length;
    expect(q("086 2016 hunga")).toBe(1);
    expect(q("hunga 086")).toBe(1);
    expect(q("086 zrt")).toBe(0);
  });

  it("client column filter takes fragments", () => {
    const r = applyClientQuery(rows, { filters: { partner: "hung 2016" } }, cols);
    expect(r.rows).toHaveLength(0); // 2016 is not in the partner column
    expect(
      applyClientQuery(rows, { filters: { dms: "086 2016" } }, cols).rows,
    ).toHaveLength(1);
  });

  it("server query ANDs the terms with accent-folding regexes", () => {
    const q = buildDataTableMongoQuery({ filters: { partner: "hunga kft" } }, cols);
    expect(q.filter.$and).toHaveLength(2);
    const s = buildDataTableMongoQuery({ search: "086 hunga" }, cols);
    expect(s.filter.$and).toHaveLength(2);
    expect(new RegExp(termRegexSource("hungaria"), "i").test("Hungária")).toBe(true);
    expect(new RegExp(termRegexSource("a.b"), "i").test("axb")).toBe(false);
  });
});
