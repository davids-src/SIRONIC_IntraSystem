import type { ExportCell, ExportTable } from "./export-values";
import { escapeHtml } from "./print";

/**
 * Exports any rendered screen — an adatlap, a dashboard, an open side sheet — without per-page
 * code. Excel: a "Tartalom" sheet with everything the screen shows in reading order (sections
 * by heading; KPI tiles, `dl` pairs, labelled fields and `data-export-label` markers as
 * label → value; list items and paragraphs as text), plus one sheet per `<table>` and per chart
 * (`data-export-chart`, see `chartExportProps`). Print: a copy of the element in a clean
 * document with the app's own styles, actions left out, collapsed `<details>` opened.
 *
 * Anything inside `[data-export="skip"]`, hidden or screen-reader-only is left out of both.
 */

const SKIP =
  '[data-export="skip"], [aria-hidden="true"], [hidden], script, style, template';
const HEADING = 'h1, h2, h3, h4, [data-slot="card-title"], [data-slot="sheet-title"]';

const clean = (s: string | null | undefined) => (s ?? "").replace(/\s+/g, " ").trim();

function skipped(el: Element): boolean {
  return el.closest(SKIP) !== null;
}

/** Text of an element without the parts marked to skip. */
function textOf(el: Element): string {
  if (!el.querySelector(SKIP)) return clean(el.textContent);
  const c = el.cloneNode(true) as Element;
  c.querySelectorAll(SKIP).forEach((x) => x.remove());
  return clean(c.textContent);
}

const NUM = /^-?\d{1,3}(?:[ \u00a0\u202f]\d{3})*(?:,\d+)?$|^-?\d+(?:,\d+)?$/;

/** "1 234,5" → 1234.5; anything else stays text. */
export function parseCell(text: string): ExportCell {
  if (!text) return null;
  if (NUM.test(text) && !/^0\d/.test(text)) {
    const n = Number(text.replace(/[ \u00a0\u202f]/g, "").replace(",", "."));
    if (Number.isFinite(n)) return n;
  }
  return text;
}

function controlValue(el: Element): string | null {
  if (el instanceof HTMLSelectElement) {
    return clean(
      Array.from(el.selectedOptions)
        .map((o) => o.text)
        .join(", "),
    );
  }
  if (el instanceof HTMLTextAreaElement) return el.value.trim();
  if (el instanceof HTMLInputElement) {
    const t = el.type;
    if (["hidden", "submit", "button", "reset", "file", "image", "password"].includes(t))
      return null;
    if (t === "checkbox" || t === "radio") return el.checked ? "Igen" : "Nem";
    return el.value.trim();
  }
  if (el.getAttribute("role") === "combobox") return textOf(el);
  return null;
}

function tableToExport(table: HTMLTableElement, title: string): ExportTable | null {
  const rows = Array.from(table.rows).filter((r) => !skipped(r));
  if (rows.length === 0) return null;
  const headRow =
    table.tHead?.rows[0] ?? (rows[0]?.querySelector("th") ? rows[0] : undefined);
  const headers = headRow ? Array.from(headRow.cells).map((c) => textOf(c)) : [];
  const bodyRows = rows
    .filter((r) => r !== headRow && r.parentElement?.tagName !== "THEAD")
    .map((r) => Array.from(r.cells).map((c) => parseCell(textOf(c))));
  const width = Math.max(headers.length, ...bodyRows.map((r) => r.length));
  // Drop columns with no header and no content (checkbox / action columns).
  const keep = Array.from(
    { length: width },
    (_, i) =>
      Boolean(headers[i]) || bodyRows.some((r) => r[i] !== null && r[i] !== undefined),
  );
  const pick = <V>(arr: V[], fill: V) =>
    Array.from({ length: width }, (_, i) => arr[i] ?? fill).filter((_, i) => keep[i]);
  const outHeaders = pick(headers, "");
  const outRows = bodyRows
    .map((r) => pick<ExportCell>(r, null))
    .filter((r) => r.some((v) => v !== null && v !== ""));
  if (outRows.length === 0 && outHeaders.every((h) => !h)) return null;
  return { title, headers: outHeaders, rows: outRows };
}

// ------------------------------------------------------------------- reading-order walk

type ContentRow = [section: string, label: string, value: ExportCell];

/** Block-level tags: an element without any of these inside is one line of text. */
const BLOCKS = new Set([
  "DIV",
  "P",
  "SECTION",
  "ARTICLE",
  "HEADER",
  "FOOTER",
  "MAIN",
  "ASIDE",
  "NAV",
  "UL",
  "OL",
  "LI",
  "DL",
  "DT",
  "DD",
  "TABLE",
  "FORM",
  "FIELDSET",
  "FIGURE",
  "FIGCAPTION",
  "H1",
  "H2",
  "H3",
  "H4",
  "H5",
  "H6",
  "LABEL",
  "BLOCKQUOTE",
  "PRE",
  "DETAILS",
  "SUMMARY",
  "LEGEND",
]);
const IGNORE = new Set([
  "SCRIPT",
  "STYLE",
  "TEMPLATE",
  "SVG",
  "svg",
  "BUTTON",
  "IMG",
  "CANVAS",
  "INPUT",
  "SELECT",
  "TEXTAREA",
  "NOSCRIPT",
  "IFRAME",
  "VIDEO",
  "AUDIO",
]);

/** Hidden for the viewer: marked, collapsed, screen-reader-only or not displayed. */
function invisible(el: Element): boolean {
  if (el.matches(SKIP) || el.classList.contains("sr-only")) return true;
  const view = el.ownerDocument.defaultView;
  if (!view || !(el instanceof view.HTMLElement)) return false;
  const st = view.getComputedStyle(el);
  return st.display === "none" || st.visibility === "hidden";
}

function hasBlockInside(el: Element): boolean {
  for (const c of Array.from(el.querySelectorAll("*")))
    if (BLOCKS.has(c.tagName)) return true;
  return false;
}

/** Text of an element as the viewer reads it — buttons, icons and hidden parts left out. */
function visibleText(el: Element): string {
  const c = el.cloneNode(true) as Element;
  c.querySelectorAll(`${SKIP}, .sr-only, button, svg, script, style`).forEach((x) =>
    x.remove(),
  );
  // Separate blocks so "Összes" + "12" does not read as "Összes12".
  c.querySelectorAll("*").forEach((x) => {
    // Blocks, and elements directly next to another element (flex rows of spans laid out with
    // a gap, which has no text between them), are separate parts.
    const prev = x.previousSibling;
    const glued = prev !== null && prev.nodeType === Node.ELEMENT_NODE;
    if (BLOCKS.has(x.tagName) || glued) {
      x.prepend("\u0001");
      x.append("\u0001");
    }
  });
  return (c.textContent ?? "").split("\u0001").map(clean).filter(Boolean).join(" · ");
}

const VALUE_LIKE = /^[-+−]?\d|^\d|%$|^[-+]?\d[\d\s.,]*\s?\S{0,6}$/;

/** A two-part tile ("12" + "Nyitott szervizjegy", "Állapot:" + badge) → label and value. */
function tilePair(el: Element): [string, string] | null {
  const kids = Array.from(el.children).filter(
    (k) => !invisible(k) && !IGNORE.has(k.tagName),
  );
  const direct = Array.from(el.childNodes).some(
    (n) => n.nodeType === Node.TEXT_NODE && clean(n.textContent),
  );
  if (direct || kids.length !== 2) return null;
  if (kids.some((k) => hasBlockInside(k) && k.querySelectorAll("*").length > 6))
    return null;
  const [a, b] = kids.map((k) => visibleText(k)) as [string, string];
  if (!a || !b || a.length > 80 || b.length > 120) return null;
  const isBadge = (k: Element) =>
    k.matches('[data-slot="badge"]') || !!k.querySelector('[data-slot="badge"]');
  if (a.endsWith(":")) return [a.slice(0, -1).trim(), b];
  if (isBadge(kids[1]!) && !isBadge(kids[0]!)) return [a, b];
  const va = VALUE_LIKE.test(a);
  const vb = VALUE_LIKE.test(b);
  if (va && !vb) return [b, a];
  if (vb && !va) return [a, b];
  return null;
}

type ChartData = { title?: string; headers: string[]; rows: ExportCell[][] };

/** Props for a chart wrapper so its data goes into the export (Excel sheet). */
export function chartExportProps(
  title: string,
  headers: string[],
  rows: ExportCell[][],
): { "data-export-chart": string } {
  return { "data-export-chart": JSON.stringify({ title, headers, rows }) };
}

/**
 * Everything the screen shows, in reading order: headings open sections; tiles, `dl` pairs,
 * labelled fields and `data-export-label` markers become label → value rows; list items and
 * paragraphs become text rows; tables and charts (`data-export-chart`) get sheets of their own
 * with a reference row where they stand.
 */
function walkContent(root: Element): { rows: ContentRow[]; tables: ExportTable[] } {
  const rows: ContentRow[] = [];
  const tables: ExportTable[] = [];
  let section = "";
  let tableNo = 0;
  const push = (label: string, value: ExportCell = null) => {
    if (!label && (value === null || value === "")) return;
    const last = rows[rows.length - 1];
    if (last && last[0] === section && last[1] === label && last[2] === value) return;
    rows.push([section, label, value]);
  };
  const doc = root.ownerDocument;

  const visit = (el: Element): void => {
    if (el !== root && invisible(el)) return;
    const chart = el.getAttribute("data-export-chart");
    if (chart) {
      try {
        const d = JSON.parse(chart) as ChartData;
        const title = d.title || section || "Diagram";
        tables.push({ title, headers: d.headers, rows: d.rows });
        push(`Diagram: ${title}`, "adatai külön munkalapon");
      } catch {
        // malformed — ignore the data, the caption is still read below
      }
      return;
    }
    if (IGNORE.has(el.tagName)) {
      if (el.getAttribute("role") === "combobox" && !el.closest("label")) {
        const v = visibleText(el);
        if (v) push(el.getAttribute("aria-label") ?? "", v);
      }
      return;
    }
    const label = el.getAttribute("data-export-label");
    if (label !== null) {
      const v =
        el.getAttribute("data-export-value") ??
        (el.querySelector("[data-export-value]")
          ? visibleText(el.querySelector("[data-export-value]")!)
          : visibleText(el).replace(label, "").trim());
      push(label, parseCell(v));
      return;
    }
    if (el.matches(HEADING)) {
      section = visibleText(el) || section;
      return;
    }
    if (el.getAttribute("role") === "tablist") {
      const active = el.querySelector(
        '[role="tab"][aria-selected="true"], [role="tab"][data-state="active"]',
      );
      if (active) push("Megjelenített fül", clean(active.textContent));
      return;
    }
    switch (el.tagName) {
      case "TABLE": {
        tableNo += 1;
        const t = el as HTMLTableElement;
        const caption = t.caption ? textOf(t.caption) : "";
        const out = tableToExport(t, caption || section || `Táblázat ${tableNo}`);
        if (out) {
          tables.push(out);
          push(`Táblázat: ${out.title}`, `${out.rows.length} sor, külön munkalapon`);
        }
        return;
      }
      case "DL": {
        for (const dt of Array.from(el.querySelectorAll("dt"))) {
          if (invisible(dt) || dt.closest("dl") !== el) continue;
          const values: string[] = [];
          let sib = dt.nextElementSibling;
          while (sib && sib.tagName === "DD") {
            if (!invisible(sib)) values.push(visibleText(sib));
            sib = sib.nextElementSibling;
          }
          push(visibleText(dt), parseCell(values.filter(Boolean).join(", ")));
        }
        return;
      }
      case "LABEL": {
        const id = el.getAttribute("for");
        const control =
          (id ? doc.getElementById(id) : null) ??
          el.querySelector('input, select, textarea, [role="combobox"]');
        const value = control && !skipped(control) ? controlValue(control) : null;
        const c = el.cloneNode(true) as Element;
        c.querySelectorAll('input, select, textarea, [role="combobox"]').forEach((x) =>
          x.remove(),
        );
        if (value !== null) push(clean(c.textContent), parseCell(value));
        else push(clean(c.textContent));
        return;
      }
      case "LI": {
        if (!el.querySelector("ul, ol, table, dl, [data-export-chart]")) {
          const pair = tilePair(el);
          if (pair) push(pair[0], parseCell(pair[1]));
          else push(`• ${visibleText(el)}`.trim() === "•" ? "" : `• ${visibleText(el)}`);
          return;
        }
        break;
      }
    }
    if (!hasBlockInside(el)) {
      const pair = tilePair(el);
      if (pair) push(pair[0], parseCell(pair[1]));
      else push(visibleText(el));
      return;
    }
    const pair = tilePair(el);
    if (pair) {
      push(pair[0], parseCell(pair[1]));
      return;
    }
    for (const n of Array.from(el.childNodes)) {
      if (n.nodeType === Node.TEXT_NODE) push(clean(n.textContent));
      else if (n.nodeType === Node.ELEMENT_NODE) visit(n as Element);
    }
  };

  const h1 = root.querySelector("h1");
  if (h1 && !skipped(h1)) section = visibleText(h1);
  visit(root);
  return { rows, tables };
}

/**
 * Every exportable table of the element: "Tartalom" (everything shown, in reading order) first,
 * then one sheet per `<table>` and per chart.
 */
export function extractElementTables(root: Element, title: string): ExportTable[] {
  const { rows, tables } = walkContent(root);
  const out: ExportTable[] = [];
  if (rows.length > 0) {
    const multiSection = new Set(rows.map((r) => r[0])).size > 1;
    const hasValues = rows.some((r) => r[2] !== null && r[2] !== "");
    const headers = [
      ...(multiSection ? ["Szakasz"] : []),
      hasValues ? "Megnevezés" : "Tartalom",
      ...(hasValues ? ["Érték"] : []),
    ];
    out.push({
      title: "Tartalom",
      headers,
      rows: rows.map(([s, l, v]) => [
        ...(multiSection ? [s] : []),
        l,
        ...(hasValues ? [v] : []),
      ]),
    });
  }
  out.push(...tables);
  if (out.length === 0)
    out.push({ title: title || "Tartalom", headers: ["Tartalom"], rows: [] });
  return out;
}

/** Title of the screen: its first heading, else the document title. */
export function elementTitle(root: Element): string {
  const h = root.querySelector(HEADING);
  return (h && textOf(h)) || clean(root.ownerDocument.title) || "Export";
}

// ---------------------------------------------------------------------------------- printing

/**
 * A static copy of the element for printing: current form values written into the markup, canvases
 * turned into images, scroll boxes opened up so nothing is clipped, skipped parts removed.
 */
export function printableClone(root: Element): Element {
  const clone = root.cloneNode(true) as Element;
  const live = [root, ...Array.from(root.querySelectorAll("*"))];
  const copy = [clone, ...Array.from(clone.querySelectorAll("*"))];
  const view = root.ownerDocument.defaultView;

  live.forEach((el, i) => {
    const c = copy[i] as HTMLElement | undefined;
    if (!c) return;
    if (el instanceof HTMLInputElement && c instanceof HTMLInputElement) {
      if (el.type === "checkbox" || el.type === "radio") {
        if (el.checked) c.setAttribute("checked", "");
        else c.removeAttribute("checked");
      } else c.setAttribute("value", el.value);
    } else if (el instanceof HTMLTextAreaElement) {
      c.textContent = el.value;
    } else if (el instanceof HTMLSelectElement) {
      Array.from(c.querySelectorAll("option")).forEach((o, j) => {
        if (el.options[j]?.selected) o.setAttribute("selected", "");
        else o.removeAttribute("selected");
      });
    } else if (el instanceof HTMLCanvasElement) {
      try {
        const img = root.ownerDocument.createElement("img");
        img.src = el.toDataURL("image/png");
        img.style.width = `${el.clientWidth || el.width}px`;
        c.replaceWith(img);
        return;
      } catch {
        // tainted canvas — leave it
      }
    }
    if (view && el instanceof HTMLElement) {
      const cs = view.getComputedStyle(el);
      if (
        /(auto|scroll|hidden)/.test(cs.overflowY) &&
        el.scrollHeight > el.clientHeight + 1
      ) {
        c.style.overflow = "visible";
        c.style.maxHeight = "none";
        c.style.height = "auto";
      }
      if (cs.position === "sticky" || cs.position === "fixed")
        c.style.position = "static";
    }
  });
  clone.querySelectorAll('[data-export="skip"]').forEach((x) => x.remove());
  clone.querySelectorAll("details").forEach((d) => d.setAttribute("open", ""));
  // Inactive tab panels are not rendered at all — say which one is printed.
  clone.querySelectorAll('[role="tablist"]').forEach((list) => {
    const active = list.querySelector(
      '[role="tab"][aria-selected="true"], [role="tab"][data-state="active"]',
    );
    if (!active || list.querySelectorAll('[role="tab"]').length < 2) return;
    const note = root.ownerDocument.createElement("p");
    note.className = "rp-print-note";
    note.textContent = `Nyomtatva a(z) „${clean(active.textContent)}” fül; a többi fül külön nyomtatható.`;
    list.after(note);
  });
  return clone;
}

const PAGE_PRINT_CSS = `
  @page { size: A4 portrait; margin: 12mm; }
  html, body { background: #fff !important; height: auto !important; overflow: visible !important; }
  body { margin: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .rp-print-header { display: flex; justify-content: space-between; align-items: flex-end; gap: 16px;
    border-bottom: 1.5px solid #111; padding: 0 0 6px; margin: 0 0 12px; font: 12px system-ui, sans-serif; color: #111; }
  .rp-print-header strong { font-size: 15px; }
  .rp-print-header .meta { text-align: right; color: #555; font-size: 10px; }
  .rp-print-header img { max-height: 28px; max-width: 140px; display: block; margin-left: auto; }
  button:not([aria-expanded]):not([role="tab"]), [data-slot="button"], [data-slot="sheet-close"],
  input[type="file"], [data-export="skip"] { display: none !important; }
  [data-slot="card"], section, tr, dl > div, li { break-inside: avoid; page-break-inside: avoid; }
  thead { display: table-header-group; }
  .rp-print-note { font: italic 10px system-ui, sans-serif; color: #555; margin: 4px 0 8px; }
  a { color: inherit; text-decoration: none; }
`;

export type PrintElementOptions = {
  title: string;
  companyName?: string;
  logoUrl?: string;
};

/** The printable document for an element (exported for tests). */
export function elementPrintHtml(
  root: Element,
  opts: PrintElementOptions,
  now = new Date(),
): string {
  const doc = root.ownerDocument;
  const styles = Array.from(doc.querySelectorAll('link[rel="stylesheet"], style'))
    .map((s) => {
      if (s instanceof HTMLLinkElement)
        return `<link rel="stylesheet" href="${escapeHtml(s.href)}">`;
      return s.outerHTML;
    })
    .join("");
  const when = now.toLocaleString("hu-HU", {
    timeZone: "Europe/Budapest",
    dateStyle: "medium",
    timeStyle: "short",
  });
  const logo = opts.logoUrl ? `<img src="${escapeHtml(opts.logoUrl)}" alt="">` : "";
  const header = `<div class="rp-print-header"><strong>${escapeHtml(opts.title)}</strong><div class="meta">${logo}${
    opts.companyName ? `${escapeHtml(opts.companyName)}<br>` : ""
  }Készült: ${escapeHtml(when)}</div></div>`;
  const htmlClass = (doc.documentElement.getAttribute("class") ?? "")
    .split(/\s+/)
    .filter((c) => c && c !== "dark")
    .concat("light")
    .join(" ");
  return `<!doctype html><html lang="hu" class="${escapeHtml(htmlClass)}" style="color-scheme: light"><head><meta charset="utf-8"><base href="${escapeHtml(
    doc.baseURI,
  )}"><title>${escapeHtml(opts.title)}</title>${styles}<style>${PAGE_PRINT_CSS}</style></head><body class="bg-background text-foreground">${header}${
    printableClone(root).outerHTML
  }</body></html>`;
}

/** Prints the element from a hidden iframe after its stylesheets and images have loaded. */
export function printElement(root: Element, opts: PrintElementOptions): void {
  const iframe = document.createElement("iframe");
  iframe.setAttribute("aria-hidden", "true");
  // A real width so responsive layouts render as on a desktop page, but off screen.
  iframe.style.cssText =
    "position:fixed;left:-10000px;top:0;width:1100px;height:1400px;border:0;visibility:hidden;";
  document.body.appendChild(iframe);
  const win = iframe.contentWindow;
  const idoc = iframe.contentDocument;
  if (!win || !idoc) {
    iframe.remove();
    return;
  }
  idoc.open();
  idoc.write(elementPrintHtml(root, opts));
  idoc.close();

  const pending = [
    ...Array.from(idoc.querySelectorAll('link[rel="stylesheet"]')),
    ...Array.from(idoc.images).filter((i) => !i.complete),
  ];
  let printed = false;
  const go = () => {
    if (printed) return;
    printed = true;
    win.addEventListener("afterprint", () => setTimeout(() => iframe.remove(), 1000), {
      once: true,
    });
    win.focus();
    win.print();
    setTimeout(() => iframe.isConnected && iframe.remove(), 120_000);
  };
  if (pending.length === 0) {
    setTimeout(go, 100);
    return;
  }
  let left = pending.length;
  const done = () => {
    left -= 1;
    if (left <= 0) setTimeout(go, 100);
  };
  pending.forEach((el) => {
    el.addEventListener("load", done, { once: true });
    el.addEventListener("error", done, { once: true });
  });
  setTimeout(go, 4000);
}
