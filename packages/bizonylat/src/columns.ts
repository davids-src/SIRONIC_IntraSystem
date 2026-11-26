import type { ColumnDef } from "@erp/ui";
import {
  IGAZOLAS_ALLAPOTOK,
  IGAZOLAS_ALLAPOT_LABELS,
  IGAZOLAS_ALLAPOT_TONES,
  JOTALLAS_ALLAPOTOK,
  JOTALLAS_ALLAPOT_LABELS,
  JOTALLAS_ALLAPOT_TONES,
  SZALLITOLEVEL_ALLAPOTOK,
  SZALLITOLEVEL_ALLAPOT_LABELS,
  SZALLITOLEVEL_ALLAPOT_TONES,
  SZAMLA_ALLAPOTOK,
  SZAMLA_ALLAPOT_LABELS,
  SZAMLA_ALLAPOT_TONES,
} from "./constants";
import type {
  IgazolasListItem,
  JotallasListItem,
  SzallitolevelListItem,
  SzamlaListItem,
} from "./types";

const azonosito = {
  key: "azonosito",
  label: "Azonosító",
  type: "string",
  sortable: true,
  searchable: true,
} as const;
const partner = {
  key: "partnerNev",
  label: "Partner",
  type: "string",
  sortable: true,
  searchable: true,
} as const;
const letrehozva = {
  key: "createdAt",
  label: "Létrehozva",
  type: "date",
  sortable: true,
  filterable: true,
  defaultVisible: false,
} as const;
const archivalt = {
  key: "archivalt",
  label: "Archivált",
  type: "boolean",
  filterable: true,
  defaultVisible: false,
} as const;

export const SZALLITOLEVEL_LIST_COLUMNS: Array<ColumnDef<SzallitolevelListItem>> = [
  azonosito,
  partner,
  {
    key: "allapot",
    mongoKey: "status.key",
    label: "Állapot",
    type: "enum",
    sortable: true,
    filterable: true,
    enumValues: SZALLITOLEVEL_ALLAPOTOK.map((v) => ({
      value: v,
      label: SZALLITOLEVEL_ALLAPOT_LABELS[v],
    })),
    badgeTones: SZALLITOLEVEL_ALLAPOT_TONES,
  },
  { key: "kiadasNap", label: "Kiadás napja", type: "string", sortable: true },
  { key: "tetelDb", label: "Tételek", type: "number", align: "right" },
  archivalt,
  letrehozva,
];

export const IGAZOLAS_LIST_COLUMNS: Array<ColumnDef<IgazolasListItem>> = [
  azonosito,
  { key: "cim", label: "Cím", type: "string", sortable: true, searchable: true },
  partner,
  {
    key: "allapot",
    mongoKey: "status.key",
    label: "Állapot",
    type: "enum",
    sortable: true,
    filterable: true,
    enumValues: IGAZOLAS_ALLAPOTOK.map((v) => ({
      value: v,
      label: IGAZOLAS_ALLAPOT_LABELS[v],
    })),
    badgeTones: IGAZOLAS_ALLAPOT_TONES,
  },
  {
    key: "bruttoOsszeg",
    mongoKey: "osszegek.bruttoOsszeg",
    label: "Bruttó összeg",
    type: "number",
    sortable: true,
    filterable: true,
    align: "right",
  },
  archivalt,
  letrehozva,
];

/** `lejart` is computed; the list filter maps it onto `elkuldve` + past due date. */
export const SZAMLA_LIST_COLUMNS: Array<ColumnDef<SzamlaListItem>> = [
  azonosito,
  { key: "szamlaszam", label: "Számlaszám", type: "string", searchable: true },
  partner,
  {
    key: "allapot",
    mongoKey: "status.key",
    label: "Állapot",
    type: "enum",
    sortable: true,
    filterable: true,
    enumValues: SZAMLA_ALLAPOTOK.map((v) => ({
      value: v,
      label: SZAMLA_ALLAPOT_LABELS[v],
    })),
    badgeTones: SZAMLA_ALLAPOT_TONES,
  },
  {
    key: "osszeg",
    label: "Összeg",
    type: "number",
    sortable: true,
    filterable: true,
    align: "right",
  },
  { key: "esedekes", label: "Esedékes", type: "date", sortable: true, filterable: true },
  archivalt,
  letrehozva,
];

/** `lejart` is computed; the list filter maps it onto `aktiv` + past `lejarat`. */
export const JOTALLAS_LIST_COLUMNS: Array<ColumnDef<JotallasListItem>> = [
  azonosito,
  partner,
  { key: "szamlaszam", label: "Számlaszám", type: "string", searchable: true },
  {
    key: "allapot",
    mongoKey: "status.key",
    label: "Állapot",
    type: "enum",
    sortable: true,
    filterable: true,
    enumValues: JOTALLAS_ALLAPOTOK.map((v) => ({
      value: v,
      label: JOTALLAS_ALLAPOT_LABELS[v],
    })),
    badgeTones: JOTALLAS_ALLAPOT_TONES,
  },
  { key: "lejarat", label: "Lejárat", type: "date", sortable: true, filterable: true },
  archivalt,
  letrehozva,
];
