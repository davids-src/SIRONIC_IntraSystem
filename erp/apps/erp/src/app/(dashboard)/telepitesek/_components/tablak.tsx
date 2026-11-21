"use client";

import { DataTable } from "@erp/ui";
import type { DataTableQuery } from "@erp/ui";
import {
  CSOMAG_LIST_COLUMNS,
  INTEGRACIO_LIST_COLUMNS,
  SABLON_LIST_COLUMNS,
  TELEPITES_LIST_COLUMNS,
  type CsomagListItem,
  type IntegracioListItem,
  type SablonListItem,
  type TelepitesListItem,
} from "@erp/deployments/client";

type P<T> = { data: T[]; query: DataTableQuery; total: number };

export function TelepitesekTable({ data, query, total }: P<TelepitesListItem>) {
  return (
    <DataTable<TelepitesListItem>
      tableId="telepitesek-lista"
      data={data}
      columns={TELEPITES_LIST_COLUMNS}
      query={query}
      total={total}
      basePath="/telepitesek"
      rowHref={(r) => `/telepitesek/${r._id}`}
    />
  );
}

export function CsomagokTable({
  data,
  query,
  total,
  szerkesztheto,
}: P<CsomagListItem> & { szerkesztheto: boolean }) {
  return (
    <DataTable<CsomagListItem>
      tableId="telepitesek-csomagok"
      data={data}
      columns={CSOMAG_LIST_COLUMNS}
      query={query}
      total={total}
      basePath="/telepitesek/csomagok"
      rowHref={szerkesztheto ? (r) => `/telepitesek/csomagok/${r._id}` : undefined}
    />
  );
}

export function SablonokTable({
  data,
  query,
  total,
  szerkesztheto,
}: P<SablonListItem> & { szerkesztheto: boolean }) {
  return (
    <DataTable<SablonListItem>
      tableId="telepitesek-sablonok"
      data={data}
      columns={SABLON_LIST_COLUMNS}
      query={query}
      total={total}
      basePath="/telepitesek/sablonok"
      rowHref={szerkesztheto ? (r) => `/telepitesek/sablonok/${r._id}` : undefined}
    />
  );
}

export function IntegraciokTable({
  data,
  query,
  total,
  szerkesztheto,
}: P<IntegracioListItem> & { szerkesztheto: boolean }) {
  return (
    <DataTable<IntegracioListItem>
      tableId="telepitesek-integraciok"
      data={data}
      columns={INTEGRACIO_LIST_COLUMNS}
      query={query}
      total={total}
      basePath="/telepitesek/integraciok"
      rowHref={szerkesztheto ? (r) => `/telepitesek/integraciok/${r._id}` : undefined}
    />
  );
}
