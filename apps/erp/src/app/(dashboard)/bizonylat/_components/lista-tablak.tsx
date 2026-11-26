"use client";

import { DataTable } from "@erp/ui";
import type { DataTableQuery } from "@erp/ui";
import {
  IGAZOLAS_LIST_COLUMNS,
  JOTALLAS_LIST_COLUMNS,
  SZALLITOLEVEL_LIST_COLUMNS,
  SZAMLA_LIST_COLUMNS,
  type IgazolasListItem,
  type JotallasListItem,
  type SzallitolevelListItem,
  type SzamlaListItem,
} from "@erp/bizonylat/client";

const FT = new Intl.NumberFormat("hu-HU");
const ft = (v: unknown) => (typeof v === "number" ? `${FT.format(v)} Ft` : "");

type Props<T> = { data: T[]; query: DataTableQuery; total: number };

export function SzallitolevelTabla({ data, query, total }: Props<SzallitolevelListItem>) {
  return (
    <DataTable<SzallitolevelListItem>
      tableId="bizonylat-szallitolevelek"
      data={data}
      columns={SZALLITOLEVEL_LIST_COLUMNS}
      query={query}
      total={total}
      basePath="/bizonylat/szallitolevelek"
      rowHref={(row) => `/bizonylat/szallitolevelek/${row._id}`}
      rowIssues={(row) =>
        row.archivalt ? [{ tone: "warning", message: "Archivált szállítólevél" }] : []
      }
    />
  );
}

export function IgazolasTabla({ data, query, total }: Props<IgazolasListItem>) {
  const columns = IGAZOLAS_LIST_COLUMNS.map((c) =>
    c.key === "bruttoOsszeg"
      ? { ...c, render: ft, exportValue: (r: IgazolasListItem) => r.bruttoOsszeg }
      : c,
  );
  return (
    <DataTable<IgazolasListItem>
      tableId="bizonylat-igazolasok"
      data={data}
      columns={columns}
      query={query}
      total={total}
      basePath="/bizonylat/igazolasok"
      rowHref={(row) => `/bizonylat/igazolasok/${row._id}`}
      rowIssues={(row) =>
        row.archivalt ? [{ tone: "warning", message: "Archivált igazolás" }] : []
      }
    />
  );
}

export function SzamlaTabla({ data, query, total }: Props<SzamlaListItem>) {
  const columns = SZAMLA_LIST_COLUMNS.map((c) =>
    c.key === "osszeg"
      ? { ...c, render: ft, exportValue: (r: SzamlaListItem) => r.osszeg }
      : c,
  );
  return (
    <DataTable<SzamlaListItem>
      tableId="bizonylat-szamlak"
      data={data}
      columns={columns}
      query={query}
      total={total}
      basePath="/bizonylat/szamlak"
      rowHref={(row) => `/bizonylat/szamlak/${row._id}`}
      rowIssues={(row) =>
        row.allapot === "lejart"
          ? [{ tone: "danger", message: "Lejárt számla" }]
          : row.archivalt
            ? [{ tone: "warning", message: "Archivált számla" }]
            : []
      }
    />
  );
}

export function JotallasTabla({ data, query, total }: Props<JotallasListItem>) {
  return (
    <DataTable<JotallasListItem>
      tableId="bizonylat-jotallasok"
      data={data}
      columns={JOTALLAS_LIST_COLUMNS}
      query={query}
      total={total}
      basePath="/bizonylat/jotallasok"
      rowHref={(row) => `/bizonylat/jotallasok/${row._id}`}
      rowIssues={(row) =>
        row.archivalt ? [{ tone: "warning", message: "Archivált jegy" }] : []
      }
    />
  );
}
