"use client";

import { useMemo } from "react";
import { DataTable } from "@erp/ui";
import type { DataTableQuery } from "@erp/ui";
import { TERMEK_LIST_COLUMNS, type TermekListItem } from "@erp/arlista/client";

const FT = new Intl.NumberFormat("hu-HU");

export function TermekekTable({
  data,
  query,
  total,
  kategoriak,
}: {
  data: TermekListItem[];
  query: DataTableQuery;
  total: number;
  kategoriak: Array<{ value: string; label: string }>;
}) {
  const columns = useMemo(
    () =>
      TERMEK_LIST_COLUMNS.map((c) => {
        if (c.key === "kategoria") return { ...c, enumValues: kategoriak };
        if (c.key === "nettoAr" || c.key === "utolsoBeszerzesiAr") {
          return {
            ...c,
            render: (v: unknown) => (typeof v === "number" ? `${FT.format(v)} Ft` : ""),
            exportValue: (row: TermekListItem) => row[c.key as "nettoAr"],
          };
        }
        return c;
      }),
    [kategoriak],
  );
  return (
    <DataTable<TermekListItem>
      tableId="arlista-termekek"
      data={data}
      columns={columns}
      query={query}
      total={total}
      basePath="/arlista/termekek"
      rowHref={(row) => `/arlista/termekek/${row._id}`}
      rowIssues={(row) =>
        row.archivalt ? [{ tone: "warning", message: "Archivált tétel" }] : []
      }
    />
  );
}
