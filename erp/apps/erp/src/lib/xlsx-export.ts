import { NextResponse } from "next/server";
import { getCurrentUser } from "@erp/auth";
import { parseDataTableQuery, type DataTableQuery } from "@erp/ui";

/**
 * Excel downloads of the read-only reports (tankolások, gépüzemnapló, munkaidő bejelentkezések —
 * client request 2026-11-19). The routes take the list page's own URL (`f.*` filters, search,
 * sort), so the file holds exactly what the table shows — every page of it, not just the visible
 * one.
 */

export type XlsxOszlop<T> = {
  fejlec: string;
  ertek: (sor: T) => string | number | Date | null | undefined;
  /** Character width; default 16. */
  szelesseg?: number;
  /** Excel number format, e.g. `'0.00'` or `'yyyy-mm-dd hh:mm'`. */
  formatum?: string;
};

export type XlsxLap<T = never> = {
  nev: string;
  oszlopok: Array<XlsxOszlop<T>>;
  sorok: T[];
};

type AuthUser = NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>;

/** Excel has no time zones: a Date is written as Budapest wall-clock time. */
function budapestIdo(d: Date): Date {
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
  return new Date(
    Date.UTC(n("year"), n("month") - 1, n("day"), n("hour"), n("minute"), n("second")),
  );
}

/** ISO timestamp → Date for a date-time cell (`undefined` stays empty). */
export const idopont = (iso?: string): Date | undefined =>
  iso ? new Date(iso) : undefined;

// Each sheet has its own row type; the column accessors are only ever called with that sheet's rows.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function xlsxFajl(lapok: Array<XlsxLap<any>>): Promise<Uint8Array> {
  // Loaded on demand — only the export routes need exceljs.
  const { default: Excel } = await import("exceljs");
  const wb = new Excel.Workbook();
  wb.creator = "SIRONIC";
  wb.created = new Date();
  for (const lap of lapok) {
    const ws = wb.addWorksheet(lap.nev.slice(0, 31), {
      views: [{ state: "frozen", ySplit: 1 }],
    });
    ws.columns = lap.oszlopok.map((o) => ({
      header: o.fejlec,
      width: o.szelesseg ?? 16,
      style: o.formatum ? { numFmt: o.formatum } : undefined,
    }));
    ws.getRow(1).font = { bold: true };
    for (const sor of lap.sorok) {
      ws.addRow(
        lap.oszlopok.map((o) => {
          const v = o.ertek(sor);
          if (v instanceof Date) return budapestIdo(v);
          return v ?? null;
        }),
      );
    }
    if (lap.sorok.length > 0) {
      ws.autoFilter = {
        from: { row: 1, column: 1 },
        to: { row: 1, column: lap.oszlopok.length },
      };
    }
  }
  const buf = await wb.xlsx.writeBuffer();
  return new Uint8Array(buf as ArrayBuffer);
}

/** `tankolasok-2026-11-19.xlsx` */
export function xlsxValasz(alapNev: string, fajl: Uint8Array): NextResponse {
  const nap = new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Budapest" });
  return new NextResponse(fajl as unknown as BodyInit, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${alapNev}-${nap}.xlsx"`,
      "Cache-Control": "no-store",
    },
  });
}

/** The list page's URL state, read from the export request's query string. */
export function exportQuery(request: Request): {
  sp: Record<string, string | string[]>;
  query: DataTableQuery;
} {
  const sp: Record<string, string | string[]> = {};
  new URL(request.url).searchParams.forEach((v, k) => {
    const prev = sp[k];
    sp[k] = prev === undefined ? v : Array.isArray(prev) ? [...prev, v] : [prev, v];
  });
  return { sp, query: parseDataTableQuery(sp) };
}

/** Route-handler gate: the same key as the list page; 401/403 instead of a redirect. */
export async function exportJogosultsag(
  key: string,
): Promise<{ user: AuthUser } | { valasz: NextResponse }> {
  const user = await getCurrentUser();
  if (!user)
    return {
      valasz: NextResponse.json({ error: "Bejelentkezés szükséges" }, { status: 401 }),
    };
  if (!user.permissions.includes(key)) {
    return {
      valasz: NextResponse.json({ error: "Nincs jogosultságod" }, { status: 403 }),
    };
  }
  return { user };
}
