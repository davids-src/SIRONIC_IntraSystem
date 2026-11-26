"use client";

import { DataTable } from "@erp/ui";
import type { DataTableQuery } from "@erp/ui";
import { ESZKOZ_LIST_COLUMNS, type EszkozListItem } from "@erp/eszkoz/client";

export function EszkozokTable({
  data,
  query,
  total,
}: {
  data: EszkozListItem[];
  query: DataTableQuery;
  total: number;
}) {
  return (
    <DataTable<EszkozListItem>
      tableId="eszkoz-eszkozok"
      data={data}
      columns={ESZKOZ_LIST_COLUMNS}
      query={query}
      total={total}
      basePath="/eszkoz"
      rowHref={(row) => `/eszkoz/${row._id}`}
    />
  );
}
