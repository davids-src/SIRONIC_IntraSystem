const STORAGE_KEY = "erp:table-prefs:v1";

export type TablePreferences = {
  visibleColumns?: string[];
  /** Every column key that existed when `visibleColumns` was saved. A default-visible column
   * the user then hid is "known but not visible" — it must stay hidden — whereas a column added
   * to the table later is unknown and is appended once. */
  knownColumns?: string[];
  pageSize?: number;
  /** Last sort the user applied on this table, re-applied on later visits so an a–z ordering
   * survives navigation. `null` means "the user explicitly cleared it" — don't re-apply. */
  sort?: string | null;
  /** Column widths in px the user dragged to, by column key. Absent = automatic widths. */
  columnWidths?: Record<string, number>;
};

type PrefsStore = Record<string, TablePreferences>;

function readStore(): PrefsStore {
  if (typeof localStorage === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as PrefsStore;
  } catch {
    return {};
  }
}

function writeStore(store: PrefsStore) {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    // ignore quota errors
  }
}

export function getTablePreferences(tableId: string): TablePreferences {
  return readStore()[tableId] ?? {};
}

export function setTablePreferences(tableId: string, patch: TablePreferences) {
  const store = readStore();
  store[tableId] = { ...store[tableId], ...patch };
  writeStore(store);
}

export function getDefaultVisibleColumns(
  tableId: string,
  columns: Array<{ key: string; defaultVisible?: boolean; hideable?: boolean }>,
): string[] {
  const allKeys = columns.map((c) => c.key);
  const keySet = new Set(allKeys);
  const defaultKeys = columns.filter((c) => c.defaultVisible !== false).map((c) => c.key);

  const saved = getTablePreferences(tableId).visibleColumns;
  if (!saved?.length) return defaultKeys;

  const validSaved = saved.filter((k) => keySet.has(k));
  if (validSaved.length === 0) return defaultKeys;

  // Keep user order; append only columns added after the choice was saved. Without
  // `knownColumns` (legacy prefs) nothing is appended — otherwise a column the user hid
  // (e.g. "Létrehozva") would come back on every visit.
  const known = getTablePreferences(tableId).knownColumns;
  const merged = [...validSaved];
  if (known) {
    for (const key of defaultKeys) {
      if (!merged.includes(key) && !known.includes(key)) merged.push(key);
    }
  }
  return merged;
}

/** Visible columns from column definitions only — ignores saved preferences. */
export function getFactoryDefaultVisibleColumns(
  columns: Array<{ key: string; defaultVisible?: boolean }>,
): string[] {
  return columns.filter((c) => c.defaultVisible !== false).map((c) => c.key);
}

export function getHideableColumns(
  columns: Array<{
    key: string;
    hideable?: boolean;
    label?: string;
    columnPickerLabel?: string;
  }>,
) {
  return columns.filter((c) => c.hideable !== false);
}

export function columnPickerLabel(col: {
  key: string;
  label?: string;
  columnPickerLabel?: string;
}): string {
  return col.columnPickerLabel ?? (col.label?.trim() || col.key);
}

/** Persists the user's column choice together with the full set of columns it was made against. */
export function saveVisibleColumns(
  tableId: string,
  visibleColumns: string[],
  columns: Array<{ key: string }>,
) {
  setTablePreferences(tableId, {
    visibleColumns,
    knownColumns: columns.map((c) => c.key),
  });
}
