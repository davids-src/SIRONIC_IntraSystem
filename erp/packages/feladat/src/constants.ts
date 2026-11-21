/**
 * Feladatok (7e, #43; own package since 8c, #50) — client-safe constants. Free task assignment
 * between any two users, and the one responsibility mechanism every module may use through
 * linked tasks (`kapcsolat`). Below every domain module in the DAG: depends only on core /
 * db-core (+ ui types). The facade is `api.ts`.
 */
import type { BadgeTone } from "@erp/ui";

/** The session user, in the shape the facade decides on (same as every module's viewer). */
export type FeladatViewer = { userId: string; permissions: readonly string[] };

/**
 * Read-only overview of everyone's tasks and the Kimutatás. The key keeps its `hr:` prefix —
 * it is already granted to roles in the database; it stays registered in HR's permission
 * module, so this package registers none.
 */
export const FELADAT_PERMISSIONS = { read: "hr:feladat:read" } as const;

export const FELADAT_ALLAPOTOK = [
  "kiadva",
  "elfogadva",
  "elutasitva",
  "lezarva",
  "visszavonva",
  "tovabbadva",
] as const;
export type FeladatAllapot = (typeof FELADAT_ALLAPOTOK)[number];

export const FELADAT_ALLAPOT_LABELS: Record<FeladatAllapot, string> = {
  kiadva: "Elfogadásra vár",
  elfogadva: "Folyamatban",
  elutasitva: "Elutasítva",
  lezarva: "Kész",
  visszavonva: "Visszavonva",
  tovabbadva: "Továbbadva",
};

export const FELADAT_ALLAPOT_TONES: Record<FeladatAllapot, BadgeTone> = {
  kiadva: "info",
  elfogadva: "warning",
  elutasitva: "danger",
  lezarva: "success",
  visszavonva: "neutral",
  tovabbadva: "neutral",
};

/**
 * Still waiting on someone: the felelős (kiadva, elfogadva) or — after a refusal — the kiadó,
 * who either gives it to someone else or withdraws it. Comments are allowed only while open.
 */
export const FELADAT_NYITOTT_ALLAPOTOK: FeladatAllapot[] = [
  "kiadva",
  "elfogadva",
  "elutasitva",
];

/** Which list the page shows: given to me, given by me, or — with `hr:feladat:read` — all. */
export const FELADAT_NEZETEK = ["kapott", "kiadott", "mind"] as const;
export type FeladatNezetSzuro = (typeof FELADAT_NEZETEK)[number];

export const FELADAT_NEZET_LABELS: Record<FeladatNezetSzuro, string> = {
  kapott: "Teendőim",
  kiadott: "Általam kiadott",
  mind: "Mindenki feladatai",
};

/** Prioritás (#48): shown on every card, filterable; `normal` is the default and not stored. */
export const FELADAT_PRIORITASOK = ["normal", "magas", "surgos"] as const;
export type FeladatPrioritas = (typeof FELADAT_PRIORITASOK)[number];

export const FELADAT_PRIORITAS_LABELS: Record<FeladatPrioritas, string> = {
  normal: "Normál",
  magas: "Magas",
  surgos: "Sürgős",
};

export const FELADAT_PRIORITAS_TONES: Record<FeladatPrioritas, BadgeTone> = {
  normal: "neutral",
  magas: "warning",
  surgos: "danger",
};

/** Attachments (images, PDF — protected media, #47) per task and per comment. */
export const FELADAT_CSATOLMANY_MAX = 5;

/** Steps the felelős adds to a task (#50). */
export const FELADAT_LEPES_MAX = 30;
export const FELADAT_LEPES_NEV_MAX = 200;
export const LEPES_SABLON_MAX = 50;

/**
 * Linked task (#50): the entity step a task belongs to. `modul` is the owning module's key
 * (`vallalkozas`, `gepeszet`, …) — the module whose callback hook fires when the task closes or
 * is handed on; `url` is where the task page links back to.
 */
export type FeladatKapcsolat = {
  modul: string;
  tipus: string;
  id: string;
  szakasz?: string;
  url: string;
  /**
   * Display name of the linked step as the task page shows it (e.g. "Ajánlatkérés B-004-2026 ·
   * Tervek átnézése"). Optional — older tasks fall back to `tipus · szakasz`.
   */
  cimke?: string;
};

/** How the task page names a link: its `cimke`, or the raw `tipus · szakasz` of older tasks. */
export function kapcsolatCimke(
  k: Pick<FeladatKapcsolat, "tipus" | "szakasz" | "cimke">,
): string {
  if (k.cimke) return k.cimke;
  return k.szakasz ? `${k.tipus} · ${k.szakasz}` : k.tipus;
}

export const FELADAT_CIM_MAX = 200;
/** A group task goes to at most this many people at once. */
export const FELADAT_CSOPORT_MAX = 100;
export const FELADAT_SZOVEG_MAX = 2000;
