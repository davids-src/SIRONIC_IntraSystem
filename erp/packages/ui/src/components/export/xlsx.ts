import type { ExportCell, ExportTable } from "./export-values";

/** Excel has no time zones: a moment is written as Budapest wall-clock time; a day stays as is. */
function excelDate(d: Date): { value: Date; napOnly: boolean } {
  const napOnly =
    d.getUTCHours() === 0 && d.getUTCMinutes() === 0 && d.getUTCSeconds() === 0;
  if (napOnly) return { value: d, napOnly };
  const p = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Budapest",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(d);
  const n = (t: string) => Number(p.find((x) => x.type === t)?.value ?? 0);
  return {
    value: new Date(
      Date.UTC(n("year"), n("month") - 1, n("day"), n("hour"), n("minute"), n("second")),
    ),
    napOnly,
  };
}

/** Worksheet name: max 31 characters, no `[]:*?/\`, unique in the workbook. */
export function sheetName(title: string, used: Set<string>): string {
  const base = (title.replace(/[[\]:*?/\\]+/g, " ").trim() || "Munkalap").slice(0, 31);
  let name = base;
  for (let i = 2; used.has(name.toLowerCase()); i++) {
    const suffix = ` (${i})`;
    name = `${base.slice(0, 31 - suffix.length)}${suffix}`;
  }
  used.add(name.toLowerCase());
  return name;
}

function cellWidth(v: ExportCell): number {
  if (v === null) return 0;
  if (v instanceof Date) return 16;
  return Math.max(
    ...String(v)
      .split("\n")
      .map((l) => l.length),
  );
}

/**
 * One workbook from one or more tables: a sheet each, bold frozen header with autofilter, column
 * widths from the content, dates as real Excel dates. exceljs is loaded on demand (its browser
 * build), so pages that never export do not download it.
 */
export async function buildXlsx(tables: ExportTable[]): Promise<ArrayBuffer> {
  const mod = await import("exceljs");
  const Excel = (mod as unknown as { default?: typeof mod }).default ?? mod;
  const wb = new Excel.Workbook();
  wb.creator = "SIRONIC";
  wb.created = new Date();
  const used = new Set<string>();

  for (const t of tables) {
    const ws = wb.addWorksheet(sheetName(t.title, used), {
      views: [
        { state: "frozen", ySplit: (t.notes?.length ? t.notes.length + 1 : 0) + 1 },
      ],
    });
    for (const note of t.notes ?? []) ws.addRow([note]).font = { italic: true, size: 9 };
    if (t.notes?.length) ws.addRow([]);
    const headerRow = ws.addRow(t.headers);
    headerRow.font = { bold: true };
    headerRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFEFEFEF" } };

    const widths = t.headers.map((h) => h.length);
    for (const r of t.rows) {
      const row = ws.addRow(
        r.map((v) => (v instanceof Date ? excelDate(v).value : v === null ? null : v)),
      );
      r.forEach((v, i) => {
        widths[i] = Math.max(widths[i] ?? 0, cellWidth(v));
        if (v instanceof Date) {
          row.getCell(i + 1).numFmt = excelDate(v).napOnly
            ? "yyyy.mm.dd"
            : "yyyy.mm.dd hh:mm";
        } else if (typeof v === "string" && v.includes("\n")) {
          row.getCell(i + 1).alignment = { wrapText: true, vertical: "top" };
        }
      });
    }
    widths.forEach((w, i) => {
      ws.getColumn(i + 1).width = Math.min(60, Math.max(8, w + 2));
    });
    if (t.headers.length > 0) {
      ws.autoFilter = {
        from: { row: headerRow.number, column: 1 },
        to: { row: headerRow.number, column: t.headers.length },
      };
    }
  }
  return (await wb.xlsx.writeBuffer()) as ArrayBuffer;
}

/** Hands a file to the browser's download. */
export function downloadFile(data: BlobPart, fileName: string, type: string): void {
  const url = URL.createObjectURL(new Blob([data], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

export const XLSX_MIME =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
