import type { ColumnDef } from "@erp/ui";
import {
  KOLTSEG_TIPUSOK,
  KOLTSEG_TIPUS_LABELS,
  PROJEKT_ALLAPOTOK,
  PROJEKT_ALLAPOT_LABELS,
  PROJEKT_ALLAPOT_TONES,
} from "./constants";

export type ProjektListItem = {
  _id: string;
  azonosito: string;
  nev: string;
  partnerNev?: string;
  felelosNev?: string;
  allapot: string;
  hatarido?: string;
  szazalek: number;
  portalLathato: boolean;
  archivalt: boolean;
  createdAt: string;
};

export const PROJEKT_LIST_COLUMNS: Array<ColumnDef<ProjektListItem>> = [
  {
    key: "azonosito",
    label: "Azonosító",
    type: "string",
    sortable: true,
    searchable: true,
  },
  { key: "nev", label: "Projekt", type: "string", sortable: true, searchable: true },
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
    enumValues: PROJEKT_ALLAPOTOK.map((v) => ({
      value: v,
      label: PROJEKT_ALLAPOT_LABELS[v],
    })),
    badgeTones: PROJEKT_ALLAPOT_TONES,
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
  { key: "hatarido", label: "Határidő", type: "date", sortable: true, filterable: true },
  {
    key: "szazalek",
    label: "Készültség %",
    type: "number",
    sortable: true,
    align: "right",
  },
  {
    key: "portalLathato",
    label: "Portálon látható",
    type: "boolean",
    filterable: true,
    defaultVisible: false,
  },
  {
    key: "createdAt",
    label: "Felvéve",
    type: "date",
    sortable: true,
    defaultVisible: false,
  },
];

export type KoltsegListItem = {
  _id: string;
  projektId: string;
  projektNev?: string;
  tipus: string;
  leiras?: string;
  osszeg: number;
  penznem: string;
  datum: string;
  rogzitoNev: string;
  bizonylatMediaId?: string;
  archivalt: boolean;
};

export const KOLTSEG_LIST_COLUMNS: Array<ColumnDef<KoltsegListItem>> = [
  { key: "datum", label: "Dátum", type: "date", sortable: true, filterable: true },
  {
    key: "tipus",
    label: "Típus",
    type: "enum",
    enumValues: KOLTSEG_TIPUSOK.map((v) => ({
      value: v,
      label: KOLTSEG_TIPUS_LABELS[v],
    })),
    filterable: true,
    sortable: true,
  },
  { key: "leiras", label: "Leírás", type: "string", searchable: true },
  {
    key: "osszeg",
    label: "Nettó összeg",
    type: "number",
    sortable: true,
    align: "right",
  },
  { key: "penznem", label: "Pénznem", type: "string", defaultVisible: false },
  {
    key: "rogzitoNev",
    label: "Rögzítette",
    type: "string",
    sortable: true,
    searchable: true,
  },
];

export type SablonListItem = {
  _id: string;
  nev: string;
  kategoria?: string;
  tetelSzam: number;
  archivalt: boolean;
  createdAt: string;
};

export const SABLON_LIST_COLUMNS: Array<ColumnDef<SablonListItem>> = [
  { key: "nev", label: "Sablon", type: "string", sortable: true, searchable: true },
  {
    key: "kategoria",
    label: "Kategória",
    type: "string",
    sortable: true,
    searchable: true,
  },
  { key: "tetelSzam", label: "Tételek", type: "number", align: "right" },
  {
    key: "createdAt",
    label: "Felvéve",
    type: "date",
    sortable: true,
    defaultVisible: false,
  },
];
