/**
 * Készlet (warehouse / stock / inventory taking / RMA) — client-safe constants. No Mongoose here:
 * the 'use client' components import this through `client.ts`.
 */
import type { BadgeTone } from "@erp/ui";

export const KESZLET_PERMISSIONS = {
  keszletRead: "keszlet:keszlet:read",
  keszletWrite: "keszlet:keszlet:write",
  bevetelWrite: "keszlet:bevetel:write",
  foglalasWrite: "keszlet:foglalas:write",
  leltarWrite: "keszlet:leltar:write",
  rmaRead: "keszlet:rma:read",
  rmaWrite: "keszlet:rma:write",
  ertekRead: "keszlet:ertek:read",
} as const;

/** What the facade needs to know about the caller to cut purchase prices / values. */
export type KeszletViewer = { userId: string; permissions: readonly string[] };

export const canSeeErtek = (v: KeszletViewer) =>
  v.permissions.includes(KESZLET_PERMISSIONS.ertekRead);

// ── Raktárhely ────────────────────────────────────────────────────────────────

export const RAKTARHELY_TIPUSOK = ["fo", "auto", "selejt", "polc"] as const;
export type RaktarhelyTipus = (typeof RAKTARHELY_TIPUSOK)[number];
export const RAKTARHELY_TIPUS_LABELS: Record<RaktarhelyTipus, string> = {
  fo: "Főraktár",
  auto: "Autó",
  selejt: "Selejt",
  polc: "Polc",
};

/** Tree-like location code: segments joined by "/", e.g. `FO`, `FO/A`, `FO/A/12`. */
export const RAKTARHELY_KOD_MINTA =
  /^[A-Za-z0-9ÁÉÍÓÖŐÚÜŰáéíóöőúüű_.-]+(\/[A-Za-z0-9ÁÉÍÓÖŐÚÜŰáéíóöőúüű_.-]+)*$/;
export const RAKTARHELY_ELVALASZTO = "/";

/** The parent code of a location code (`FO/A/12` → `FO/A`; a root has none). */
export function szuloKod(kod: string): string | undefined {
  const i = kod.lastIndexOf(RAKTARHELY_ELVALASZTO);
  return i < 0 ? undefined : kod.slice(0, i);
}

/** Stock without a location is kept under this key (legacy `warehouse_location: null`). */
export const NINCS_HELY = "";
export const NINCS_HELY_LABEL = "Nincs raktárhelyhez rendelve";

// ── Mozgás ────────────────────────────────────────────────────────────────────

export const MOZGAS_TIPUSOK = [
  "bevetel",
  "kiadas",
  "korrekcio",
  "foglalas",
  "foglalas_feloldas",
] as const;
export type MozgasTipus = (typeof MOZGAS_TIPUSOK)[number];

export const MOZGAS_TIPUS_LABELS: Record<MozgasTipus, string> = {
  bevetel: "Bevételezés",
  kiadas: "Kiadás",
  korrekcio: "Korrekció",
  foglalas: "Foglalás",
  foglalas_feloldas: "Foglalás feloldása",
};
export const MOZGAS_TIPUS_TONES: Record<MozgasTipus, BadgeTone> = {
  bevetel: "success",
  kiadas: "info",
  korrekcio: "warning",
  foglalas: "neutral",
  foglalas_feloldas: "neutral",
};

export const REFERENCE_TIPUSOK = [
  "kezi",
  "szallitolevel",
  "munkalap",
  "ajanlat",
  "szamla",
  "beszerzesi_rendeles",
  "leltar",
  "rma",
] as const;
export type ReferenceTipus = (typeof REFERENCE_TIPUSOK)[number];
export const REFERENCE_TIPUS_LABELS: Record<ReferenceTipus, string> = {
  kezi: "Kézi",
  szallitolevel: "Szállítólevél",
  munkalap: "Munkalap",
  ajanlat: "Ajánlat",
  szamla: "Számla",
  beszerzesi_rendeles: "Beszerzési rendelés",
  leltar: "Leltár",
  rma: "RMA",
};

/** Idempotency scope of a batch: the same ref retried never applies twice. */
export type KeszletRef = { referenceType: ReferenceTipus; referenceId: string };

// ── Leltár ────────────────────────────────────────────────────────────────────

export const LELTAR_ALLAPOTOK = ["tervezet", "lezaras", "lezarva"] as const;
export type LeltarAllapot = (typeof LELTAR_ALLAPOTOK)[number];
export const LELTAR_ALLAPOT_LABELS: Record<LeltarAllapot, string> = {
  tervezet: "Folyamatban",
  lezaras: "Lezárás folyamatban",
  lezarva: "Lezárva",
};
export const LELTAR_ALLAPOT_TONES: Record<LeltarAllapot, BadgeTone> = {
  tervezet: "warning",
  lezaras: "info",
  lezarva: "success",
};

// ── RMA ───────────────────────────────────────────────────────────────────────

export const RMA_ALLAPOTOK = [
  "beerkezett",
  "beszallitonak_kuldve",
  "kicserelve",
  "javitva",
  "selejtezve",
  "visszaadva_ugyfelnek",
] as const;
export type RmaAllapot = (typeof RMA_ALLAPOTOK)[number];

export const RMA_ALLAPOT_LABELS: Record<RmaAllapot, string> = {
  beerkezett: "Beérkezett",
  beszallitonak_kuldve: "Beszállítónak elküldve",
  kicserelve: "Kicserélve",
  javitva: "Javítva",
  selejtezve: "Selejtezve",
  visszaadva_ugyfelnek: "Visszaadva az ügyfélnek",
};
export const RMA_ALLAPOT_TONES: Record<RmaAllapot, BadgeTone> = {
  beerkezett: "warning",
  beszallitonak_kuldve: "info",
  kicserelve: "success",
  javitva: "success",
  selejtezve: "danger",
  visszaadva_ugyfelnek: "neutral",
};

/** Active = still needs work (counted on the dashboard, listed in Teendőim when assigned). */
export const RMA_AKTIV_ALLAPOTOK: readonly RmaAllapot[] = [
  "beerkezett",
  "beszallitonak_kuldve",
];

/** Allowed next states per state (terminal states have none). */
export const RMA_ATMENETEK: Record<RmaAllapot, readonly RmaAllapot[]> = {
  beerkezett: [
    "beszallitonak_kuldve",
    "kicserelve",
    "javitva",
    "selejtezve",
    "visszaadva_ugyfelnek",
  ],
  beszallitonak_kuldve: ["kicserelve", "javitva", "selejtezve", "visszaadva_ugyfelnek"],
  kicserelve: ["visszaadva_ugyfelnek"],
  javitva: ["visszaadva_ugyfelnek"],
  selejtezve: [],
  visszaadva_ugyfelnek: [],
};

export const HOLT_KESZLET_NAPOK = 90;
export const KESZLET_JEGYZET_MAX = 1000;
