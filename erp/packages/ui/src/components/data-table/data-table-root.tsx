"use client";

import type React from "react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  ArrowDownUpIcon,
  Columns3Icon,
  ExternalLinkIcon,
  FilterIcon,
  XIcon,
} from "lucide-react";
import { DataTableHeaderHint } from "./header-hint";
import { formatDateCell } from "./format-cell";
import {
  columnPickerLabel,
  getFactoryDefaultVisibleColumns,
  getHideableColumns,
  saveVisibleColumns,
} from "./preferences";
import { cn } from "@erp/lib";
import { EntitySheet } from "../entity-sheet";
import { Badge } from "../badge";
import { DataTableSelectFilter } from "./select-filter";
import { DataTableIssueIcon } from "./issue-icon";
import { DEFAULT_DATA_TABLE_PAGE_SIZE, resolveClientDataTableQuery } from "./query";
import type { ColumnDef, DataTableProps, DataTableQuery } from "./types";
import {
  getDefaultVisibleColumns,
  getTablePreferences,
  setTablePreferences,
} from "./preferences";
import { applyClientQuery } from "./client-query";
import {
  isHistoryNavigation,
  listMemoryPath,
  listScrollKey,
  pickForeignParams,
  recallListQuery,
  recallListScroll,
  rememberListQuery,
  rememberListScroll,
  restoredListSearch,
} from "./list-memory";
import { DataTableImageCell } from "./image-cell";
import { DataTablePagination } from "./pagination";
import { DataTableSortHeader } from "./sort-header";
import { ExportMenu } from "../export/export-menu";
import {
  exportCellValue,
  exportFileName,
  exportHeader,
  exportableColumns,
  exportRowRecords,
  type ExportCell,
  type ExportTable,
} from "../export/export-values";
import { printDocument, tableHtml } from "../export/print";
import { XLSX_MIME, buildXlsx, downloadFile } from "../export/xlsx";
import { DATA_TABLE_EXPORT_PARAM, EXPORT_MAX_ROWS } from "./query";
import {
  EXPORT_MESSAGE,
  EXPORT_NONCE_PARAM,
  fetchServerExportRows,
  type ExportMessage,
} from "./table-export";

type Panel = "filters" | "sort" | "columns" | "detail" | null;

function toQueryString(
  current: URLSearchParams,
  overrides: Record<string, string | number | undefined>,
) {
  const next = new URLSearchParams(current.toString());
  for (const [k, v] of Object.entries(overrides)) {
    if (v === undefined || v === "") next.delete(k);
    else next.set(k, String(v));
  }
  return next.toString();
}

/** URL params the table does not own (e.g. a page's `?ev=` year) — kept on every table change. */
const foreignParams = pickForeignParams;

/** The nearest scrolling ancestor (the dashboard's `<main>`), else the document. */
function scrollParentOf(el: HTMLElement | null): HTMLElement | null {
  let node = el?.parentElement ?? null;
  while (node) {
    const { overflowY } = getComputedStyle(node);
    if (overflowY === "auto" || overflowY === "scroll") return node;
    node = node.parentElement;
  }
  return (document.scrollingElement as HTMLElement | null) ?? null;
}

function buildParamsFromQuery(query: DataTableQuery, keep?: URLSearchParams) {
  const params = new URLSearchParams(keep);
  if (query.search) params.set("search", query.search);
  if (query.sort) params.set("sort", query.sort);
  params.set("page", String(query.page ?? 1));
  params.set("pageSize", String(query.pageSize ?? 10));
  for (const [k, v] of Object.entries(query.filters ?? {})) {
    const key = `f.${k}`;
    if (Array.isArray(v)) v.forEach((vv) => params.append(key, vv));
    else params.set(key, v);
  }
  return params;
}

export function DataTableRoot<T extends Record<string, unknown>>({
  mode = "server",
  data,
  columns,
  query,
  total: serverTotal,
  basePath,
  tableId,
  toolbarLeading,
  toolbarExtra,
  selectable = false,
  getRowKey,
  selectedRowKeys: selectedRowKeysProp,
  onSelectedRowKeysChange,
  rowHref,
  rowDetail,
  rowOpen = "navigate",
  openRowKey,
  emptyMessage = "Nincs találat",
  rowIssues,
  variant = "default",
  exportTitle,
  exportable = true,
}: DataTableProps<T>) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  /** This page was opened by a table's full export (hidden frame) — see `table-export.ts`. */
  const exportFrame = searchParams.has(DATA_TABLE_EXPORT_PARAM);

  const effectiveQuery: DataTableQuery =
    mode === "client" ? resolveClientDataTableQuery(query, searchParams) : query;

  const [panel, setPanel] = useState<Panel>(null);
  const [detailRow, setDetailRow] = useState<T | null>(null);
  const [internalSelectedKeys, setInternalSelectedKeys] = useState<string[]>([]);
  const selectedRowKeys = selectedRowKeysProp ?? internalSelectedKeys;
  const setSelectedRowKeys = onSelectedRowKeysChange ?? setInternalSelectedKeys;

  const resolveRowKey = useCallback(
    (row: T, index: number) => {
      if (getRowKey) return getRowKey(row);
      const id = (row as Record<string, unknown>)["_id"];
      if (id != null) return String(id);
      const sku = (row as Record<string, unknown>)["sku"];
      if (sku != null) return String(sku);
      return String(index);
    },
    [getRowKey],
  );
  /** The open detail row, re-read from the latest `data` so it reflects a refresh after an
   * action; closes when the row is no longer in the list. */
  const liveDetailRow = useMemo(() => {
    if (!detailRow) return null;
    const key = resolveRowKey(detailRow, -1);
    return data.find((r, i) => resolveRowKey(r, i) === key) ?? null;
  }, [data, detailRow, resolveRowKey]);

  useEffect(() => {
    if (detailRow && !liveDetailRow) {
      setDetailRow(null);
      setPanel((p) => (p === "detail" ? null : p));
    }
  }, [detailRow, liveDetailRow]);

  useEffect(() => {
    if (!openRowKey || !rowDetail) return;
    const row = data.find((r, i) => resolveRowKey(r, i) === openRowKey);
    if (row) {
      setDetailRow(row);
      setPanel("detail");
    }
    // Only when the requested key changes — not on every data refresh.
  }, [openRowKey]);

  const columnKeySignature = columns.map((c) => c.key).join("\0");

  const [visibleKeys, setVisibleKeys] = useState<string[]>(() =>
    getDefaultVisibleColumns(tableId, columns),
  );

  useEffect(() => {
    setVisibleKeys(getDefaultVisibleColumns(tableId, columns));
  }, [tableId, columnKeySignature, columns]);

  /** Widths the user dragged the columns to (px by key); remembered per table in the browser. */
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({});
  const headRef = useRef<HTMLTableRowElement>(null);

  useEffect(() => {
    setColumnWidths(getTablePreferences(tableId).columnWidths ?? {});
  }, [tableId]);

  const startResize = (e: React.PointerEvent, key: string) => {
    e.preventDefault();
    e.stopPropagation();
    const ths = Array.from(
      headRef.current?.querySelectorAll<HTMLElement>("th[data-col]") ?? [],
    );
    // Freeze every column at its current width first, so dragging one never reflows the others.
    const frozen: Record<string, number> = { ...columnWidths };
    for (const th of ths) {
      const k = th.dataset.col!;
      if (frozen[k] === undefined)
        frozen[k] = Math.round(th.getBoundingClientRect().width);
    }
    const startX = e.clientX;
    const startW = frozen[key] ?? 120;
    let latest = frozen;
    const move = (ev: PointerEvent) => {
      latest = {
        ...frozen,
        [key]: Math.max(48, Math.round(startW + ev.clientX - startX)),
      };
      setColumnWidths(latest);
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      setTablePreferences(tableId, { columnWidths: latest });
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  const resetWidths = () => {
    setColumnWidths({});
    setTablePreferences(tableId, { columnWidths: {} });
  };

  /** Keeps the list the way the user left it (#62). A list opened without any table params
   * (sidebar, breadcrumb, an adatlap's „Vissza” link) gets the query remembered for this path in
   * the browser tab — unless it is a browser back/forward step or the user cleared the list on
   * purpose (`clearAll` remembers an empty query). Then re-applies the per-table preferences
   * the URL does not carry yet (page size and the last sort), so an a–z ordering or a 100-row
   * page size survives leaving and re-entering the list. A `sort` stored as `null` means the
   * user cleared it on purpose — not re-applied. Otherwise the current query is remembered. */
  useEffect(() => {
    // An export frame must not touch the remembered list state of the tab it runs in.
    if (exportFrame) return;
    const restored = isHistoryNavigation()
      ? null
      : restoredListSearch(
          searchParams,
          recallListQuery(listMemoryPath(pathname, searchParams)),
        );
    const next = new URLSearchParams(restored ?? searchParams.toString());
    let changed = restored !== null;

    const prefs = getTablePreferences(tableId);
    if (!next.has("pageSize") && prefs.pageSize) {
      next.set("pageSize", String(prefs.pageSize));
      changed = true;
    }
    if (!next.has("sort") && prefs.sort) {
      next.set("sort", prefs.sort);
      changed = true;
    }

    if (changed) router.replace(`${pathname}?${next.toString()}`, { scroll: false });
    else rememberListQuery(pathname, searchParams);
  }, [tableId, pathname, router, searchParams, exportFrame]);

  /** Scroll position of the page and of the table box, per list query — restored when the
   * user comes back to the same list view (the dashboard scrolls inside `<main>`, which the
   * browser's own scroll restoration does not cover). */
  const rootRef = useRef<HTMLDivElement>(null);
  const tableBoxRef = useRef<HTMLDivElement>(null);
  const scrollKey = listScrollKey(pathname, searchParams);
  const dataReady = data.length > 0;
  useEffect(() => {
    const box = tableBoxRef.current;
    const page = scrollParentOf(rootRef.current);
    if (!box || !page || exportFrame) return;

    const saved = recallListScroll(scrollKey);
    let restoring = 0;
    if (saved && dataReady && (saved.page > 0 || saved.table > 0)) {
      restoring = requestAnimationFrame(() => {
        page.scrollTop = saved.page;
        box.scrollTop = saved.table;
      });
    }

    let frame = 0;
    const save = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        rememberListScroll(scrollKey, { page: page.scrollTop, table: box.scrollTop });
      });
    };
    page.addEventListener("scroll", save, { passive: true });
    box.addEventListener("scroll", save, { passive: true });
    return () => {
      cancelAnimationFrame(restoring);
      cancelAnimationFrame(frame);
      page.removeEventListener("scroll", save);
      box.removeEventListener("scroll", save);
    };
  }, [scrollKey, dataReady, exportFrame]);

  /** In an export frame: hand this table's rows (plain cells) to the table that asked. */
  useEffect(() => {
    if (searchParams.get(DATA_TABLE_EXPORT_PARAM) !== tableId) return;
    if (window.parent === window) return;
    const message: ExportMessage = {
      type: EXPORT_MESSAGE,
      tableId,
      nonce: searchParams.get(EXPORT_NONCE_PARAM) ?? "",
      total: mode === "client" ? data.length : serverTotal,
      rows: exportRowRecords(data, columns),
    };
    window.parent.postMessage(message, window.location.origin);
  }, [searchParams, tableId, mode, data, columns, serverTotal]);

  const displayColumns = useMemo(
    () => columns.filter((c) => visibleKeys.includes(c.key)),
    [columns, visibleKeys],
  );

  const clientResult = useMemo(() => {
    if (mode !== "client") return null;
    return applyClientQuery(data, effectiveQuery, columns);
  }, [mode, data, effectiveQuery, columns]);

  const rows = mode === "client" ? (clientResult?.rows ?? []) : data;
  const total = mode === "client" ? (clientResult?.total ?? 0) : serverTotal;

  const params = buildParamsFromQuery(effectiveQuery, foreignParams(searchParams));
  const queryString = (overrides: Record<string, string | number | undefined>) =>
    toQueryString(params, overrides);

  const pushQuery = useCallback(
    (overrides: Record<string, string | number | undefined>) => {
      const qs = queryString({ ...overrides, page: 1 });
      router.push(qs ? `${pathname}?${qs}` : pathname);
    },
    [pathname, queryString, router],
  );

  const rememberSort = useCallback(
    (sort: string | null) => setTablePreferences(tableId, { sort }),
    [tableId],
  );

  const handlePageSizeChange = useCallback(
    (nextPageSize: number) => {
      setTablePreferences(tableId, { pageSize: nextPageSize });
      const qs = queryString({ pageSize: nextPageSize, page: 1 });
      router.push(qs ? `${pathname}?${qs}` : pathname);
    },
    [pathname, queryString, router, tableId],
  );

  const clearAll = () => {
    rememberSort(null);
    // Cleared on purpose: the bare list must not be filled back from the remembered query.
    // Under this view's key (`listMemoryPath`): the foreign params pick the view.
    rememberListQuery(pathname, foreignParams(searchParams));
    const keep = foreignParams(searchParams).toString();
    router.push(keep ? `${pathname}?${keep}` : pathname);
    setPanel(null);
  };

  const getValue = (row: T, col: ColumnDef<T>) =>
    (row as Record<string, unknown>)[col.key];

  const renderCell = (row: T, col: ColumnDef<T>) => {
    const value = getValue(row, col);
    if (col.render) return col.render(value, row);
    if (col.type === "image") {
      const src = value ? String(value) : undefined;
      const alt =
        col.imageOptions?.alt?.(row) ??
        (col.imageOptions?.altKey
          ? String((row as Record<string, unknown>)[col.imageOptions.altKey] ?? "")
          : "");
      return <DataTableImageCell src={src} alt={alt} size={col.imageOptions?.size} />;
    }
    if (value === null || value === undefined || value === "") return "";
    if (col.badgeTones) {
      const key = String(value);
      if (col.badgeHiddenValues?.includes(key)) return "";
      const tone = col.badgeTones[key] ?? "neutral";
      const label = col.enumValues?.find((ev) => ev.value === key)?.label ?? key;
      const count = col.badgeCountKey
        ? Number((row as Record<string, unknown>)[col.badgeCountKey] ?? 0)
        : 0;
      return (
        <Badge variant={tone}>
          {label}
          {count > 0 && <span className="ml-1 opacity-70">· {count} db</span>}
        </Badge>
      );
    }
    if (col.type === "boolean") return value ? "Igen" : "Nem";
    // Dates read as `2026. 11. 26. 14:30`, never as the raw `Date` string with `GMT+1:00`.
    const date =
      value instanceof Date || col.type === "date" ? formatDateCell(value) : undefined;
    if (date) return date;
    return String(value);
  };

  const handleRowClick = (row: T) => {
    if ((rowOpen === "sheet" || rowOpen === "both") && rowDetail) {
      setDetailRow(row);
      setPanel("detail");
    }
  };

  const filterable = columns.filter((c) => c.filterable);
  const sortable = columns.filter((c) => c.sortable);

  const pageRowKeys = useMemo(
    () => rows.map((row, idx) => resolveRowKey(row, idx)),
    [rows, resolveRowKey],
  );
  const allPageSelected =
    selectable &&
    pageRowKeys.length > 0 &&
    pageRowKeys.every((k) => selectedRowKeys.includes(k));
  const somePageSelected =
    selectable &&
    pageRowKeys.some((k) => selectedRowKeys.includes(k)) &&
    !allPageSelected;

  const togglePageSelection = () => {
    if (allPageSelected) {
      setSelectedRowKeys(selectedRowKeys.filter((k) => !pageRowKeys.includes(k)));
    } else {
      setSelectedRowKeys([...new Set([...selectedRowKeys, ...pageRowKeys])]);
    }
  };

  const toggleRowSelection = (key: string) => {
    if (selectedRowKeys.includes(key)) {
      setSelectedRowKeys(selectedRowKeys.filter((k) => k !== key));
    } else {
      setSelectedRowKeys([...selectedRowKeys, key]);
    }
  };

  const selectionColSpan = (selectable ? 1 : 0) + (rowOpen === "both" && rowHref ? 1 : 0);

  const activeChips = useMemo(() => {
    const chips: Array<{ key: string; label: string; clear: () => void }> = [];
    if (effectiveQuery.search) {
      chips.push({
        key: "search",
        label: `Keresés: ${effectiveQuery.search}`,
        clear: () => pushQuery({ search: undefined }),
      });
    }
    for (const [k, v] of Object.entries(effectiveQuery.filters ?? {})) {
      const col = columns.find((c) => c.key === k);
      const labelOf = (x: string) =>
        col?.enumValues?.find((ev) => ev.value === x)?.label ?? x;
      const val = Array.isArray(v)
        ? col?.type === "date" || col?.type === "number"
          ? v.join(" – ")
          : v.map(labelOf).join(", ")
        : col?.type === "boolean"
          ? v === "true"
            ? "Igen"
            : "Nem"
          : labelOf(v);
      chips.push({
        key: k,
        label: `${col?.label ?? k}: ${val}`,
        clear: () => {
          const next = new URLSearchParams(searchParams.toString());
          next.delete(`f.${k}`);
          next.set("page", "1");
          router.push(`${pathname}?${next.toString()}`);
        },
      });
    }
    if (effectiveQuery.sort) {
      const isDesc = effectiveQuery.sort.startsWith("-");
      const key = isDesc ? effectiveQuery.sort.slice(1) : effectiveQuery.sort;
      const col = columns.find((c) => c.key === key);
      chips.push({
        key: "sort",
        label: `Rendezés: ${col?.label ?? key} (${isDesc ? "↓" : "↑"})`,
        clear: () => {
          rememberSort(null);
          pushQuery({ sort: undefined });
        },
      });
    }
    return chips;
  }, [effectiveQuery, columns, pushQuery, pathname, router, searchParams, rememberSort]);

  /** What the table shows — visible columns, current filters / search / sort — on every page. */
  const buildExport = async (): Promise<ExportTable> => {
    const cols = exportableColumns(displayColumns);
    const notes = activeChips.map((c) => c.label);
    let cells: ExportCell[][];
    let shown: number;
    let all: number;
    if (mode === "client") {
      const everything = applyClientQuery(
        data,
        { ...effectiveQuery, page: 1, pageSize: Number.MAX_SAFE_INTEGER },
        columns,
      ).rows;
      cells = everything.map((r) => cols.map((c) => exportCellValue(r, c)));
      shown = all = everything.length;
    } else if (serverTotal <= data.length) {
      cells = data.map((r) => cols.map((c) => exportCellValue(r, c)));
      shown = all = data.length;
    } else {
      const res = await fetchServerExportRows({
        pathname,
        params: buildParamsFromQuery(
          { ...effectiveQuery, page: 1, pageSize: EXPORT_MAX_ROWS },
          foreignParams(searchParams),
        ),
        tableId,
      });
      cells = res.rows.map((r) => cols.map((c) => r[c.key] ?? null));
      shown = res.rows.length;
      all = res.total;
    }
    notes.push(
      shown < all ? `Az első ${shown} sor (összesen ${all})` : `Összesen: ${all} sor`,
    );
    const pageTitle =
      exportTitle ??
      rootRef.current?.closest("main")?.querySelector("h1")?.textContent?.trim() ??
      document.title;
    return {
      title: pageTitle || "Lista",
      headers: cols.map(exportHeader),
      rows: cells,
      notes,
    };
  };

  const exportExcel = async () => {
    const t = await buildExport();
    downloadFile(await buildXlsx([t]), exportFileName(t.title, "xlsx"), XLSX_MIME);
  };

  const exportPrint = async () => {
    const t = await buildExport();
    printDocument({
      title: t.title,
      notes: t.notes,
      bodyHtml: tableHtml(t),
      landscape: t.headers.length > 5,
    });
  };

  const compact = variant === "compact";
  const hasWidths = displayColumns.some((c) => columnWidths[c.key] !== undefined);
  const totalWidth =
    displayColumns.reduce((n, c) => n + (columnWidths[c.key] ?? 120), 0) +
    (selectable ? 40 : 0) +
    (rowOpen === "both" && rowHref ? 40 : 0);
  const cellPad = compact ? "px-2 py-1.5 text-xs" : "px-3 py-2 text-sm";

  return (
    <div ref={rootRef} className="flex flex-col gap-3">
      <div
        data-export="skip"
        className="flex flex-col gap-2 lg:flex-row lg:flex-wrap lg:items-center"
      >
        {toolbarLeading ? (
          <div className="flex flex-wrap items-center gap-2 lg:shrink-0">
            {toolbarLeading}
          </div>
        ) : null}
        <form
          className="flex min-w-0 flex-1 gap-2 lg:min-w-[12rem]"
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            pushQuery({ search: String(fd.get("search") ?? "").trim() || undefined });
          }}
        >
          <input
            // Re-mount when the URL's search changes (restore, „Törlés”, back) so the box shows it.
            key={effectiveQuery.search ?? ""}
            name="search"
            defaultValue={effectiveQuery.search ?? ""}
            placeholder="Keresés…"
            className="bg-background focus-visible:ring-ring h-9 min-w-0 flex-1 rounded-md border px-3 text-sm outline-none focus-visible:ring-2"
          />
          <button
            type="submit"
            className="bg-primary text-primary-foreground inline-flex h-9 shrink-0 items-center rounded-md px-3 text-sm font-medium"
          >
            Keresés
          </button>
        </form>
        <div className="flex flex-wrap items-center gap-2">
          {filterable.length > 0 && (
            <button
              type="button"
              onClick={() => setPanel("filters")}
              className="bg-background inline-flex h-9 items-center gap-1.5 rounded-md border px-3 text-sm"
            >
              <FilterIcon className="size-2.5" />
              Szűrők
            </button>
          )}
          {sortable.length > 0 && (
            <button
              type="button"
              onClick={() => setPanel("sort")}
              className="bg-background inline-flex h-9 items-center gap-1.5 rounded-md border px-3 text-sm"
            >
              <ArrowDownUpIcon className="size-2.5" />
              Rendezés
            </button>
          )}
          <button
            type="button"
            onClick={() => setPanel("columns")}
            className="bg-background inline-flex h-9 items-center gap-1.5 rounded-md border px-3 text-sm"
          >
            <Columns3Icon className="size-2.5" />
            Oszlopok
          </button>
          {exportable && !exportFrame && (
            <ExportMenu label="Exportálás" onExcel={exportExcel} onPrint={exportPrint} />
          )}
          {activeChips.length > 0 && (
            <button
              type="button"
              onClick={clearAll}
              className="text-muted-foreground inline-flex h-9 items-center gap-1 px-2 text-sm hover:underline"
            >
              <XIcon className="size-2.5" />
              Törlés
            </button>
          )}
          {toolbarExtra}
        </div>
      </div>

      {activeChips.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {activeChips.map((chip) => (
            <button
              key={chip.key}
              type="button"
              onClick={chip.clear}
              className="bg-muted hover:bg-muted/80 inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs"
            >
              {chip.label}
              <XIcon className="size-2.5" />
            </button>
          ))}
        </div>
      )}

      <div
        ref={tableBoxRef}
        data-table-box=""
        className="max-h-[75vh] overflow-auto rounded-lg border"
      >
        <table
          className="w-full"
          style={
            hasWidths
              ? { tableLayout: "fixed", width: Math.max(totalWidth, 0), minWidth: "100%" }
              : undefined
          }
        >
          {hasWidths && (
            <colgroup>
              {selectable && <col style={{ width: 40 }} />}
              {displayColumns.map((col) => (
                <col key={col.key} style={{ width: columnWidths[col.key] }} />
              ))}
              {rowOpen === "both" && rowHref && <col style={{ width: 40 }} />}
            </colgroup>
          )}
          <thead className="bg-background sticky top-0 z-10 shadow-[0_1px_0_0_var(--border)]">
            <tr ref={headRef}>
              {selectable && (
                <th className={cn(cellPad, "w-10")}>
                  <input
                    type="checkbox"
                    className="size-4 rounded border"
                    checked={allPageSelected}
                    ref={(el) => {
                      if (el) el.indeterminate = somePageSelected;
                    }}
                    onChange={togglePageSelection}
                    aria-label="Összes kijelölése az oldalon"
                  />
                </th>
              )}
              {displayColumns.map((col) => (
                <th
                  key={col.key}
                  data-col={col.key}
                  className={cn(
                    cellPad,
                    "relative text-left font-medium",
                    col.align === "right" && "text-right",
                    col.align === "center" && "text-center",
                  )}
                >
                  <span className="inline-flex items-center gap-1">
                    {col.sortable ? (
                      <DataTableSortHeader
                        label={col.label}
                        sortKey={col.key}
                        currentSort={effectiveQuery.sort}
                        basePath={basePath}
                        queryString={queryString}
                        onSort={rememberSort}
                      />
                    ) : (
                      col.label
                    )}
                    {col.headerHint ? (
                      <DataTableHeaderHint text={col.headerHint} />
                    ) : null}
                  </span>
                  <span
                    role="separator"
                    aria-orientation="vertical"
                    aria-label={`${col.label || col.key} oszlop szélessége`}
                    title="Húzd az oszlop szélességének állításához · dupla kattintás: alaphelyzet"
                    onPointerDown={(e) => startResize(e, col.key)}
                    onDoubleClick={resetWidths}
                    className="hover:bg-primary/40 absolute inset-y-0 right-0 w-1.5 cursor-col-resize touch-none select-none"
                  />
                </th>
              ))}
              {rowOpen === "both" && rowHref && (
                <th className={cn(cellPad, "w-10")} aria-label="Műveletek" />
              )}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={displayColumns.length + selectionColSpan}
                  className="px-3 py-6 text-center text-sm"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              rows.map((row, idx) => {
                const href = rowHref?.(row);
                const rowKey = resolveRowKey(row, idx);
                const clickable =
                  (rowOpen === "sheet" || rowOpen === "both") && !!rowDetail;
                // A navigate row opens on a click anywhere — the cell padding too, not only the
                // links inside the cells.
                const navigable = rowOpen === "navigate" && !!href;
                const isSelected = selectable && selectedRowKeys.includes(rowKey);
                const issues = rowIssues?.(row) ?? [];
                const worst = issues.some((i) => i.tone === "danger")
                  ? "danger"
                  : issues.length > 0
                    ? "warning"
                    : null;
                return (
                  <tr
                    key={rowKey}
                    className={cn(
                      "border-b last:border-b-0",
                      (clickable || navigable) && "hover:bg-muted/40 cursor-pointer",
                      isSelected && "bg-muted/30",
                      worst === "danger" && "bg-danger-soft/70 dark:bg-danger-soft/40",
                      worst === "warning" && "bg-warning-soft/70 dark:bg-warning-soft/35",
                    )}
                    onClick={(e) => {
                      if (clickable) handleRowClick(row);
                      else if (
                        navigable &&
                        !(e.target as HTMLElement).closest("a,button,input")
                      )
                        router.push(href);
                    }}
                  >
                    {selectable && (
                      <td className={cellPad} onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          className="size-4 rounded border"
                          checked={isSelected}
                          onChange={() => toggleRowSelection(rowKey)}
                          aria-label={`Kijelölés: ${rowKey}`}
                        />
                      </td>
                    )}
                    {displayColumns.map((col, colIdx) => {
                      const cell = renderCell(row, col);
                      const visibleKeySet = new Set(displayColumns.map((c) => c.key));
                      const colIssues = issues.filter(
                        (i) =>
                          i.columnKey === col.key ||
                          (colIdx === 0 &&
                            (!i.columnKey || !visibleKeySet.has(i.columnKey))),
                      );
                      const content =
                        colIssues.length > 0 ? (
                          <span className="inline-flex items-center gap-2">
                            <DataTableIssueIcon issues={colIssues} />
                            {cell}
                          </span>
                        ) : (
                          cell
                        );
                      return (
                        <td
                          key={col.key}
                          className={cn(
                            cellPad,
                            hasWidths && "[overflow-wrap:anywhere]",
                            col.align === "right" && "text-right",
                            col.align === "center" && "text-center",
                          )}
                          onClick={(e) => {
                            if (rowOpen === "both" && col.key !== "_actions")
                              e.stopPropagation();
                          }}
                        >
                          {rowOpen === "navigate" && href ? (
                            <Link href={href} className="block">
                              {content}
                            </Link>
                          ) : (
                            content
                          )}
                        </td>
                      );
                    })}
                    {rowOpen === "both" && href && (
                      <td className={cellPad} onClick={(e) => e.stopPropagation()}>
                        <Link
                          href={href}
                          className="text-muted-foreground hover:text-foreground inline-flex"
                          title="Teljes oldal"
                        >
                          <ExternalLinkIcon className="size-2.5" />
                        </Link>
                      </td>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div data-export="skip">
        <DataTablePagination
          page={effectiveQuery.page ?? 1}
          pageSize={effectiveQuery.pageSize ?? DEFAULT_DATA_TABLE_PAGE_SIZE}
          total={total}
          basePath={basePath}
          queryString={queryString}
          onPageSizeChange={handlePageSizeChange}
        />
      </div>

      <EntitySheet
        open={panel === "filters"}
        onOpenChange={(o) => setPanel(o ? "filters" : null)}
        title="Szűrők"
        exportable={false}
        size="sm"
      >
        <FilterPanel
          columns={filterable}
          searchParams={searchParams}
          pathname={pathname}
          router={router}
          onClose={() => setPanel(null)}
        />
      </EntitySheet>

      <EntitySheet
        open={panel === "sort"}
        onOpenChange={(o) => setPanel(o ? "sort" : null)}
        title="Rendezés"
        exportable={false}
        size="sm"
      >
        <SortPanel
          columns={sortable}
          currentSort={effectiveQuery.sort}
          pathname={pathname}
          searchParams={searchParams}
          router={router}
          onSorted={rememberSort}
          onClose={() => setPanel(null)}
        />
      </EntitySheet>

      <EntitySheet
        open={panel === "columns"}
        onOpenChange={(o) => setPanel(o ? "columns" : null)}
        title="Oszlopok"
        exportable={false}
        size="sm"
      >
        <ColumnsPanel
          columns={columns}
          visibleKeys={visibleKeys}
          tableId={tableId}
          onChange={(keys) => {
            setVisibleKeys(keys);
            saveVisibleColumns(tableId, keys, columns);
          }}
        />
      </EntitySheet>

      {rowDetail && liveDetailRow && (
        <EntitySheet
          open={panel === "detail"}
          onOpenChange={(o) => {
            if (!o) {
              setPanel(null);
              setDetailRow(null);
            }
          }}
          title={rowDetail.title?.(liveDetailRow) ?? "Részletek"}
          description={rowDetail.description?.(liveDetailRow)}
          size="lg"
        >
          {rowDetail.render(liveDetailRow)}
          {rowHref && (
            <div className="mt-4 border-t pt-4">
              <Link
                href={rowHref(liveDetailRow)}
                className="text-primary inline-flex items-center gap-1 text-sm font-medium"
              >
                Teljes oldal
                <ExternalLinkIcon className="size-2.5" />
              </Link>
            </div>
          )}
        </EntitySheet>
      )}
    </div>
  );
}

function FilterPanel<T>({
  columns,
  searchParams,
  pathname,
  router,
  onClose,
}: {
  columns: Array<ColumnDef<T>>;
  searchParams: URLSearchParams;
  pathname: string;
  router: ReturnType<typeof useRouter>;
  onClose: () => void;
}) {
  const onSubmit: React.FormEventHandler<HTMLFormElement> = (e) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const next = new URLSearchParams(searchParams.toString());
    next.set("page", "1");
    for (const key of Array.from(next.keys())) {
      if (key.startsWith("f.")) next.delete(key);
    }
    for (const col of columns) {
      const type = col.type ?? "string";
      if (type === "number") {
        const min = String(fd.get(`f.${col.key}.min`) ?? "").trim();
        const max = String(fd.get(`f.${col.key}.max`) ?? "").trim();
        if (min) next.append(`f.${col.key}`, min);
        if (max) next.append(`f.${col.key}`, max);
        continue;
      }
      if (type === "boolean") {
        const v = String(fd.get(`f.${col.key}`) ?? "");
        if (v && v !== "all") next.set(`f.${col.key}`, v);
        continue;
      }
      if (type === "date") {
        const from = String(fd.get(`f.${col.key}.from`) ?? "").trim();
        const to = String(fd.get(`f.${col.key}.to`) ?? "").trim();
        // positional: [from, to] — keep an empty `from` as a blank slot when only `to` is set
        if (from || to) next.append(`f.${col.key}`, from);
        if (to) next.append(`f.${col.key}`, to);
        continue;
      }
      if ((type === "enum" || col.filterVariant === "select") && col.enumValues) {
        const selected = col.enumValues
          .map((ev) => ev.value)
          .filter((val) => fd.get(`f.${col.key}.${val}`) === "on");
        selected.forEach((v) => next.append(`f.${col.key}`, v));
        continue;
      }
      const raw = String(fd.get(`f.${col.key}`) ?? "").trim();
      if (raw) next.set(`f.${col.key}`, raw);
    }
    router.push(`${pathname}?${next.toString()}`);
    onClose();
  };

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      {columns.map((col) => (
        <FilterField key={col.key} col={col} searchParams={searchParams} />
      ))}
      <button
        type="submit"
        className="bg-primary text-primary-foreground h-9 rounded-md px-3 text-sm font-medium"
      >
        Alkalmaz
      </button>
    </form>
  );
}

function FilterField<T>({
  col,
  searchParams,
}: {
  col: ColumnDef<T>;
  searchParams: URLSearchParams;
}) {
  const type = col.type ?? "string";
  const label = col.label;

  if (type === "boolean") {
    return (
      <BooleanFilter
        name={`f.${col.key}`}
        label={label}
        defaultValue={searchParams.get(`f.${col.key}`) ?? "all"}
      />
    );
  }

  if (type === "number") {
    const vals = searchParams.getAll(`f.${col.key}`);
    return (
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium">{label}</label>
        <div className="grid grid-cols-2 gap-2">
          <input
            name={`f.${col.key}.min`}
            type="number"
            placeholder="Min"
            defaultValue={vals[0] ?? ""}
            className="bg-background h-9 rounded-md border px-2 text-sm"
          />
          <input
            name={`f.${col.key}.max`}
            type="number"
            placeholder="Max"
            defaultValue={vals[1] ?? ""}
            className="bg-background h-9 rounded-md border px-2 text-sm"
          />
        </div>
      </div>
    );
  }

  if (type === "date") {
    const vals = searchParams.getAll(`f.${col.key}`);
    return (
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium">{label}</label>
        <div className="grid grid-cols-2 gap-2">
          <input
            name={`f.${col.key}.from`}
            type="date"
            aria-label={`${label} – tól`}
            defaultValue={vals[0] ?? ""}
            className="bg-background h-9 rounded-md border px-2 text-sm"
          />
          <input
            name={`f.${col.key}.to`}
            type="date"
            aria-label={`${label} – ig`}
            defaultValue={vals[1] ?? ""}
            className="bg-background h-9 rounded-md border px-2 text-sm"
          />
        </div>
      </div>
    );
  }

  if ((type === "enum" || col.filterVariant === "select") && col.enumValues?.length) {
    return (
      <DataTableSelectFilter
        name={`f.${col.key}`}
        label={label}
        options={col.enumValues}
        defaultSelected={searchParams.getAll(`f.${col.key}`)}
        tones={col.badgeTones}
      />
    );
  }

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={`f.${col.key}`} className="text-sm font-medium">
        {label}
      </label>
      <input
        id={`f.${col.key}`}
        name={`f.${col.key}`}
        defaultValue={searchParams.get(`f.${col.key}`) ?? ""}
        className="bg-background h-9 rounded-md border px-2 text-sm"
      />
    </div>
  );
}

function SortPanel<T>({
  columns,
  currentSort,
  pathname,
  searchParams,
  router,
  onSorted,
  onClose,
}: {
  columns: Array<ColumnDef<T>>;
  currentSort?: string;
  pathname: string;
  searchParams: URLSearchParams;
  router: ReturnType<typeof useRouter>;
  onSorted: (sort: string) => void;
  onClose: () => void;
}) {
  const apply = (key: string, dir: "asc" | "desc") => {
    const sort = dir === "desc" ? `-${key}` : key;
    const next = new URLSearchParams(searchParams.toString());
    next.set("sort", sort);
    next.set("page", "1");
    onSorted(sort);
    router.push(`${pathname}?${next.toString()}`);
    onClose();
  };

  return (
    <ul className="flex flex-col gap-1">
      {columns.map((col) => {
        const isAsc = currentSort === col.key;
        const isDesc = currentSort === `-${col.key}`;
        return (
          <li key={col.key} className="flex gap-2">
            <span className="min-w-0 flex-1 truncate text-sm font-medium">
              {col.label}
            </span>
            <button
              type="button"
              onClick={() => apply(col.key, "asc")}
              className={cn(
                "h-8 rounded border px-2 text-xs",
                isAsc && "bg-primary text-primary-foreground",
              )}
            >
              ↑
            </button>
            <button
              type="button"
              onClick={() => apply(col.key, "desc")}
              className={cn(
                "h-8 rounded border px-2 text-xs",
                isDesc && "bg-primary text-primary-foreground",
              )}
            >
              ↓
            </button>
          </li>
        );
      })}
    </ul>
  );
}

function ColumnsPanel<T>({
  columns,
  visibleKeys,
  tableId,
  onChange,
}: {
  columns: Array<ColumnDef<T>>;
  visibleKeys: string[];
  tableId: string;
  onChange: (keys: string[]) => void;
}) {
  const hideable = getHideableColumns(columns);
  const alwaysVisible = columns.filter((c) => c.hideable === false);

  const toggle = (key: string) => {
    const next = visibleKeys.includes(key)
      ? visibleKeys.filter((k) => k !== key)
      : [...visibleKeys, key];
    if (next.length === 0) return;
    onChange(next);
    saveVisibleColumns(tableId, next, columns);
  };

  const showAll = () => {
    const next = columns.map((c) => c.key);
    onChange(next);
    saveVisibleColumns(tableId, next, columns);
  };

  const resetDefault = () => {
    const next = getFactoryDefaultVisibleColumns(columns);
    onChange(next);
    saveVisibleColumns(tableId, next, columns);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={showAll}
          className="bg-background h-8 rounded-md border px-2.5 text-xs"
        >
          Összes megjelenítése
        </button>
        <button
          type="button"
          onClick={resetDefault}
          className="bg-background h-8 rounded-md border px-2.5 text-xs"
        >
          Alapértelmezés
        </button>
      </div>

      {alwaysVisible.length > 0 && (
        <div>
          <p className="text-muted-foreground mb-2 text-xs font-medium uppercase">
            Mindig látható
          </p>
          <ul className="flex flex-col gap-1.5">
            {alwaysVisible.map((col) => (
              <li key={col.key} className="text-muted-foreground text-sm">
                {columnPickerLabel(col)}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div>
        <p className="text-muted-foreground mb-2 text-xs font-medium uppercase">
          Megjeleníthető oszlopok ({hideable.length})
        </p>
        <ul className="flex max-h-[min(60vh,24rem)] flex-col gap-1.5 overflow-y-auto pr-1">
          {hideable.map((col) => (
            <li key={col.key}>
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={visibleKeys.includes(col.key)}
                  onChange={() => toggle(col.key)}
                />
                <span className="min-w-0 flex-1">{columnPickerLabel(col)}</span>
              </label>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function BooleanFilter({
  name,
  label,
  defaultValue,
}: {
  name: string;
  label: string;
  defaultValue: string;
}) {
  const [value, setValue] = useState(defaultValue);
  const options = [
    ["all", "Mind"],
    ["true", "Igen"],
    ["false", "Nem"],
  ] as const;
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-sm font-medium">{label}</span>
      <input type="hidden" name={name} value={value} />
      <div
        className="inline-flex w-fit overflow-hidden rounded-md border"
        role="radiogroup"
        aria-label={label}
      >
        {options.map(([v, text]) => (
          <button
            key={v}
            type="button"
            role="radio"
            aria-checked={value === v}
            onClick={() => setValue(v)}
            className={cn(
              "border-r px-3 py-1 text-sm last:border-r-0",
              value === v ? "bg-primary text-primary-foreground" : "hover:bg-accent",
            )}
          >
            {text}
          </button>
        ))}
      </div>
    </div>
  );
}
