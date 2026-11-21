/**
 * Eszköz (tools / equipment) — client-safe constants. No Mongoose here: the 'use client'
 * components import this through `client.ts`.
 */
import type { BadgeTone } from "@erp/ui";

export const ESZKOZ_ALLAPOTOK = [
  "raktaron",
  "kiadva",
  "szervizben",
  "elveszett",
  "kivonva",
] as const;
export type EszkozAllapot = (typeof ESZKOZ_ALLAPOTOK)[number];

export const ESZKOZ_ALLAPOT_LABELS: Record<EszkozAllapot, string> = {
  raktaron: "Raktáron",
  kiadva: "Kiadva",
  szervizben: "Szervizben",
  elveszett: "Elveszett",
  kivonva: "Kivonva",
};

export const ESZKOZ_ALLAPOT_TONES: Record<EszkozAllapot, BadgeTone> = {
  raktaron: "success",
  kiadva: "info",
  szervizben: "warning",
  elveszett: "danger",
  kivonva: "neutral",
};

export const FIZIKAI_ALLAPOTOK = ["uj", "jo", "megfelelo", "rossz"] as const;
export type FizikaiAllapot = (typeof FIZIKAI_ALLAPOTOK)[number];

export const FIZIKAI_ALLAPOT_LABELS: Record<FizikaiAllapot, string> = {
  uj: "Új",
  jo: "Jó",
  megfelelo: "Megfelelő",
  rossz: "Rossz",
};

export const FIZIKAI_ALLAPOT_TONES: Record<FizikaiAllapot, BadgeTone> = {
  uj: "success",
  jo: "success",
  megfelelo: "warning",
  rossz: "danger",
};

/** Append-only movement log entry types. */
export const MOZGAS_TIPUSOK = [
  "kiadas",
  "visszavetel",
  "szerviz_kezdete",
  "szerviz_vege",
  "elveszett",
  "kivonas",
] as const;
export type MozgasTipus = (typeof MOZGAS_TIPUSOK)[number];

export const MOZGAS_TIPUS_LABELS: Record<MozgasTipus, string> = {
  kiadas: "Kiadás",
  visszavetel: "Visszavétel",
  szerviz_kezdete: "Szerviz kezdete",
  szerviz_vege: "Szerviz vége",
  elveszett: "Elveszett",
  kivonas: "Kivonás",
};

export const MOZGAS_TIPUS_TONES: Record<MozgasTipus, BadgeTone> = {
  kiadas: "info",
  visszavetel: "success",
  szerviz_kezdete: "warning",
  szerviz_vege: "success",
  elveszett: "danger",
  kivonas: "neutral",
};

export const ESZKOZ_JEGYZET_MAX = 1000;
export const ESZKOZ_NEV_MAX = 200;

export const ESZKOZ_PERMISSIONS = {
  read: "eszkoz:eszkoz:read",
  write: "eszkoz:eszkoz:write",
  kiad: "eszkoz:eszkoz:kiad",
  delete: "eszkoz:eszkoz:delete",
} as const;
