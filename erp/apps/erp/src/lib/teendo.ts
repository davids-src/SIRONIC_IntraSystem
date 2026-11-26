/**
 * Feladatok — client-safe shapes and colours for the merged task list (own tasks, tasks from
 * colleagues, and every module's `listMyAssignments` items). The server side that builds them is
 * `teendo-feed.ts`.
 */
import type { FeladatSor } from "@erp/feladat";

/** Feladat sources first, then one category per module that feeds `listMyAssignments`. */
export const TEENDO_KATEGORIAK = [
  "kollegatol",
  "sajat",
  "eszkoz",
  "partner",
  "projekt",
  "keszlet",
  "ertekesites",
  "szerviz",
  "bizonylat",
  "infra",
  "egyeb",
] as const;
export type TeendoKategoria = (typeof TEENDO_KATEGORIAK)[number];

export const TEENDO_KATEGORIA_LABELS: Record<TeendoKategoria, string> = {
  kollegatol: "Kollégától",
  sajat: "Saját",
  eszkoz: "Eszközök",
  partner: "Partnerek",
  projekt: "Projektek",
  keszlet: "Készlet",
  ertekesites: "Értékesítés",
  szerviz: "Szerviz",
  bizonylat: "Bizonylatok",
  infra: "Infrastruktúra",
  egyeb: "Egyéb",
};

/** Deadline bands, most urgent first. */
export const HATARIDO_SAVOK = ["lejart", "ma", "het", "kesobb", "nincs"] as const;
export type HataridoSav = (typeof HATARIDO_SAVOK)[number];

export const HATARIDO_SAV_LABELS: Record<HataridoSav, string> = {
  lejart: "Lejárt",
  ma: "Ma esedékes",
  het: "A következő 7 napban",
  kesobb: "Később",
  nincs: "Határidő nélkül",
};

/** `YYYY-MM-DD` strings compare as dates. */
export function hataridoSav(hatarido: string | undefined, ma: string): HataridoSav {
  if (!hatarido) return "nincs";
  if (hatarido < ma) return "lejart";
  if (hatarido === ma) return "ma";
  const het = new Date(`${ma}T00:00:00.000Z`);
  het.setUTCDate(het.getUTCDate() + 7);
  return hatarido <= het.toISOString().slice(0, 10) ? "het" : "kesobb";
}

/** One row of "Teendőim" — a task (with its full thread) or another module's item (a link). */
export type Teendo = {
  key: string;
  kategoria: TeendoKategoria;
  cim: string;
  /** Who / what it is about: "Nagy Béla adta", "Modul · azonosító". */
  alcim?: string;
  allapot: string;
  /** `YYYY-MM-DD` (Budapest calendar day). */
  hatarido?: string;
  /** Not yet seen through: a colleague's task still waiting for acceptance. */
  uj: boolean;
  url?: string;
  /** The machine it is about, so the list can be narrowed to one machine. */
  feladat?: FeladatSor;
  /** Task priority (#48) — urgent ones sort first within their deadline band. */
  prioritas?: FeladatSor["prioritas"];
};

/** Sidebar badge: open items, of which overdue and not yet accepted. */
export type FeladatJelzes = { db: number; lejart: number; uj: number };

export const NAP = (ymd: string) => ymd.replaceAll("-", ". ") + ".";
