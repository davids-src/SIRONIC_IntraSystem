import type { ColumnDef } from "@erp/ui";
import {
  FIZETES_ALLAPOTOK,
  FIZETES_ALLAPOT_LABELS,
  FIZETES_ALLAPOT_TONES,
  INTEGRACIO_LABELS,
  INTEGRACIO_SZOLGALTATOK,
  SZAMLAZASI_CIKLUSOK,
  SZAMLAZASI_CIKLUS_LABELS,
  TELEPITES_ALLAPOTOK,
  TELEPITES_ALLAPOT_LABELS,
  TELEPITES_ALLAPOT_TONES,
} from "./constants";

export type TelepitesListItem = {
  _id: string;
  azonosito: string;
  nev: string;
  domain?: string;
  allapot: string;
  partnerNev?: string;
  csomagNev?: string;
  hibasLepesek: number;
  updatedAt: string;
};

export const TELEPITES_LIST_COLUMNS: Array<ColumnDef<TelepitesListItem>> = [
  { key: "azonosito", label: "Azonosító", type: "string", sortable: true, searchable: true },
  { key: "nev", label: "Név", type: "string", sortable: true, searchable: true },
  { key: "domain", label: "Domain", type: "string", sortable: true, searchable: true },
  {
    key: "allapot",
    label: "Állapot",
    type: "enum",
    enumValues: TELEPITES_ALLAPOTOK.map((v) => ({
      value: v,
      label: TELEPITES_ALLAPOT_LABELS[v],
    })),
    badgeTones: TELEPITES_ALLAPOT_TONES,
    filterable: true,
    sortable: true,
  },
  { key: "partnerNev", label: "Partner", type: "string", sortable: false },
  { key: "csomagNev", label: "Csomag", type: "string", sortable: false },
  { key: "updatedAt", label: "Módosítva", type: "date", sortable: true, defaultVisible: false },
];

export type CsomagListItem = {
  _id: string;
  kod: string;
  nev: string;
  arHuf: number;
  alapCiklus: string;
  vcpu?: number;
  ramMb?: number;
  diskGb?: number;
  aktiv: boolean;
};

export const CSOMAG_LIST_COLUMNS: Array<ColumnDef<CsomagListItem>> = [
  { key: "kod", label: "Kód", type: "string", sortable: true, searchable: true },
  { key: "nev", label: "Név", type: "string", sortable: true, searchable: true },
  { key: "arHuf", label: "Ár (Ft)", type: "number", sortable: true },
  {
    key: "alapCiklus",
    label: "Ciklus",
    type: "enum",
    enumValues: SZAMLAZASI_CIKLUSOK.map((v) => ({
      value: v,
      label: SZAMLAZASI_CIKLUS_LABELS[v],
    })),
    filterable: true,
  },
  { key: "vcpu", label: "vCPU", type: "number" },
  { key: "ramMb", label: "RAM (MB)", type: "number" },
  { key: "diskGb", label: "Tár (GB)", type: "number" },
  { key: "aktiv", label: "Aktív", type: "boolean", filterable: true },
];

export type FizetesListItem = {
  _id: string;
  telepitesId: string;
  telepitesNev: string;
  domain?: string;
  idoszakKezdet: string;
  idoszakVeg: string;
  osszegHuf: number;
  allapot: string;
  fizetve?: string;
};

export const FIZETES_LIST_COLUMNS: Array<ColumnDef<FizetesListItem>> = [
  { key: "telepitesNev", label: "Telepítés", type: "string", searchable: false },
  { key: "domain", label: "Domain", type: "string" },
  { key: "idoszakKezdet", label: "Időszak kezdete", type: "date", sortable: true },
  { key: "idoszakVeg", label: "Időszak vége", type: "date", sortable: true },
  { key: "osszegHuf", label: "Összeg (Ft)", type: "number", sortable: true },
  {
    key: "allapot",
    label: "Állapot",
    type: "enum",
    enumValues: FIZETES_ALLAPOTOK.map((v) => ({ value: v, label: FIZETES_ALLAPOT_LABELS[v] })),
    badgeTones: FIZETES_ALLAPOT_TONES,
    filterable: true,
  },
  { key: "fizetve", label: "Fizetve", type: "date" },
];

export type IntegracioListItem = {
  _id: string;
  szolgaltato: string;
  cimke: string;
  alapUrl: string;
  aktiv: boolean;
  /** Names of the stored credential fields only — never values. */
  hitelesitoMezok: string[];
  utolsoEllenorzes?: string;
  utolsoEllenorzesOk?: boolean;
  utolsoEllenorzesUzenet?: string;
};

export const INTEGRACIO_LIST_COLUMNS: Array<ColumnDef<IntegracioListItem>> = [
  {
    key: "szolgaltato",
    label: "Szolgáltató",
    type: "enum",
    enumValues: INTEGRACIO_SZOLGALTATOK.map((v) => ({ value: v, label: INTEGRACIO_LABELS[v] })),
    filterable: true,
  },
  { key: "cimke", label: "Címke", type: "string", searchable: true },
  { key: "alapUrl", label: "URL", type: "string" },
  { key: "aktiv", label: "Aktív", type: "boolean" },
  { key: "utolsoEllenorzes", label: "Utolsó ellenőrzés", type: "date" },
];

export type SablonListItem = {
  _id: string;
  nev: string;
  leiras?: string;
  alapertelmezett: boolean;
  helyorzokSzama: number;
};

export const SABLON_LIST_COLUMNS: Array<ColumnDef<SablonListItem>> = [
  { key: "nev", label: "Név", type: "string", sortable: true, searchable: true },
  { key: "leiras", label: "Leírás", type: "string" },
  { key: "helyorzokSzama", label: "Helyőrzők", type: "number" },
  { key: "alapertelmezett", label: "Alapértelmezett", type: "boolean" },
];
