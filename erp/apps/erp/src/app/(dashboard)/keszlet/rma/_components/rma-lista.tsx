"use client";

import { DataTable } from "@erp/ui";
import type { DataTableQuery } from "@erp/ui";
import { RMA_LIST_COLUMNS, type RmaListItem } from "@erp/keszlet/client";

export function RmaLista({
  data,
  query,
  total,
}: {
  data: RmaListItem[];
  query: DataTableQuery;
  total: number;
}) {
  return (
    <DataTable<RmaListItem>
      tableId="keszlet-rma"
      data={data}
      columns={RMA_LIST_COLUMNS}
      query={query}
      total={total}
      basePath="/keszlet/rma"
      rowHref={(row) => `/keszlet/rma/${row._id}`}
    />
  );
}
