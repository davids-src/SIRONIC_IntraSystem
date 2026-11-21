import type { ColumnDef } from "@erp/ui";
import {
  ESZKOZ_ALLAPOTOK,
  ESZKOZ_ALLAPOT_LABELS,
  ESZKOZ_ALLAPOT_TONES,
  FIZIKAI_ALLAPOTOK,
  FIZIKAI_ALLAPOT_LABELS,
  FIZIKAI_ALLAPOT_TONES,
} from "./constants";

export type EszkozListItem = {
  _id: string;
  megnevezes: string;
  marka?: string;
  tipusszam?: string;
  gyariSzam?: string;
  allapot: string;
  fizikaiAllapot: string;
  birtokosNev?: string;
  createdAt: string;
};

export const ESZKOZ_LIST_COLUMNS: Array<ColumnDef<EszkozListItem>> = [
  {
    key: "megnevezes",
    label: "Megnevezés",
    type: "string",
    sortable: true,
    searchable: true,
  },
  { key: "marka", label: "Márka", type: "string", sortable: true, searchable: true },
  {
    key: "tipusszam",
    label: "Típusszám",
    type: "string",
    sortable: true,
    searchable: true,
  },
  {
    key: "gyariSzam",
    label: "Gyári szám",
    type: "string",
    sortable: true,
    searchable: true,
  },
  {
    key: "allapot",
    mongoKey: "status.key",
    label: "Állapot",
    type: "enum",
    enumValues: ESZKOZ_ALLAPOTOK.map((v) => ({
      value: v,
      label: ESZKOZ_ALLAPOT_LABELS[v],
    })),
    badgeTones: ESZKOZ_ALLAPOT_TONES,
    filterable: true,
    sortable: true,
  },
  {
    key: "fizikaiAllapot",
    label: "Fizikai állapot",
    type: "enum",
    enumValues: FIZIKAI_ALLAPOTOK.map((v) => ({
      value: v,
      label: FIZIKAI_ALLAPOT_LABELS[v],
    })),
    badgeTones: FIZIKAI_ALLAPOT_TONES,
    filterable: true,
    sortable: true,
  },
  {
    key: "birtokosNev",
    label: "Nála van",
    type: "string",
    sortable: true,
    searchable: true,
  },
  {
    key: "createdAt",
    label: "Felvéve",
    type: "date",
    sortable: true,
    defaultVisible: false,
  },
];
