"use client";

import { DataTable } from "@erp/ui";
import type { DataTableQuery } from "@erp/ui";
import {
  HIBAJEGY_LIST_COLUMNS,
  KARBANTARTAS_LIST_COLUMNS,
  MUNKALAP_LIST_COLUMNS,
  type HibajegyListItem,
  type KarbantartasListItem,
  type MunkalapListItem,
} from "@erp/szerviz/client";

type Props<T> = { data: T[]; query: DataTableQuery; total: number };

const datum = (v: unknown) =>
  typeof v === "string" ? new Date(v).toLocaleDateString("hu-HU") : "";

export function HibajegyTabla({ data, query, total }: Props<HibajegyListItem>) {
  const columns = HIBAJEGY_LIST_COLUMNS.map((c) =>
    c.key === "createdAt" ? { ...c, render: datum } : c,
  );
  return (
    <DataTable<HibajegyListItem>
      tableId="szerviz-hibajegyek"
      data={data}
      columns={columns}
      query={query}
      total={total}
      basePath="/szerviz/hibajegyek"
      rowHref={(row) => `/szerviz/hibajegyek/${row._id}`}
      rowIssues={(row) =>
        row.archivalt
          ? [{ tone: "warning", message: "Archivált hibajegy" }]
          : row.prioritas === "kritikus" &&
              row.allapot !== "lezart" &&
              row.allapot !== "megoldva"
            ? [{ tone: "danger", message: "Kritikus prioritás" }]
            : []
      }
    />
  );
}

export function MunkalapTabla({ data, query, total }: Props<MunkalapListItem>) {
  const columns = MUNKALAP_LIST_COLUMNS.map((c) =>
    c.key === "munkaDatum" ? { ...c, render: datum } : c,
  );
  return (
    <DataTable<MunkalapListItem>
      tableId="szerviz-munkalapok"
      data={data}
      columns={columns}
      query={query}
      total={total}
      basePath="/szerviz/munkalapok"
      rowHref={(row) => `/szerviz/munkalapok/${row._id}`}
      rowIssues={(row) =>
        row.archivalt
          ? [{ tone: "warning", message: "Archivált munkalap" }]
          : row.allapot === "lezart" && !row.keszletKiadva
            ? [{ tone: "danger", message: "A készletkiadás még nem rögzített" }]
            : []
      }
    />
  );
}

export function KarbantartasTabla({ data, query, total }: Props<KarbantartasListItem>) {
  return (
    <DataTable<KarbantartasListItem>
      tableId="szerviz-karbantartas"
      data={data}
      columns={KARBANTARTAS_LIST_COLUMNS}
      query={query}
      total={total}
      basePath="/szerviz/karbantartas"
      rowHref={(row) => `/szerviz/karbantartas/${row._id}`}
      rowIssues={(row) =>
        row.archivalt
          ? [{ tone: "warning", message: "Archivált terv" }]
          : row.allapot === "lejart"
            ? [{ tone: "danger", message: "Lejárt — hibajegyet kell generálni" }]
            : row.allapot === "hamarosan"
              ? [{ tone: "warning", message: "Hamarosan esedékes" }]
              : []
      }
    />
  );
}
