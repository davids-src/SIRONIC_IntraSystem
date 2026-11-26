import type { ColumnDef } from "@erp/ui";
import {
  RMA_ALLAPOTOK,
  RMA_ALLAPOT_LABELS,
  RMA_ALLAPOT_TONES,
  LELTAR_ALLAPOTOK,
  LELTAR_ALLAPOT_LABELS,
  LELTAR_ALLAPOT_TONES,
} from "./constants";

export type KeszletListItem = {
  _id: string;
  arlistaTermekId: string;
  nev: string;
  kod: string;
  egyseg: string;
  raktarhelyKod: string;
  keszlet: number;
  foglalt: number;
  szabad: number;
  minimum?: number;
  /** keszlet × utolsó beszerzési ár — absent unless the viewer holds `keszlet:ertek:read`. */
  ertek?: number;
  utolsoMozgasAt?: string;
};

export const KESZLET_LIST_COLUMNS: Array<ColumnDef<KeszletListItem>> = [
  { key: "kod", label: "Kód", type: "string", sortable: true, searchable: true },
  { key: "nev", label: "Megnevezés", type: "string", sortable: true, searchable: true },
  {
    key: "raktarhelyKod",
    label: "Raktárhely",
    type: "enum",
    // The page replaces enumValues with the real locations (see keszlet-table).
    enumValues: [],
    filterable: true,
    sortable: true,
  },
  { key: "keszlet", label: "Készlet", type: "number", sortable: true },
  { key: "foglalt", label: "Foglalt", type: "number", sortable: true },
  { key: "szabad", label: "Szabad", type: "number" },
  { key: "egyseg", label: "Egység", type: "string", defaultVisible: false },
  { key: "minimum", label: "Minimum", type: "number", sortable: true },
  { key: "ertek", label: "Érték", type: "number" },
  {
    key: "utolsoMozgasAt",
    label: "Utolsó mozgás",
    type: "date",
    sortable: true,
    defaultVisible: false,
  },
];

export type RmaListItem = {
  _id: string;
  sorszam: string;
  termekNev: string;
  termekKod: string;
  gyariSzam?: string;
  mennyiseg: number;
  partnerNev: string;
  beszallitoNev?: string;
  allapot: string;
  createdAt: string;
};

export const RMA_LIST_COLUMNS: Array<ColumnDef<RmaListItem>> = [
  { key: "sorszam", label: "Sorszám", type: "string", sortable: true, searchable: true },
  {
    key: "termekNev",
    label: "Termék",
    type: "string",
    sortable: true,
    searchable: true,
  },
  { key: "gyariSzam", label: "Gyári szám", type: "string", searchable: true },
  { key: "mennyiseg", label: "Db", type: "number", sortable: true },
  {
    key: "partnerNev",
    label: "Partner",
    type: "string",
    sortable: true,
    searchable: true,
  },
  {
    key: "beszallitoNev",
    label: "Beszállító",
    type: "string",
    searchable: true,
    defaultVisible: false,
  },
  {
    key: "allapot",
    mongoKey: "status.key",
    label: "Állapot",
    type: "enum",
    enumValues: RMA_ALLAPOTOK.map((v) => ({ value: v, label: RMA_ALLAPOT_LABELS[v] })),
    badgeTones: RMA_ALLAPOT_TONES,
    filterable: true,
    sortable: true,
  },
  { key: "createdAt", label: "Beérkezett", type: "date", sortable: true },
];

export type LeltarListItem = {
  _id: string;
  sorszam: string;
  raktarhelyKod: string;
  allapot: string;
  sorokDb: number;
  eltero: number;
  createdAt: string;
};

export const LELTAR_LIST_COLUMNS: Array<ColumnDef<LeltarListItem>> = [
  { key: "sorszam", label: "Sorszám", type: "string", sortable: true, searchable: true },
  { key: "raktarhelyKod", label: "Raktárhely", type: "string", sortable: true },
  {
    key: "allapot",
    label: "Állapot",
    type: "enum",
    enumValues: LELTAR_ALLAPOTOK.map((v) => ({
      value: v,
      label: LELTAR_ALLAPOT_LABELS[v],
    })),
    badgeTones: LELTAR_ALLAPOT_TONES,
    filterable: true,
    sortable: true,
  },
  { key: "sorokDb", label: "Tételek", type: "number" },
  { key: "eltero", label: "Eltérés", type: "number" },
  { key: "createdAt", label: "Indítva", type: "date", sortable: true },
];
