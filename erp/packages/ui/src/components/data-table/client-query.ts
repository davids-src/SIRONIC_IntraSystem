import type { ColumnDef, DataTableQuery } from "./types";

function getCellValue<T>(row: T, key: string): unknown {
  return (row as Record<string, unknown>)[key];
}

function matchString(hay: unknown, needle: string): boolean {
  if (hay === null || hay === undefined) return false;
  // Array cells (tags, several machines…) match when any element does.
  if (Array.isArray(hay)) return hay.some((h) => matchString(h, needle));
  return String(hay).toLowerCase().includes(needle.toLowerCase());
}

export function applyClientQuery<T extends Record<string, unknown>>(
  data: T[],
  query: DataTableQuery,
  columns: Array<ColumnDef<T>>,
): { rows: T[]; total: number } {
  let rows = [...data];
  const filters = query.filters ?? {};

  for (const [key, raw] of Object.entries(filters)) {
    const col = columns.find((c) => c.key === key);
    if (!col?.filterable) continue;
    const type = col.type ?? "string";
    const values = Array.isArray(raw) ? raw : [raw];
    const v0 = String(values[0] ?? "").trim();
    if (!v0 && type !== "boolean") continue;

    rows = rows.filter((row) => {
      const cell = getCellValue(row, key);
      if (type === "boolean") {
        if (v0 === "true") return cell === true;
        if (v0 === "false") return cell === false;
        return true;
      }
      if (type === "number") {
        const n = Number(cell);
        if (Number.isNaN(n)) return false;
        const min = values[0] ? Number(values[0]) : undefined;
        const max = values[1] ? Number(values[1]) : undefined;
        if (min !== undefined && !Number.isNaN(min) && n < min) return false;
        if (max !== undefined && !Number.isNaN(max) && n > max) return false;
        return true;
      }
      if (type === "date") {
        const t = new Date(String(cell ?? "")).getTime();
        if (Number.isNaN(t)) return false;
        const from = values[0] ? new Date(String(values[0])).getTime() : undefined;
        const toRaw = values[1] ? new Date(String(values[1])) : undefined;
        if (toRaw) toRaw.setHours(23, 59, 59, 999);
        if (from !== undefined && !Number.isNaN(from) && t < from) return false;
        if (toRaw && !Number.isNaN(toRaw.getTime()) && t > toRaw.getTime()) return false;
        return true;
      }
      if (type === "enum" || col.filterVariant === "select") {
        const allowed = values.map(String).filter(Boolean);
        if (allowed.length === 0) return true;
        if (Array.isArray(cell))
          return cell.some((c) => allowed.includes(String(c ?? "")));
        return allowed.includes(String(cell ?? ""));
      }
      return matchString(cell, v0);
    });
  }

  if (query.search?.trim()) {
    const q = query.search.trim();
    const searchable = columns.filter((c) => c.searchable);
    const cols = searchable.length > 0 ? searchable : columns;
    rows = rows.filter((row) =>
      cols.some((c) => matchString(getCellValue(row, c.key), q)),
    );
  }

  if (query.sort) {
    const isDesc = query.sort.startsWith("-");
    const key = isDesc ? query.sort.slice(1) : query.sort;
    const col = columns.find((c) => c.key === key);
    if (col?.sortable) {
      rows.sort((a, b) => {
        const av = getCellValue(a, key);
        const bv = getCellValue(b, key);
        if (av === bv) return 0;
        if (av === null || av === undefined) return 1;
        if (bv === null || bv === undefined) return -1;
        const cmp =
          typeof av === "string" && typeof bv === "string"
            ? av.localeCompare(bv, "hu", { numeric: true })
            : av < bv
              ? -1
              : 1;
        return isDesc ? -cmp : cmp;
      });
    }
  }

  const total = rows.length;
  const page = query.page ?? 1;
  const pageSize = query.pageSize ?? 10;
  const skip = (page - 1) * pageSize;
  rows = rows.slice(skip, skip + pageSize);

  return { rows, total };
}
