"use client";

import { DataTable } from "@erp/ui";
import type { DataTableQuery } from "@erp/ui";
import { SECRET_LIST_COLUMNS, type SecretListItem } from "@erp/secrets/client";

export function SecretsTable({
  data,
  query,
  total,
}: {
  data: SecretListItem[];
  query: DataTableQuery;
  total: number;
}) {
  return (
    <DataTable<SecretListItem>
      tableId="secrets-titkok"
      data={data}
      columns={SECRET_LIST_COLUMNS}
      query={query}
      total={total}
      basePath="/secrets"
      rowHref={(r) => `/secrets/${r._id}`}
      emptyMessage="Még nincs titok, vagy egyet sem osztottak meg veled."
    />
  );
}
