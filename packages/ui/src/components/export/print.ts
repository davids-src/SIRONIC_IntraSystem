import { cellText, type ExportTable } from "./export-values";

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** A table as printable HTML — the header row repeats on every printed page (`thead`). */
export function tableHtml(t: ExportTable, opts: { heading?: boolean } = {}): string {
  const head = t.headers.map((h) => `<th>${escapeHtml(h)}</th>`).join("");
  const body = t.rows
    .map(
      (r) =>
        `<tr>${r
          .map((v) => {
            const num = typeof v === "number";
            return `<td${num ? ' class="num"' : ""}>${escapeHtml(cellText(v))}</td>`;
          })
          .join("")}</tr>`,
    )
    .join("");
  const heading = opts.heading ? `<h2>${escapeHtml(t.title)}</h2>` : "";
  const empty = t.rows.length === 0 ? '<p class="muted">Nincs sor.</p>' : "";
  return `${heading}<table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>${empty}`;
}

const PRINT_CSS = `
  * { box-sizing: border-box; }
  body { font-family: system-ui, -apple-system, 'Segoe UI', Roboto, Arial, sans-serif; color: #111;
    margin: 0; font-size: 10px; }
  header.doc { display: flex; justify-content: space-between; align-items: flex-end; gap: 16px;
    border-bottom: 1.5px solid #111; padding-bottom: 6px; margin-bottom: 8px; }
  header.doc h1 { font-size: 16px; margin: 0; }
  header.doc .meta { text-align: right; color: #555; font-size: 9px; }
  header.doc img { max-height: 28px; max-width: 140px; display: block; margin-left: auto; }
  .notes { color: #444; margin: 0 0 8px; padding: 0; list-style: none; font-size: 9px; }
  h2 { font-size: 12px; margin: 14px 0 4px; }
  table { width: 100%; border-collapse: collapse; }
  thead { display: table-header-group; }
  tr { page-break-inside: avoid; break-inside: avoid; }
  th, td { border: 0.5px solid #999; padding: 3px 4px; text-align: left; vertical-align: top;
    white-space: pre-wrap; word-break: break-word; }
  th { background: #eee; font-weight: 600; }
  td.num { text-align: right; white-space: nowrap; }
  .muted { color: #666; }
  dl.kv { display: grid; grid-template-columns: minmax(120px, 30%) 1fr; gap: 0; margin: 0; }
  dl.kv dt, dl.kv dd { margin: 0; padding: 3px 4px; border-bottom: 0.5px solid #ccc; }
  dl.kv dt { color: #555; }
`;

export type PrintDocument = {
  title: string;
  bodyHtml: string;
  notes?: string[];
  landscape?: boolean;
  companyName?: string;
  logoUrl?: string;
};

/** The full printable HTML document (exported for tests). */
export function printDocumentHtml(d: PrintDocument, now = new Date()): string {
  const when = now.toLocaleString("hu-HU", {
    timeZone: "Europe/Budapest",
    dateStyle: "medium",
    timeStyle: "short",
  });
  const notes = d.notes?.length
    ? `<ul class="notes">${d.notes.map((n) => `<li>${escapeHtml(n)}</li>`).join("")}</ul>`
    : "";
  const logo = d.logoUrl ? `<img src="${escapeHtml(d.logoUrl)}" alt="">` : "";
  return `<!doctype html><html lang="hu"><head><meta charset="utf-8"><title>${escapeHtml(
    d.title,
  )}</title><style>@page { size: A4 ${d.landscape ? "landscape" : "portrait"}; margin: 12mm; }${PRINT_CSS}</style></head><body>
<header class="doc"><h1>${escapeHtml(d.title)}</h1><div class="meta">${logo}${
    d.companyName ? `${escapeHtml(d.companyName)}<br>` : ""
  }Készült: ${escapeHtml(when)}</div></header>${notes}${d.bodyHtml}</body></html>`;
}

/**
 * Prints a generated document from a hidden iframe — the browser's dialog offers "Mentés PDF-ként".
 * Waits for images (the logo) so they are on the page.
 */
export function printDocument(d: PrintDocument): void {
  const iframe = document.createElement("iframe");
  iframe.setAttribute("aria-hidden", "true");
  iframe.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0;";
  document.body.appendChild(iframe);
  const win = iframe.contentWindow;
  const doc = iframe.contentDocument;
  if (!win || !doc) {
    iframe.remove();
    return;
  }
  doc.open();
  doc.write(printDocumentHtml(d));
  doc.close();

  const cleanup = () => setTimeout(() => iframe.remove(), 1000);
  const go = () => {
    win.addEventListener("afterprint", cleanup, { once: true });
    win.focus();
    win.print();
    // Safari never fires afterprint for iframes.
    setTimeout(() => iframe.isConnected && iframe.remove(), 120_000);
  };
  const imgs = Array.from(doc.images).filter((i) => !i.complete);
  if (imgs.length === 0) {
    setTimeout(go, 50);
    return;
  }
  let left = imgs.length;
  const done = () => {
    left -= 1;
    if (left === 0) go();
  };
  imgs.forEach((i) => {
    i.addEventListener("load", done, { once: true });
    i.addEventListener("error", done, { once: true });
  });
  setTimeout(() => left > 0 && ((left = 0), go()), 3000);
}
