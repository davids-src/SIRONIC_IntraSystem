import type React from "react";

export type ColumnType = "string" | "number" | "date" | "boolean" | "enum" | "image";

/** Semantic colour of a badge cell / status chip. */
export type BadgeTone = "success" | "warning" | "danger" | "info" | "neutral";

export interface ColumnDef<T> {
  /** Row object key used for display and client-side tables */
  key: string;
  /** MongoDB path when row key differs (e.g. `names.en` for key `name_en`) */
  mongoKey?: string;
  label: string;
  /** Label in the column picker when `label` is empty (e.g. image columns) */
  columnPickerLabel?: string;
  type?: ColumnType;
  sortable?: boolean;
  filterable?: boolean;
  searchable?: boolean;
  enumValues?: Array<{ value: string; label: string }>;
  /**
   * `select` turns a `string` column's filter from a free-text input into an exact-match
   * multi-select over `enumValues` (static, or injected at runtime from the distinct values in
   * the data). Enum columns are always selects.
   */
  filterVariant?: "text" | "select";
  /** Renders the cell as a coloured badge (label from `enumValues`) — serializable, so it works
   * for columns declared in Server Components / shared server+client column files. */
  badgeTones?: Record<string, BadgeTone>;
  /** With `badgeTones`: row key holding a count shown next to the label ("Lejárt · 2 db"). */
  badgeCountKey?: string;
  /** With `badgeTones`: values that render an empty cell (the problem is flagged on the row instead). */
  badgeHiddenValues?: string[];
  align?: "left" | "right" | "center";
  hideable?: boolean;
  defaultVisible?: boolean;
  headerHint?: string;
  imageOptions?: {
    size?: "sm" | "md";
    /** Serializable alt field key — use from Server Components instead of `alt`. */
    altKey?: keyof T & string;
    alt?: (row: T) => string;
  };
  render?: (value: unknown, row: T) => React.ReactNode;
  /**
   * Plain value of the cell in an Excel / PDF export. Without it the export uses the typed raw
   * value (date, number), the enum label, or the text of `render` — set it only when none of
   * those reads right.
   */
  exportValue?: (row: T) => string | number | Date | null | undefined;
  /** `false` leaves the column out of exports (action buttons, thumbnails…). */
  exportable?: boolean;
}

/** A problem with one row — shown as a tinted row and a warning/error icon with the message on hover. */
export interface RowIssue {
  tone: "warning" | "danger";
  message: string;
  /** Column the problem belongs to — the icon is shown in that cell. Without it (or when the
   * column is hidden) the icon goes in the first cell. */
  columnKey?: string;
}

export interface DataTableQuery {
  search?: string;
  sort?: string;
  page?: number;
  pageSize?: number;
  filters?: Record<string, string | string[]>;
  /** Set by `parseDataTableQuery` for a full export (`__export`): lifts the page-size cap. */
  exportAll?: boolean;
}

export type DataTableMode = "server" | "client";
export type DataTableRowOpen = "navigate" | "sheet" | "both";
export type DataTableVariant = "default" | "compact";

export interface DataTableRowDetail<T> {
  title?: (row: T) => string;
  description?: (row: T) => string;
  render: (row: T) => React.ReactNode;
}

export interface DataTableProps<T extends Record<string, unknown>> {
  mode?: DataTableMode;
  data: T[];
  columns: Array<ColumnDef<T>>;
  query: DataTableQuery;
  total: number;
  basePath: string;
  tableId: string;
  toolbarLeading?: React.ReactNode;
  toolbarExtra?: React.ReactNode;
  /** Enable row checkboxes; use with selectedRowKeys + onSelectedRowKeysChange */
  selectable?: boolean;
  getRowKey?: (row: T) => string;
  selectedRowKeys?: string[];
  onSelectedRowKeysChange?: (keys: string[]) => void;
  rowHref?: (row: T) => string;
  rowDetail?: DataTableRowDetail<T>;
  rowOpen?: DataTableRowOpen;
  /** Opens the detail sheet of the row with this key (e.g. a row linked from an e-mail or a
   * notification). Needs `rowDetail`; ignored when the row is not in `data`. */
  openRowKey?: string;
  emptyMessage?: string;
  /** Flags rows that need attention (missing/expired data…) instead of spelling it out in a cell. */
  rowIssues?: (row: T) => RowIssue[];
  variant?: DataTableVariant;
  /** Title of the Excel sheet / printed list; default: the page's `h1`. */
  exportTitle?: string;
  /** `false` hides the "Exportálás" menu (tables inside forms, pickers…). */
  exportable?: boolean;
}
