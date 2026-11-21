import { isValidElement, type ReactNode } from "react";
import type { ColumnDef } from "../data-table/types";

/** One exported cell: what a spreadsheet can hold. */
export type ExportCell = string | number | Date | null;

/** A table ready for Excel / print: header labels and plain rows. */
export type ExportTable = {
  /** Sheet / document title. */
  title: string;
  headers: string[];
  rows: ExportCell[][];
  /** Lines printed under the title (active filters, search, sort…). */
  notes?: string[];
};

const BLOCK_TAGS = new Set([
  "div",
  "p",
  "li",
  "ul",
  "ol",
  "section",
  "header",
  "footer",
  "tr",
  "br",
  "h1",
  "h2",
  "h3",
  "h4",
  "dt",
  "dd",
]);

/**
 * Visible text of a rendered cell, without running any component: host elements and the
 * `children` of component elements are walked (a Badge's label is its children). Block elements
 * are separated by " · " so a two-line cell ("title / subtitle") stays readable on one line.
 */
export function nodeText(node: ReactNode): string {
  const parts: string[] = [];
  const walk = (n: ReactNode): void => {
    if (n === null || n === undefined || typeof n === "boolean") return;
    if (typeof n === "string" || typeof n === "number" || typeof n === "bigint") {
      parts.push(String(n));
      return;
    }
    if (Array.isArray(n)) {
      n.forEach(walk);
      return;
    }
    if (isValidElement(n)) {
      const props = n.props as {
        children?: ReactNode;
        "aria-hidden"?: unknown;
        hidden?: unknown;
      };
      if (
        props["aria-hidden"] === true ||
        props["aria-hidden"] === "true" ||
        props.hidden
      )
        return;
      const block = typeof n.type === "string" && BLOCK_TAGS.has(n.type);
      if (block) parts.push("\u0000");
      walk(props.children);
      if (block) parts.push("\u0000");
    }
  };
  walk(node);
  return parts
    .join("")
    .split("\u0000")
    .map((s) => s.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .join(" · ");
}

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;

/** A date-ish raw value → Date (ISO day strings as UTC midnight), else null. */
export function toDate(v: unknown): Date | null {
  if (v instanceof Date) return Number.isNaN(v.getTime()) ? null : v;
  if (typeof v !== "string" && typeof v !== "number") return null;
  if (typeof v === "string" && !v.trim()) return null;
  const d =
    typeof v === "string" && ISO_DAY.test(v) ? new Date(`${v}T00:00:00Z`) : new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

function labelOf<T>(col: ColumnDef<T>, v: unknown): string {
  const key = String(v);
  return col.enumValues?.find((e) => e.value === key)?.label ?? key;
}

function primitiveText(v: unknown): string | null {
  if (v === null || v === undefined) return "";
  if (typeof v === "string" || typeof v === "number" || typeof v === "bigint")
    return String(v);
  if (typeof v === "boolean") return v ? "Igen" : "Nem";
  if (Array.isArray(v)) {
    const items = v.map(primitiveText);
    return items.every((x) => x !== null) ? items.filter(Boolean).join(", ") : null;
  }
  return null;
}

/**
 * The plain value of one cell, as close to what the table shows as possible:
 * `exportValue` → typed raw value (date, number, yes/no) → enum label → the rendered cell's
 * text → the raw value as text. Never a React node.
 */
export function exportCellValue<T>(row: T, col: ColumnDef<T>): ExportCell {
  if (col.exportValue) {
    const v = col.exportValue(row);
    return v === undefined || v === "" ? null : v;
  }
  const raw = (row as Record<string, unknown>)[col.key];
  const type = col.type ?? "string";

  if (type === "date") {
    const d = toDate(raw);
    if (d) return d;
  }
  if (type === "number" && typeof raw === "number" && Number.isFinite(raw)) return raw;
  if (type === "boolean" && typeof raw === "boolean") return raw ? "Igen" : "Nem";
  if (col.enumValues?.length && raw !== null && raw !== undefined && raw !== "") {
    if (col.badgeHiddenValues?.includes(String(raw))) return null;
    return Array.isArray(raw)
      ? raw.map((x) => labelOf(col, x)).join(", ")
      : labelOf(col, raw);
  }
  if (col.render) {
    try {
      const text = nodeText(col.render(raw, row));
      if (text && text !== "—") return text;
      if (text === "—") return null;
    } catch {
      // A render that needs React context cannot run outside the table — fall back to the value.
    }
  }
  const text = primitiveText(raw);
  return text ? text : null;
}

/** Columns that can be exported (images cannot). */
export function exportableColumns<T>(columns: Array<ColumnDef<T>>): Array<ColumnDef<T>> {
  return columns.filter((c) => c.type !== "image" && c.exportable !== false);
}

/** Rows × columns → plain cells keyed by column key (posted between windows by server tables). */
export function exportRowRecords<T>(
  rows: T[],
  columns: Array<ColumnDef<T>>,
): Array<Record<string, ExportCell>> {
  const cols = exportableColumns(columns);
  return rows.map((r) =>
    Object.fromEntries(cols.map((c) => [c.key, exportCellValue(r, c)])),
  );
}

/** Header label of a column in an export ("" image headers use the picker label). */
export function exportHeader<T>(col: ColumnDef<T>): string {
  return col.label || col.columnPickerLabel || col.key;
}

/** Display text of a cell in a printed document. */
export function cellText(v: ExportCell): string {
  if (v === null) return "";
  if (v instanceof Date) {
    const midnight =
      v.getUTCHours() === 0 && v.getUTCMinutes() === 0 && v.getUTCSeconds() === 0;
    return v.toLocaleString("hu-HU", {
      timeZone: midnight ? "UTC" : "Europe/Budapest",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      ...(midnight ? {} : { hour: "2-digit", minute: "2-digit" }),
    });
  }
  if (typeof v === "number") return v.toLocaleString("hu-HU");
  return v;
}

/** `Gépek_2026-11-20` — safe in every file system. */
export function exportFileName(title: string, ext: string, now = new Date()): string {
  const day = now.toLocaleDateString("sv-SE", { timeZone: "Europe/Budapest" });
  const safe =
    title
      .replace(/[\\/:*?"<>|]+/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 80) || "export";
  return `${safe}_${day}.${ext}`;
}
