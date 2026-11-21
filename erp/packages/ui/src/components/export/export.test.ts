import { createElement as h } from "react";
import { describe, expect, it } from "vitest";
import type { ColumnDef } from "../data-table/types";
import {
  cellText,
  exportCellValue,
  exportFileName,
  exportRowRecords,
  exportableColumns,
  nodeText,
} from "./export-values";
import {
  elementPrintHtml,
  extractElementTables,
  parseCell,
  printableClone,
} from "./page-export";
import { printDocumentHtml, tableHtml } from "./print";
import { buildXlsx, sheetName } from "./xlsx";

type Row = {
  nev: string;
  allapot: string;
  datum: string;
  ora: number;
  aktiv: boolean;
  cimkek: string[];
  kep?: string;
  szamitott?: undefined;
};

const row: Row = {
  nev: "JCB 3CX",
  allapot: "szerviz",
  datum: "2026-11-20",
  ora: 1234.5,
  aktiv: true,
  cimkek: ["a", "b"],
};

const cols: Array<ColumnDef<Row>> = [
  { key: "nev", label: "Név" },
  {
    key: "allapot",
    label: "Állapot",
    type: "enum",
    enumValues: [{ value: "szerviz", label: "Szervizben" }],
  },
  { key: "datum", label: "Dátum", type: "date", render: () => "2026. 11. 20." },
  { key: "ora", label: "Üzemóra", type: "number" },
  { key: "aktiv", label: "Aktív", type: "boolean" },
  { key: "cimkek", label: "Címkék" },
  { key: "kep", label: "", type: "image" },
  {
    key: "szamitott",
    label: "Számított",
    render: (_, r) => h("div", null, h("span", null, r.nev), h("p", null, "második sor")),
  },
];

describe("exportCellValue", () => {
  it("uses typed raw values, enum labels and rendered text", () => {
    const get = (k: string) =>
      exportCellValue(
        row,
        cols.find((c) => c.key === k)!,
      );
    expect(get("nev")).toBe("JCB 3CX");
    expect(get("allapot")).toBe("Szervizben");
    expect(get("datum")).toEqual(new Date("2026-11-20T00:00:00Z"));
    expect(get("ora")).toBe(1234.5);
    expect(get("aktiv")).toBe("Igen");
    expect(get("cimkek")).toBe("a, b");
    expect(get("szamitott")).toBe("JCB 3CX · második sor");
  });

  it("prefers exportValue and treats a dash as empty", () => {
    expect(exportCellValue(row, { key: "nev", label: "x", exportValue: () => 42 })).toBe(
      42,
    );
    expect(
      exportCellValue(row, { key: "szamitott", label: "x", render: () => "—" }),
    ).toBeNull();
  });

  it("leaves image and non-exportable columns out", () => {
    const keys = exportableColumns([
      ...cols,
      { key: "x", label: "X", exportable: false },
    ]).map((c) => c.key);
    expect(keys).not.toContain("kep");
    expect(keys).not.toContain("x");
    expect(exportRowRecords([row], cols)[0]).toMatchObject({ allapot: "Szervizben" });
  });
});

describe("nodeText", () => {
  it("skips aria-hidden icons and joins blocks", () => {
    const node = h(
      "div",
      null,
      h("svg", { "aria-hidden": true }, "icon"),
      h("span", null, "Lejárt"),
      " · 2 db",
    );
    expect(nodeText(node)).toBe("Lejárt · 2 db");
  });
});

describe("formatting", () => {
  it("prints days without time and moments in Budapest time", () => {
    expect(cellText(new Date("2026-11-20T00:00:00Z"))).toBe("2026. 11. 20.");
    expect(cellText(new Date("2026-11-20T09:30:00Z"))).toContain("10:30");
    expect(cellText(1234.5)).toBe(
      "1234,5".replace("1234", (1234).toLocaleString("hu-HU")),
    );
  });

  it("builds safe file and sheet names", () => {
    expect(
      exportFileName("Gépek / lista", "xlsx", new Date("2026-11-20T10:00:00Z")),
    ).toBe("Gépek lista_2026-11-20.xlsx");
    const used = new Set<string>();
    expect(sheetName("Adatok", used)).toBe("Adatok");
    expect(sheetName("adatok", used)).toBe("adatok (2)");
    expect(sheetName("a".repeat(40), used)).toHaveLength(31);
  });

  it("parses Hungarian numbers only when the whole cell is a number", () => {
    expect(parseCell("1 234,5")).toBe(1234.5);
    expect(parseCell("42")).toBe(42);
    expect(parseCell("0630123456")).toBe("0630123456");
    expect(parseCell("12 db")).toBe("12 db");
    expect(parseCell("")).toBeNull();
  });
});

describe("print documents", () => {
  it("escapes content and repeats the header row", () => {
    const html = printDocumentHtml({
      title: "Gépek <b>",
      notes: ["Keresés: JCB"],
      bodyHtml: tableHtml({ title: "Gépek", headers: ["Név"], rows: [["<x>"], [12]] }),
      landscape: true,
      companyName: "SIRONIC",
    });
    expect(html).toContain("Gépek &lt;b&gt;");
    expect(html).toContain("&lt;x&gt;");
    expect(html).toContain("<thead>");
    expect(html).toContain("landscape");
    expect(html).toContain("Keresés: JCB");
    expect(html).toContain('class="num"');
  });
});

describe("screen export", () => {
  const mount = (html: string) => {
    document.body.innerHTML = html;
    return document.body.firstElementChild!;
  };

  it("collects dl pairs, labelled fields and tables, skipping marked parts", () => {
    const root = mount(`
      <main>
        <h1>JCB 3CX</h1>
        <section>
          <dl><dt>Rendszám</dt><dd>ABC-123</dd><dt>Üzemóra</dt><dd>1 234</dd></dl>
          <label for="m">Megjegyzés</label><textarea id="m"></textarea>
          <label>Aktív <input type="checkbox" checked></label>
          <div data-export="skip"><dl><dt>Titok</dt><dd>x</dd></dl></div>
          <span class="sr-only">csak felolvasónak</span>
          <p style="display:none">rejtett</p>
          <button>Szerkesztés</button>
        </section>
      </main>`);
    (root.querySelector("textarea") as HTMLTextAreaElement).value = "gépelt szöveg";
    const [tartalom] = extractElementTables(root, "JCB 3CX");
    expect(tartalom!.title).toBe("Tartalom");
    expect(tartalom!.headers).toEqual(["Megnevezés", "Érték"]);
    expect(tartalom!.rows).toEqual([
      ["Rendszám", "ABC-123"],
      ["Üzemóra", 1234],
      ["Megjegyzés", "gépelt szöveg"],
      ["Aktív", "Igen"],
    ]);
  });

  it("reads a detail page in order: sections, badges, timeline, tables", () => {
    const root = mount(`
      <main>
        <h1>Szerződés RSZ-001-1-2026</h1>
        <div><span>Állapot:</span><span data-slot="badge">Véleményezés alatt</span></div>
        <section>
          <h2>Folyamat</h2>
          <ol>
            <li><span>Megírás</span><span>Kovács Diána</span><span data-slot="badge">Kész</span></li>
            <li><span>Véleményezés</span><span>Finta Tünde</span></li>
          </ol>
        </section>
        <section>
          <h2>Szervizek</h2>
          <table><thead><tr><th></th><th>Dátum</th><th>Leírás</th></tr></thead>
          <tbody><tr><td></td><td>2026.11.01.</td><td>Olajcsere</td></tr></tbody></table>
        </section>
        <p>Megjegyzés szövege.</p>
      </main>`);
    const [tartalom, szervizek] = extractElementTables(root, "x");
    expect(tartalom!.headers).toEqual(["Szakasz", "Megnevezés", "Érték"]);
    expect(tartalom!.rows).toEqual([
      ["Szerződés RSZ-001-1-2026", "Állapot", "Véleményezés alatt"],
      ["Folyamat", "• Megírás · Kovács Diána · Kész", null],
      ["Folyamat", "• Véleményezés · Finta Tünde", null],
      ["Szervizek", "Táblázat: Szervizek", "1 sor, külön munkalapon"],
      ["Szervizek", "Megjegyzés szövege.", null],
    ]);
    expect(szervizek!.title).toBe("Szervizek");
    // The empty checkbox column is dropped.
    expect(szervizek!.headers).toEqual(["Dátum", "Leírás"]);
    expect(szervizek!.rows).toEqual([["2026.11.01.", "Olajcsere"]]);
  });

  it("turns a dashboard into tiles, markers and chart sheets", () => {
    const chart = JSON.stringify({
      title: "Tankolás naponta",
      headers: ["Nap", "Liter"],
      rows: [
        ["2026-11-01", 120],
        ["2026-11-02", 80],
      ],
    });
    const root = mount(`
      <div>
        <h1>Áttekintés</h1>
        <div class="grid">
          <div><div>7</div><div>Nyitott szervizjegy</div></div>
          <a href="/x" data-export-label="Lejáró dokumentum" data-export-value="3">
            <div>3</div><div>Lejáró dokumentum</div><div>30 napon belül</div>
          </a>
        </div>
        <h2>Gépüzem</h2>
        <figure><figcaption>Tankolás naponta</figcaption>
          <div data-export-chart='${chart}'><svg><text>120</text></svg></div>
        </figure>
        <ul><li>JCB 3CX — szerviz esedékes</li></ul>
      </div>`);
    const [tartalom, grafikon] = extractElementTables(root, "Áttekintés");
    expect(tartalom!.rows).toEqual([
      ["Áttekintés", "Nyitott szervizjegy", 7],
      ["Áttekintés", "Lejáró dokumentum", 3],
      ["Gépüzem", "Tankolás naponta", null],
      ["Gépüzem", "Diagram: Tankolás naponta", "adatai külön munkalapon"],
      ["Gépüzem", "• JCB 3CX — szerviz esedékes", null],
    ]);
    expect(grafikon).toEqual({
      title: "Tankolás naponta",
      headers: ["Nap", "Liter"],
      rows: [
        ["2026-11-01", 120],
        ["2026-11-02", 80],
      ],
    });
  });

  it("uses a single text column when nothing has a value", () => {
    const root = mount(`<div><h1>Súgó</h1><p>Első bekezdés.</p><p>Második.</p></div>`);
    const [t] = extractElementTables(root, "Súgó");
    expect(t!.headers).toEqual(["Tartalom"]);
    expect(t!.rows).toEqual([["Első bekezdés."], ["Második."]]);
  });

  it("prints a static copy with current values and no skipped parts", () => {
    const root = mount(
      `<main><h1>Gép</h1><input id="i"><div data-export="skip">gomb</div></main>`,
    );
    (root.querySelector("#i") as HTMLInputElement).value = "beírt";
    const clone = printableClone(root);
    expect(clone.querySelector("#i")!.getAttribute("value")).toBe("beírt");
    expect(clone.textContent).not.toContain("gomb");
    const html = elementPrintHtml(root, { title: "Gép", companyName: "SIRONIC" });
    expect(html).toContain("rp-print-header");
    expect(html).toContain("SIRONIC");
    expect(html).not.toContain('class="dark');
  });

  it("opens collapsed details and notes the printed tab", () => {
    const root =
      mount(`<main><details><summary>Több</summary><p>rejtett rész</p></details>
      <div role="tablist"><button role="tab" aria-selected="true">Adatok</button>
      <button role="tab" aria-selected="false">Napló</button></div></main>`);
    const clone = printableClone(root);
    expect(clone.querySelector("details")!.hasAttribute("open")).toBe(true);
    expect(clone.querySelector(".rp-print-note")!.textContent).toContain("„Adatok”");
  });
});

describe("buildXlsx", () => {
  it("writes a workbook with a header, notes and typed cells", async () => {
    const buf = await buildXlsx([
      {
        title: "Gépek",
        headers: ["Név", "Dátum", "Óra"],
        rows: [["JCB", new Date("2026-11-20T00:00:00Z"), 12.5]],
        notes: ["Összesen: 1 sor"],
      },
    ]);
    const { default: Excel } = await import("exceljs");
    const wb = new Excel.Workbook();
    await wb.xlsx.load(buf);
    const ws = wb.getWorksheet("Gépek")!;
    expect(ws.getCell("A1").value).toBe("Összesen: 1 sor");
    expect(ws.getCell("A3").value).toBe("Név");
    expect(ws.getCell("A3").font?.bold).toBe(true);
    expect(ws.getCell("C4").value).toBe(12.5);
    expect(ws.getCell("B4").value).toEqual(new Date("2026-11-20T00:00:00Z"));
    expect(ws.autoFilter).toBeTruthy();
  });
});
