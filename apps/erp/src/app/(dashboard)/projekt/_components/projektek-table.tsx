"use client";

import { DataTable } from "@erp/ui";
import type { DataTableQuery } from "@erp/ui";
import { PROJEKT_LIST_COLUMNS, type ProjektListItem } from "@erp/projekt/client";

export function ProjektekTable({
  data,
  query,
  total,
}: {
  data: ProjektListItem[];
  query: DataTableQuery;
  total: number;
}) {
  return (
    <DataTable<ProjektListItem>
      tableId="projekt-projektek"
      data={data}
      columns={PROJEKT_LIST_COLUMNS}
      query={query}
      total={total}
      basePath="/projekt"
      rowHref={(row) => `/projekt/${row._id}`}
      emptyMessage="Nincs a szűrésnek megfelelő projekt."
    />
  );
}
