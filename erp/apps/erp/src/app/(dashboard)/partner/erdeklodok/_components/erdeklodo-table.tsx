"use client";

import { DataTable } from "@erp/ui";
import type { DataTableQuery } from "@erp/ui";
import { ERDEKLODO_LIST_COLUMNS, type ErdeklodoListItem } from "@erp/partner/client";

export function ErdeklodoTable({
  data,
  query,
  total,
}: {
  data: ErdeklodoListItem[];
  query: DataTableQuery;
  total: number;
}) {
  return (
    <DataTable<ErdeklodoListItem>
      tableId="partner-erdeklodok"
      data={data}
      columns={ERDEKLODO_LIST_COLUMNS}
      query={query}
      total={total}
      basePath="/partner/erdeklodok"
      rowHref={(row) => `/partner/erdeklodok/${row._id}`}
      emptyMessage="Nincs a szűrésnek megfelelő érdeklődő."
    />
  );
}
