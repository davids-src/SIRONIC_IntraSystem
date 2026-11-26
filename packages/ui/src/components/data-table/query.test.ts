import { describe, expect, it } from "vitest";
import {
  buildDataTableMongoQuery,
  parseDataTableQuery,
  DATA_TABLE_PAGE_SIZES,
  MAX_DATA_TABLE_PAGE_SIZE,
  resolveClientDataTableQuery,
} from "./query";
import type { ColumnDef } from "./types";

type Row = {
  sku: string;
  brand: string;
  isActive: boolean;
  price: number;
  createdAt: string;
};

const cols: Array<ColumnDef<Row>> = [
  {
    key: "sku",
    label: "SKU",
    type: "string",
    sortable: true,
    filterable: true,
    searchable: true,
  },
  { key: "brand", label: "Brand", type: "enum", sortable: true, filterable: true },
  { key: "isActive", label: "Active", type: "boolean", sortable: true, filterable: true },
  { key: "price", label: "Price", type: "number", sortable: true, filterable: true },
  { key: "createdAt", label: "Created", type: "date", sortable: true },
];

describe("buildDataTableMongoQuery", () => {
  it("builds pagination skip/limit", () => {
    const q = buildDataTableMongoQuery({ page: 2, pageSize: 25 }, cols);
    expect(q.skip).toBe(25);
    expect(q.limit).toBe(25);
  });

  it("builds sort asc/desc", () => {
    const asc = buildDataTableMongoQuery({ sort: "sku" }, cols);
    expect(asc.sort).toEqual({ sku: 1 });

    const desc = buildDataTableMongoQuery({ sort: "-sku" }, cols);
    expect(desc.sort).toEqual({ sku: -1 });
  });

  it("builds boolean filter", () => {
    const q = buildDataTableMongoQuery({ filters: { isActive: "false" } }, cols);
    expect(q.filter.isActive).toBe(false);
  });

  it("builds enum filter", () => {
    const q = buildDataTableMongoQuery(
      { filters: { brand: ["ALUTENT", "OTHER"] } },
      cols,
    );
    expect(q.filter.brand).toEqual({ $in: ["ALUTENT", "OTHER"] });
  });

  it("builds number range filter", () => {
    const q = buildDataTableMongoQuery({ filters: { price: ["10", "20"] } }, cols);
    expect(q.filter.price).toEqual({ $gte: 10, $lte: 20 });
  });

  it("builds search across searchable columns", () => {
    const q = buildDataTableMongoQuery({ search: "1000" }, cols);
    expect(q.filter.$and).toBeTruthy();
  });

  it("honours every offered page size as the Mongo limit, not just the first 100", () => {
    for (const size of DATA_TABLE_PAGE_SIZES) {
      const q = buildDataTableMongoQuery({ page: 1, pageSize: size }, cols);
      expect(q.limit).toBe(size);
    }
  });

  it("clamps a page size above the maximum instead of silently paging differently", () => {
    const q = buildDataTableMongoQuery({ page: 1, pageSize: 10_000 }, cols);
    expect(q.limit).toBe(MAX_DATA_TABLE_PAGE_SIZE);
  });
});

describe("parseDataTableQuery pageSize", () => {
  it("defaults to the smallest offered page size", () => {
    expect(parseDataTableQuery(new URLSearchParams()).pageSize).toBe(
      DATA_TABLE_PAGE_SIZES[0],
    );
  });

  it("accepts the largest offered page size from the URL", () => {
    const params = new URLSearchParams({ pageSize: String(MAX_DATA_TABLE_PAGE_SIZE) });
    expect(parseDataTableQuery(params).pageSize).toBe(MAX_DATA_TABLE_PAGE_SIZE);
  });

  it("clamps anything larger to the maximum", () => {
    const params = new URLSearchParams({ pageSize: "5000" });
    expect(parseDataTableQuery(params).pageSize).toBe(MAX_DATA_TABLE_PAGE_SIZE);
  });
});

describe("smart filters", () => {
  const smart: Array<ColumnDef<Row>> = [
    {
      key: "sku",
      label: "SKU",
      type: "string",
      filterable: true,
      filterVariant: "select",
    },
    { key: "createdAt", label: "Created", type: "date", filterable: true },
  ];

  it("treats a select-variant string column as an exact multi-value match", () => {
    const { filter } = buildDataTableMongoQuery({ filters: { sku: ["A", "B"] } }, smart);
    expect(filter.sku).toEqual({ $in: ["A", "B"] });
    const single = buildDataTableMongoQuery({ filters: { sku: "A" } }, smart);
    expect(single.filter.sku).toBe("A");
  });

  it("turns a date filter into an inclusive range", () => {
    const { filter } = buildDataTableMongoQuery(
      { filters: { createdAt: ["2026-01-01", "2026-01-31"] } },
      smart,
    );
    const range = filter.createdAt as { $gte: Date; $lte: Date };
    expect(range.$gte.getFullYear()).toBe(2026);
    expect(range.$lte.getDate()).toBe(31);
    expect(range.$lte.getHours()).toBe(23);
  });
});

describe("resolveClientDataTableQuery", () => {
  it("applies the defaults until the URL carries a value", () => {
    const defaults = { sort: "nev", pageSize: 50 };
    const empty = resolveClientDataTableQuery(defaults, new URLSearchParams("tab=x"));
    expect(empty).toMatchObject({ sort: "nev", page: 1, pageSize: 50, filters: {} });

    const set = resolveClientDataTableQuery(
      defaults,
      new URLSearchParams("sort=-ora&pageSize=10&page=3&f.nev=A&f.nev=B"),
    );
    expect(set).toMatchObject({
      sort: "-ora",
      page: 3,
      pageSize: 10,
      filters: { nev: ["A", "B"] },
    });
  });

  it("lifts the cap only for a full export", () => {
    const q = parseDataTableQuery(new URLSearchParams("pageSize=10000&__export=gepek"));
    expect(q.exportAll).toBe(true);
    expect(buildDataTableMongoQuery(q, []).limit).toBe(10_000);
    expect(parseDataTableQuery(new URLSearchParams("pageSize=10000")).pageSize).toBe(
      MAX_DATA_TABLE_PAGE_SIZE,
    );
  });
});
