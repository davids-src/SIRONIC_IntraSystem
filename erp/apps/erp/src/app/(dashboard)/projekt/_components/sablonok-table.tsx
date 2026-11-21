"use client";

import { DataTable } from "@erp/ui";
import type { DataTableQuery } from "@erp/ui";
import { SABLON_LIST_COLUMNS, type SablonListItem } from "@erp/projekt/client";

export function SablonokTable({
  data,
  query,
  total,
  szerkesztheto,
}: {
  data: SablonListItem[];
  query: DataTableQuery;
  total: number;
  szerkesztheto: boolean;
}) {
  return (
    <DataTable<SablonListItem>
      tableId="projekt-sablonok"
      data={data}
      columns={SABLON_LIST_COLUMNS}
      query={query}
      total={total}
      basePath="/projekt/sablonok"
      rowHref={szerkesztheto ? (row) => `/projekt/sablonok/${row._id}` : undefined}
      emptyMessage="Nincs a szűrésnek megfelelő sablon."
    />
  );
}
