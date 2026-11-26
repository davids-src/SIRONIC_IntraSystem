"use client";

import { DataTable } from "@erp/ui";
import type { DataTableQuery } from "@erp/ui";
import { KOLTSEG_LIST_COLUMNS, type KoltsegListItem } from "@erp/projekt/client";

export function KoltsegekTable({
  data,
  query,
  total,
  szerkesztheto,
}: {
  data: KoltsegListItem[];
  query: DataTableQuery;
  total: number;
  szerkesztheto: boolean;
}) {
  return (
    <DataTable<KoltsegListItem>
      tableId="projekt-koltsegek"
      data={data}
      columns={KOLTSEG_LIST_COLUMNS}
      query={query}
      total={total}
      basePath="/projekt/koltsegek"
      rowHref={szerkesztheto ? (row) => `/projekt/koltsegek/${row._id}` : undefined}
      emptyMessage="Nincs a szűrésnek megfelelő költség."
    />
  );
}
