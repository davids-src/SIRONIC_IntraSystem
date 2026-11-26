"use client";

import { DataTable } from "@erp/ui";
import type { DataTableQuery } from "@erp/ui";
import { PARTNER_LIST_COLUMNS, type PartnerListItem } from "@erp/partner/client";

export function PartnerTable({
  data,
  query,
  total,
}: {
  data: PartnerListItem[];
  query: DataTableQuery;
  total: number;
}) {
  return (
    <DataTable<PartnerListItem>
      tableId="partner-lista"
      data={data}
      columns={PARTNER_LIST_COLUMNS}
      query={query}
      total={total}
      basePath="/partner"
      rowHref={(row) => `/partner/${row._id}`}
      emptyMessage="Nincs a szűrésnek megfelelő partner."
    />
  );
}
