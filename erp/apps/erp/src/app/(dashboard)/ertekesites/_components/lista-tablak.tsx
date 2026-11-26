"use client";

import { DataTable } from "@erp/ui";
import type { DataTableQuery } from "@erp/ui";
import {
  AJANLAT_LIST_COLUMNS,
  MEGRENDELO_LIST_COLUMNS,
  SZERZODES_LIST_COLUMNS,
  type AjanlatListItem,
  type MegrendeloListItem,
  type SzerzodesListItem,
} from "@erp/ertekesites/client";

const FT = new Intl.NumberFormat("hu-HU");
const ft = (v: unknown) => (typeof v === "number" ? `${FT.format(v)} Ft` : "");

type Props<T> = { data: T[]; query: DataTableQuery; total: number };

export function AjanlatTabla({ data, query, total }: Props<AjanlatListItem>) {
  const columns = AJANLAT_LIST_COLUMNS.map((c) =>
    c.key === "bruttoOsszeg"
      ? { ...c, render: ft, exportValue: (r: AjanlatListItem) => r.bruttoOsszeg }
      : c,
  );
  return (
    <DataTable<AjanlatListItem>
      tableId="ertekesites-ajanlatok"
      data={data}
      columns={columns}
      query={query}
      total={total}
      basePath="/ertekesites/ajanlatok"
      rowHref={(row) => `/ertekesites/ajanlatok/${row._id}`}
      rowIssues={(row) =>
        row.archivalt ? [{ tone: "warning", message: "Archivált ajánlat" }] : []
      }
    />
  );
}

export function SzerzodesTabla({ data, query, total }: Props<SzerzodesListItem>) {
  return (
    <DataTable<SzerzodesListItem>
      tableId="ertekesites-szerzodesek"
      data={data}
      columns={SZERZODES_LIST_COLUMNS}
      query={query}
      total={total}
      basePath="/ertekesites/szerzodesek"
      rowHref={(row) => `/ertekesites/szerzodesek/${row._id}`}
    />
  );
}

export function MegrendeloTabla({ data, query, total }: Props<MegrendeloListItem>) {
  const columns = MEGRENDELO_LIST_COLUMNS.map((c) =>
    c.key === "bruttoOsszeg"
      ? { ...c, render: ft, exportValue: (r: MegrendeloListItem) => r.bruttoOsszeg }
      : c,
  );
  return (
    <DataTable<MegrendeloListItem>
      tableId="ertekesites-megrendelok"
      data={data}
      columns={columns}
      query={query}
      total={total}
      basePath="/ertekesites/megrendelok"
      rowHref={(row) => `/ertekesites/megrendelok/${row._id}`}
      rowIssues={(row) =>
        row.archivalt ? [{ tone: "warning", message: "Archivált megrendelőlap" }] : []
      }
    />
  );
}
