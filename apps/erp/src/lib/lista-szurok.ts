import type { DataTableQuery } from "@erp/ui";

/**
 * Server-side reading of the shared table's `f.*` URL filters, for the lists that load a limited
 * window of records (gépüzemnapló, tankolások, munkaidő…) and filter the rest in the browser. The
 * filters that narrow what is loaded are applied on the server too, so a filtered list is never
 * cut short by the load limit.
 */

const NAP = /^\d{4}-\d{2}-\d{2}$/;

/** The selected values of a multi-select filter (empty strings dropped). */
export function szuroErtekek(query: DataTableQuery, key: string): string[] {
  const raw = query.filters?.[key];
  if (raw === undefined) return [];
  return (Array.isArray(raw) ? raw : [raw]).map((v) => String(v).trim()).filter(Boolean);
}

/** A date-range filter (`[tól, ig]`, positional; an empty `tól` keeps its slot) as Budapest days. */
export function napTartomany(
  query: DataTableQuery,
  key: string,
): { tol?: string; ig?: string } {
  const raw = query.filters?.[key];
  if (raw === undefined) return {};
  const [tol, ig] = Array.isArray(raw) ? raw : [raw];
  return {
    tol: tol && NAP.test(tol) ? tol : undefined,
    ig: ig && NAP.test(ig) ? ig : undefined,
  };
}

/** Distinct, Hungarian-sorted select options (value = label) for a `filterVariant: 'select'`
 * column. */
export function ertekOpciok(
  values: Iterable<string | undefined | null>,
): Array<{ value: string; label: string }> {
  return [...new Set([...values].filter((v): v is string => Boolean(v)))]
    .sort((a, b) => a.localeCompare(b, "hu"))
    .map((value) => ({ value, label: value }));
}

/** `undefined` instead of an empty list — "no filter" for the domain APIs. */
export function vagyMind<T>(values: T[]): T[] | undefined {
  return values.length > 0 ? values : undefined;
}
