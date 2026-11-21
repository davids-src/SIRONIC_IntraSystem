import type { ColumnDef } from "@erp/ui";
import { TETEL_TIPUSOK, TETEL_TIPUS_LABELS } from "./constants";

export type TermekListItem = {
  _id: string;
  kod: string;
  tipus: string;
  nev: string;
  kategoria: string;
  egyseg: string;
  nettoAr: number;
  penznem: string;
  afaKulcs: number;
  aktiv: boolean;
  archivalt: boolean;
  /** Only present when the viewer holds `arlista:beszerzes:read` — cut by the facade otherwise. */
  utolsoBeszerzesiAr?: number;
  createdAt: Date;
};

export const TERMEK_LIST_COLUMNS: Array<ColumnDef<TermekListItem>> = [
  { key: "kod", label: "Kód", type: "string", sortable: true, searchable: true },
  { key: "nev", label: "Név", type: "string", sortable: true, searchable: true },
  {
    key: "tipus",
    label: "Típus",
    type: "enum",
    sortable: true,
    filterable: true,
    enumValues: TETEL_TIPUSOK.map((v) => ({ value: v, label: TETEL_TIPUS_LABELS[v] })),
  },
  {
    key: "kategoria",
    label: "Kategória",
    type: "string",
    sortable: true,
    filterable: true,
    filterVariant: "select",
  },
  { key: "egyseg", label: "Egység", type: "string", defaultVisible: false },
  {
    key: "nettoAr",
    label: "Nettó ár",
    type: "number",
    sortable: true,
    filterable: true,
    align: "right",
  },
  { key: "penznem", label: "Pénznem", type: "string", defaultVisible: false },
  { key: "afaKulcs", label: "ÁFA (%)", type: "number", defaultVisible: false, align: "right" },
  { key: "aktiv", label: "Aktív", type: "boolean", sortable: true, filterable: true },
  {
    key: "archivalt",
    label: "Archivált",
    type: "boolean",
    filterable: true,
    defaultVisible: false,
  },
  // Not sortable/filterable on purpose: a secret value must not be probe-able through the URL.
  {
    key: "utolsoBeszerzesiAr",
    label: "Utolsó beszerzési ár",
    type: "number",
    defaultVisible: false,
    align: "right",
    headerHint: "Titkos adat — csak beszerzési jogosultsággal látható.",
  },
  { key: "createdAt", label: "Létrehozva", type: "date", sortable: true, defaultVisible: false },
];
