"use client";

import { useMemo } from "react";
import { DataTable } from "@erp/ui";
import type { DataTableQuery } from "@erp/ui";
import { KESZLET_LIST_COLUMNS, type KeszletListItem } from "@erp/keszlet/client";
import { FT } from "../../_components/run";

export function KeszletTable({
  data,
  query,
  total,
  helyek,
  mutatErtek,
}: {
  data: KeszletListItem[];
  query: DataTableQuery;
  total: number;
  helyek: Array<{ value: string; label: string }>;
  mutatErtek: boolean;
}) {
  const columns = useMemo(
    () =>
      KESZLET_LIST_COLUMNS.filter((c) => mutatErtek || c.key !== "ertek").map((c) => {
        if (c.key === "raktarhelyKod") return { ...c, enumValues: helyek };
        if (c.key === "ertek")
          return {
            ...c,
            render: (v: unknown) =>
              typeof v === "number" ? `${FT.format(Math.round(v))} Ft` : "",
          };
        return c;
      }),
    [helyek, mutatErtek],
  );
  return (
    <DataTable<KeszletListItem>
      tableId="keszlet-lista"
      data={data}
      columns={columns}
      query={query}
      total={total}
      basePath="/keszlet/lista"
      rowHref={(row) => `/keszlet/lista/${row._id}`}
      rowIssues={(row) =>
        row.minimum !== undefined && row.keszlet <= row.minimum
          ? [{ tone: "danger", message: "A minimum készletszint alatt" }]
          : []
      }
    />
  );
}
