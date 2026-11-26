import type { ColumnDef } from "@erp/ui";
import {
  HIBAJEGY_ALLAPOTOK,
  HIBAJEGY_ALLAPOT_LABELS,
  HIBAJEGY_ALLAPOT_TONES,
  HIBAJEGY_FORRASOK,
  HIBAJEGY_FORRAS_LABELS,
  HIBAJEGY_PRIORITASOK,
  HIBAJEGY_PRIORITAS_LABELS,
  HIBAJEGY_PRIORITAS_TONES,
  MUNKALAP_ALLAPOTOK,
  MUNKALAP_ALLAPOT_LABELS,
  MUNKALAP_ALLAPOT_TONES,
} from "./constants";
import type { HibajegyListItem, KarbantartasListItem, MunkalapListItem } from "./types";

const prioritasEnum = HIBAJEGY_PRIORITASOK.map((v) => ({
  value: v,
  label: HIBAJEGY_PRIORITAS_LABELS[v],
}));

export const HIBAJEGY_LIST_COLUMNS: Array<ColumnDef<HibajegyListItem>> = [
  {
    key: "azonosito",
    label: "Azonosító",
    type: "string",
    sortable: true,
    searchable: true,
  },
  { key: "targy", label: "Tárgy", type: "string", sortable: true, searchable: true },
  {
    key: "partnerNev",
    label: "Partner",
    type: "string",
    sortable: true,
    searchable: true,
  },
  {
    key: "allapot",
    mongoKey: "status.key",
    label: "Állapot",
    type: "enum",
    enumValues: HIBAJEGY_ALLAPOTOK.map((v) => ({
      value: v,
      label: HIBAJEGY_ALLAPOT_LABELS[v],
    })),
    badgeTones: HIBAJEGY_ALLAPOT_TONES,
    filterable: true,
    sortable: true,
  },
  {
    key: "prioritas",
    label: "Prioritás",
    type: "enum",
    enumValues: prioritasEnum,
    badgeTones: HIBAJEGY_PRIORITAS_TONES,
    filterable: true,
    sortable: true,
  },
  {
    key: "felelosNev",
    label: "Felelős",
    type: "string",
    sortable: true,
    searchable: true,
  },
  {
    key: "forras",
    label: "Forrás",
    type: "enum",
    enumValues: HIBAJEGY_FORRASOK.map((v) => ({
      value: v,
      label: HIBAJEGY_FORRAS_LABELS[v],
    })),
    filterable: true,
    defaultVisible: false,
  },
  {
    key: "kategoria",
    label: "Kategória",
    type: "string",
    filterable: true,
    defaultVisible: false,
  },
  { key: "createdAt", label: "Felvéve", type: "date", sortable: true, filterable: true },
];

/** The portal ticket list never shows the assignee. */
export const HIBAJEGY_PORTAL_LIST_COLUMNS = HIBAJEGY_LIST_COLUMNS.filter(
  (c) => c.key !== "felelosNev",
);

export const MUNKALAP_LIST_COLUMNS: Array<ColumnDef<MunkalapListItem>> = [
  {
    key: "azonosito",
    label: "Azonosító",
    type: "string",
    sortable: true,
    searchable: true,
  },
  {
    key: "partnerNev",
    label: "Partner",
    type: "string",
    sortable: true,
    searchable: true,
  },
  { key: "szerelo", label: "Szerelő", type: "string", sortable: true, searchable: true },
  {
    key: "munkaDatum",
    label: "Munka dátuma",
    type: "date",
    sortable: true,
    filterable: true,
  },
  { key: "kategoria", label: "Kategória", type: "string", filterable: true },
  {
    key: "allapot",
    mongoKey: "status.key",
    label: "Állapot",
    type: "enum",
    enumValues: MUNKALAP_ALLAPOTOK.map((v) => ({
      value: v,
      label: MUNKALAP_ALLAPOT_LABELS[v],
    })),
    badgeTones: MUNKALAP_ALLAPOT_TONES,
    filterable: true,
    sortable: true,
  },
  { key: "munkaOra", label: "Munkaóra", type: "number", align: "right", sortable: false },
];

export const KARBANTARTAS_LIST_COLUMNS: Array<ColumnDef<KarbantartasListItem>> = [
  { key: "cim", label: "Terv", type: "string", sortable: true, searchable: true },
  {
    key: "partnerNev",
    label: "Partner",
    type: "string",
    sortable: true,
    searchable: true,
  },
  {
    key: "intervallumHonap",
    label: "Gyakoriság (hó)",
    type: "number",
    align: "right",
    sortable: true,
  },
  {
    key: "prioritas",
    label: "Prioritás",
    type: "enum",
    enumValues: prioritasEnum,
    badgeTones: HIBAJEGY_PRIORITAS_TONES,
    filterable: true,
  },
  { key: "felelosNev", label: "Felelős", type: "string", searchable: true },
  {
    key: "kovetkezoEsedekes",
    label: "Következő esedékesség",
    type: "string",
    sortable: false,
  },
];
