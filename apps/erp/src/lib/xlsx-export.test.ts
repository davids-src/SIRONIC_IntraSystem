import { describe, expect, it, vi } from "vitest";
import ExcelJS from "exceljs";

vi.mock("@erp/auth", () => ({ getCurrentUser: vi.fn() }));
const { exportQuery, xlsxFajl } = await import("./xlsx-export");

describe("xlsxFajl", () => {
  it("writes a header row and Budapest wall-clock times", async () => {
    const fajl = await xlsxFajl([
      {
        nev: "Tankolások",
        sorok: [{ nev: "Kovács", liter: 12.5, ido: "2026-07-01T06:30:00.000Z" }],
        oszlopok: [
          { fejlec: "Név", ertek: (s: { nev: string }) => s.nev },
          { fejlec: "Liter", ertek: (s: { liter: number }) => s.liter, formatum: "0.00" },
          { fejlec: "Idő", ertek: (s: { ido: string }) => new Date(s.ido) },
          { fejlec: "Üres", ertek: () => undefined },
        ],
      },
    ]);
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(fajl.buffer as ArrayBuffer);
    const ws = wb.getWorksheet("Tankolások")!;
    expect(ws.getRow(1).values).toEqual([undefined, "Név", "Liter", "Idő", "Üres"]);
    expect(ws.getCell("A2").value).toBe("Kovács");
    expect(ws.getCell("B2").value).toBe(12.5);
    // 06:30 UTC in July is 08:30 in Budapest (CEST).
    expect((ws.getCell("C2").value as Date).toISOString()).toBe(
      "2026-07-01T08:30:00.000Z",
    );
    expect(ws.getCell("D2").value).toBeNull();
  });
});

describe("exportQuery", () => {
  it("reads repeated filter keys as a list, like the page does", () => {
    const { query } = exportQuery(
      new Request(
        "http://x/api?f.gepeszNev=A&f.gepeszNev=B&f.nap=2026-11-01&f.nap=&sort=-datum",
      ),
    );
    expect(query.filters?.gepeszNev).toEqual(["A", "B"]);
    expect(query.sort).toBe("-datum");
  });
});
