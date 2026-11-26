"use client";

import { DataTable } from "@erp/ui";
import type { DataTableQuery } from "@erp/ui";
import { LELTAR_LIST_COLUMNS, type LeltarListItem } from "@erp/keszlet/client";

export function LeltarLista({
  data,
  query,
  total,
}: {
  data: LeltarListItem[];
  query: DataTableQuery;
  total: number;
}) {
  return (
    <DataTable<LeltarListItem>
      tableId="keszlet-leltar"
      data={data}
      columns={LELTAR_LIST_COLUMNS}
      query={query}
      total={total}
      basePath="/keszlet/leltar"
      rowHref={(row) => `/keszlet/leltar/${row._id}`}
    />
  );
}
