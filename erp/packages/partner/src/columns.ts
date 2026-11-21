import type { ColumnDef } from "@erp/ui";
import {
  ERDEKLODO_ALLAPOTOK,
  ERDEKLODO_ALLAPOT_LABELS,
  ERDEKLODO_ALLAPOT_TONES,
  PARTNER_SZEREPEK,
  PARTNER_SZEREP_LABELS,
  PARTNER_TIPUSOK,
  PARTNER_TIPUS_LABELS,
} from "./constants";

export type PartnerListItem = {
  _id: string;
  azonosito: string;
  nev: string;
  tipus: string;
  partnerSzerep?: string;
  adoszam?: string;
  varos?: string;
  kapcsolattarto?: string;
  telefon?: string;
  email?: string;
  archivalt: boolean;
  createdAt: Date;
};

const opts = <K extends string>(keys: readonly K[], labels: Record<K, string>) =>
  keys.map((k) => ({ value: k, label: labels[k] }));

/** Plain serializable column metadata — shared by `partnerApi.listPartnerek` and the client table. */
export const PARTNER_LIST_COLUMNS: Array<ColumnDef<PartnerListItem>> = [
  {
    key: "azonosito",
    label: "Azonosító",
    type: "string",
    sortable: true,
    searchable: true,
  },
  { key: "nev", label: "Név", type: "string", sortable: true, searchable: true },
  {
    key: "tipus",
    label: "Típus",
    type: "enum",
    filterable: true,
    enumValues: opts(PARTNER_TIPUSOK, PARTNER_TIPUS_LABELS),
  },
  {
    key: "partnerSzerep",
    label: "Szerep",
    type: "enum",
    filterable: true,
    enumValues: opts(PARTNER_SZEREPEK, PARTNER_SZEREP_LABELS),
  },
  { key: "adoszam", label: "Adószám", type: "string", searchable: true },
  {
    key: "varos",
    mongoKey: "szekhely.varos",
    label: "Város",
    type: "string",
    sortable: true,
    searchable: true,
    defaultVisible: false,
  },
  {
    key: "kapcsolattarto",
    mongoKey: "kapcsolattartok.nev",
    label: "Kapcsolattartó",
    type: "string",
    searchable: true,
  },
  {
    key: "telefon",
    label: "Telefon",
    type: "string",
    searchable: true,
    defaultVisible: false,
  },
  {
    key: "email",
    label: "E-mail",
    type: "string",
    searchable: true,
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

export type ErdeklodoListItem = {
  _id: string;
  azonosito: string;
  cegNev: string;
  kapcsolattartoNev?: string;
  allapot: string;
  felelosNev?: string;
  becsultErtek?: number;
  kovetkezoLepes?: string;
  kovetkezoLepesIdopont?: Date;
  archivalt: boolean;
  createdAt: Date;
};

export const ERDEKLODO_LIST_COLUMNS: Array<ColumnDef<ErdeklodoListItem>> = [
  {
    key: "azonosito",
    label: "Azonosító",
    type: "string",
    sortable: true,
    searchable: true,
  },
  { key: "cegNev", label: "Cégnév", type: "string", sortable: true, searchable: true },
  { key: "kapcsolattartoNev", label: "Kapcsolattartó", type: "string", searchable: true },
  {
    key: "allapot",
    mongoKey: "status.key",
    label: "Állapot",
    type: "enum",
    filterable: true,
    sortable: true,
    enumValues: opts(ERDEKLODO_ALLAPOTOK, ERDEKLODO_ALLAPOT_LABELS),
    badgeTones: ERDEKLODO_ALLAPOT_TONES,
  },
  {
    key: "felelosNev",
    label: "Felelős",
    type: "string",
    sortable: true,
    searchable: true,
  },
  {
    key: "becsultErtek",
    label: "Becsült érték",
    type: "number",
    sortable: true,
    align: "right",
  },
  { key: "kovetkezoLepes", label: "Következő lépés", type: "string", searchable: true },
  {
    key: "kovetkezoLepesIdopont",
    label: "Következő lépés ideje",
    type: "date",
    sortable: true,
  },
  {
    key: "createdAt",
    label: "Felvéve",
    type: "date",
    sortable: true,
    defaultVisible: false,
  },
];
