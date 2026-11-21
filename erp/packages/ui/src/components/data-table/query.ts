import { parsePagination } from "@erp/lib/utils";
import type { ColumnDef, DataTableQuery } from "./types";

/** Selectable "hány sor legyen egy oldalon" values, offered by the pagination bar. */
export const DATA_TABLE_PAGE_SIZES = [10, 25, 50, 100, 250] as const;

/** Upper bound for `pageSize`, both in the URL and in the Mongo `limit` — the largest option
 * above. Raised past `@erp/lib`'s default 100 so a whole small fleet fits on one page. */
export const MAX_DATA_TABLE_PAGE_SIZE =
  DATA_TABLE_PAGE_SIZES[DATA_TABLE_PAGE_SIZES.length - 1];

export const DEFAULT_DATA_TABLE_PAGE_SIZE = DATA_TABLE_PAGE_SIZES[0];

/** URL param of a table's full export (`__export=<tableId>`): the page renders every matching row
 * (up to `EXPORT_MAX_ROWS`) in a hidden frame, which hands them to the table that asked. */
export const DATA_TABLE_EXPORT_PARAM = "__export";
export const EXPORT_MAX_ROWS = 10_000;

export function parseDataTableQuery(
  searchParams: URLSearchParams | Record<string, string | string[] | undefined>,
): DataTableQuery {
  const get = (key: string): string | undefined => {
    if (searchParams instanceof URLSearchParams) {
      return searchParams.get(key) ?? undefined;
    }
    const v = searchParams[key];
    if (Array.isArray(v)) return v[0];
    return v;
  };

  const search = (get("search") ?? "").trim() || undefined;
  const sort = (get("sort") ?? "").trim() || undefined;

  const page = Math.max(1, parseInt(get("page") ?? "1", 10) || 1);
  const exportAll = Boolean(get(DATA_TABLE_EXPORT_PARAM));
  const pageSize = Math.min(
    exportAll ? EXPORT_MAX_ROWS : MAX_DATA_TABLE_PAGE_SIZE,
    Math.max(
      1,
      parseInt(get("pageSize") ?? String(DEFAULT_DATA_TABLE_PAGE_SIZE), 10) ||
        DEFAULT_DATA_TABLE_PAGE_SIZE,
    ),
  );

  const filters: Record<string, string | string[]> = {};

  if (searchParams instanceof URLSearchParams) {
    for (const [k, v] of searchParams.entries()) {
      if (!k.startsWith("f.")) continue;
      const key = k.slice(2);
      if (filters[key] === undefined) filters[key] = v;
      else if (Array.isArray(filters[key])) (filters[key] as string[]).push(v);
      else filters[key] = [filters[key] as string, v];
    }
  } else {
    for (const [k, v] of Object.entries(searchParams)) {
      if (!k.startsWith("f.")) continue;
      const key = k.slice(2);
      if (v === undefined) continue;
      filters[key] = v;
    }
  }

  return { search, sort, page, pageSize, filters, ...(exportAll ? { exportAll } : {}) };
}

/**
 * Client-mode query: the URL wins only for what it actually carries, so the `defaults` passed by
 * the page (sort, page size) apply until the user changes them. Filters always come from the URL.
 */
export function resolveClientDataTableQuery(
  defaults: DataTableQuery,
  searchParams: URLSearchParams,
): DataTableQuery {
  const url = parseDataTableQuery(searchParams);
  return {
    search: searchParams.has("search") ? url.search : defaults.search,
    sort: searchParams.has("sort") ? url.sort : defaults.sort,
    page: searchParams.has("page") ? url.page : (defaults.page ?? 1),
    pageSize: searchParams.has("pageSize")
      ? url.pageSize
      : Math.min(
          MAX_DATA_TABLE_PAGE_SIZE,
          defaults.pageSize ?? DEFAULT_DATA_TABLE_PAGE_SIZE,
        ),
    filters: url.filters,
  };
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function mongoField<T>(col: ColumnDef<T>): string {
  return col.mongoKey ?? col.key;
}

export function buildDataTableMongoQuery<T>(
  query: DataTableQuery,
  columns: Array<ColumnDef<T>>,
): {
  filter: Record<string, unknown>;
  sort: Record<string, 1 | -1>;
  skip: number;
  limit: number;
} {
  const { pageSize, skip } = parsePagination(
    {
      page: String(query.page ?? 1),
      pageSize: String(query.pageSize ?? DEFAULT_DATA_TABLE_PAGE_SIZE),
    },
    {
      page: 1,
      pageSize: DEFAULT_DATA_TABLE_PAGE_SIZE,
      maxPageSize: query.exportAll ? EXPORT_MAX_ROWS : MAX_DATA_TABLE_PAGE_SIZE,
    },
  );

  const filter: Record<string, unknown> = {};

  // Filters
  const filters = query.filters ?? {};
  for (const [key, raw] of Object.entries(filters)) {
    const col = columns.find((c) => c.key === key);
    if (!col || !col.filterable) continue;

    const type = col.type ?? "string";
    const values = Array.isArray(raw) ? raw : [raw];

    const field = mongoField(col);

    if (type === "boolean") {
      const v = values[0];
      if (v === "true") filter[field] = true;
      else if (v === "false") filter[field] = false;
      continue;
    }

    if (type === "number") {
      const min = values[0] ? Number(values[0]) : undefined;
      const max = values[1] ? Number(values[1]) : undefined;
      const range: Record<string, number> = {};
      if (min !== undefined && !Number.isNaN(min)) range.$gte = min;
      if (max !== undefined && !Number.isNaN(max)) range.$lte = max;
      if (Object.keys(range).length > 0) filter[field] = range;
      continue;
    }

    if (type === "date") {
      const from = values[0] ? new Date(String(values[0])) : undefined;
      const to = values[1] ? new Date(String(values[1])) : undefined;
      const range: Record<string, Date> = {};
      if (from && !Number.isNaN(from.getTime())) range.$gte = from;
      if (to && !Number.isNaN(to.getTime())) {
        // inclusive end day
        to.setHours(23, 59, 59, 999);
        range.$lte = to;
      }
      if (Object.keys(range).length > 0) filter[field] = range;
      continue;
    }

    if (type === "enum" || col.filterVariant === "select") {
      const cleaned = values.map((v) => String(v)).filter(Boolean);
      if (cleaned.length === 1) filter[field] = cleaned[0];
      else if (cleaned.length > 1) filter[field] = { $in: cleaned };
      continue;
    }

    // string default
    const v = String(values[0] ?? "").trim();
    if (v) filter[field] = { $regex: escapeRegex(v), $options: "i" };
  }

  // Search: $text if available, else regex across searchable columns
  if (query.search) {
    const searchable = columns.filter((c) => c.searchable);
    if (searchable.length > 0) {
      const or = searchable.map((c) => ({
        [mongoField(c)]: { $regex: escapeRegex(query.search!), $options: "i" },
      }));
      filter.$and = filter.$and
        ? [...(filter.$and as unknown[]), { $or: or }]
        : [{ $or: or }];
    } else {
      filter.$text = { $search: query.search };
    }
  }

  // Sort
  const sort: Record<string, 1 | -1> = {};
  if (query.sort) {
    const isDesc = query.sort.startsWith("-");
    const key = isDesc ? query.sort.slice(1) : query.sort;
    const col = columns.find((c) => c.key === key);
    if (col?.sortable) sort[mongoField(col)] = isDesc ? -1 : 1;
  }
  if (Object.keys(sort).length === 0) sort.createdAt = -1;

  return { filter, sort, skip, limit: pageSize };
}
