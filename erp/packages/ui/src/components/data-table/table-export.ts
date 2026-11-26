import type { ExportCell } from "../export/export-values";
import { DATA_TABLE_EXPORT_PARAM } from "./query";

export const EXPORT_NONCE_PARAM = "__exportNonce";
export const EXPORT_MESSAGE = "erp:datatable-export";

export type ExportMessage = {
  type: typeof EXPORT_MESSAGE;
  tableId: string;
  nonce: string;
  total: number;
  rows: Array<Record<string, ExportCell>>;
};

export function isExportMessage(data: unknown): data is ExportMessage {
  return (
    typeof data === "object" &&
    data !== null &&
    (data as { type?: unknown }).type === EXPORT_MESSAGE &&
    Array.isArray((data as { rows?: unknown }).rows)
  );
}

/**
 * Every matching row of a server-mode table: the list page is opened in a hidden frame with the
 * table's current filters, search and sort and `__export=<tableId>` (which lifts the page-size
 * cap); the table there posts its rows back as plain cells. Works for every list page without
 * any page-specific code, with the viewer's own session and permissions.
 */
export function fetchServerExportRows(opts: {
  pathname: string;
  params: URLSearchParams;
  tableId: string;
  timeoutMs?: number;
}): Promise<{ rows: Array<Record<string, ExportCell>>; total: number }> {
  return new Promise((resolve, reject) => {
    const nonce = Math.random().toString(36).slice(2);
    const params = new URLSearchParams(opts.params);
    params.set(DATA_TABLE_EXPORT_PARAM, opts.tableId);
    params.set(EXPORT_NONCE_PARAM, nonce);

    const iframe = document.createElement("iframe");
    iframe.setAttribute("aria-hidden", "true");
    iframe.tabIndex = -1;
    iframe.style.cssText =
      "position:fixed;left:-10000px;top:0;width:1200px;height:800px;border:0;visibility:hidden;";

    const finish = () => {
      window.removeEventListener("message", onMessage);
      clearTimeout(timer);
      iframe.remove();
    };
    function onMessage(e: MessageEvent) {
      if (e.origin !== window.location.origin || e.source !== iframe.contentWindow)
        return;
      if (
        !isExportMessage(e.data) ||
        e.data.nonce !== nonce ||
        e.data.tableId !== opts.tableId
      ) {
        return;
      }
      finish();
      resolve({ rows: e.data.rows, total: e.data.total });
    }
    window.addEventListener("message", onMessage);
    const timer = setTimeout(() => {
      finish();
      reject(
        new Error(
          "Az exportálás túl sokáig tartott — szűkítsd a listát, és próbáld újra.",
        ),
      );
    }, opts.timeoutMs ?? 120_000);

    iframe.src = `${opts.pathname}?${params.toString()}`;
    document.body.appendChild(iframe);
  });
}
