/**
 * Projekt module — client-safe constants. No Mongoose here: the 'use client' components import
 * this through `client.ts`.
 */
import type { BadgeTone } from "@erp/ui";

// ── Projekt ──────────────────────────────────────────────────────────────────────────────────
export const PROJEKT_ALLAPOTOK = ["nyitott", "felfuggesztett", "lezart"] as const;
export type ProjektAllapot = (typeof PROJEKT_ALLAPOTOK)[number];

export const PROJEKT_ALLAPOT_LABELS: Record<ProjektAllapot, string> = {
  nyitott: "Nyitott",
  felfuggesztett: "Felfüggesztett",
  lezart: "Lezárt",
};

export const PROJEKT_ALLAPOT_TONES: Record<ProjektAllapot, BadgeTone> = {
  nyitott: "info",
  felfuggesztett: "warning",
  lezart: "success",
};

export const FAZIS_ALLAPOTOK = ["fuggoben", "folyamatban", "kesz"] as const;
export type FazisAllapot = (typeof FAZIS_ALLAPOTOK)[number];

export const FAZIS_ALLAPOT_LABELS: Record<FazisAllapot, string> = {
  fuggoben: "Függőben",
  folyamatban: "Folyamatban",
  kesz: "Kész",
};

export const FAZIS_ALLAPOT_TONES: Record<FazisAllapot, BadgeTone> = {
  fuggoben: "neutral",
  folyamatban: "info",
  kesz: "success",
};

export const CHECKLIST_KATEGORIAK = [
  "tartalom",
  "anyagok",
  "dokumentumok",
  "technikai",
  "egyeb",
] as const;
export type ChecklistKategoria = (typeof CHECKLIST_KATEGORIAK)[number];

export const CHECKLIST_KATEGORIA_LABELS: Record<ChecklistKategoria, string> = {
  tartalom: "Tartalom",
  anyagok: "Anyagok",
  dokumentumok: "Dokumentumok",
  technikai: "Technikai",
  egyeb: "Egyéb",
};

export const STAGING_JOVAHAGYASOK = [
  "fuggoben",
  "jovahagyva",
  "modositas_kerve",
] as const;
export type StagingJovahagyas = (typeof STAGING_JOVAHAGYASOK)[number];

export const STAGING_JOVAHAGYAS_LABELS: Record<StagingJovahagyas, string> = {
  fuggoben: "Jóváhagyásra vár",
  jovahagyva: "Jóváhagyva",
  modositas_kerve: "Módosítás kérve",
};

export const STAGING_JOVAHAGYAS_TONES: Record<StagingJovahagyas, BadgeTone> = {
  fuggoben: "warning",
  jovahagyva: "success",
  modositas_kerve: "danger",
};

// ── Költség ──────────────────────────────────────────────────────────────────────────────────
export const KOLTSEG_TIPUSOK = [
  "uzemanyag",
  "parkolas",
  "autopalya",
  "szallas",
  "anyag",
  "egyeb",
] as const;
export type KoltsegTipus = (typeof KOLTSEG_TIPUSOK)[number];

export const KOLTSEG_TIPUS_LABELS: Record<KoltsegTipus, string> = {
  uzemanyag: "Üzemanyag",
  parkolas: "Parkolás",
  autopalya: "Autópálya",
  szallas: "Szállás",
  anyag: "Anyag",
  egyeb: "Egyéb",
};

// ── Heti terv ────────────────────────────────────────────────────────────────────────────────
export const HETI_ALLAPOTOK = ["todo", "folyamatban", "kesz", "blokkolt"] as const;
export type HetiAllapot = (typeof HETI_ALLAPOTOK)[number];

export const HETI_ALLAPOT_LABELS: Record<HetiAllapot, string> = {
  todo: "Teendő",
  folyamatban: "Folyamatban",
  kesz: "Kész",
  blokkolt: "Blokkolt",
};

export const HETI_ALLAPOT_TONES: Record<HetiAllapot, BadgeTone> = {
  todo: "neutral",
  folyamatban: "info",
  kesz: "success",
  blokkolt: "danger",
};

export const PRIORITASOK = ["alacsony", "kozepes", "magas", "surgos"] as const;
export type Prioritas = (typeof PRIORITASOK)[number];

export const PRIORITAS_LABELS: Record<Prioritas, string> = {
  alacsony: "Alacsony",
  kozepes: "Közepes",
  magas: "Magas",
  surgos: "Sürgős",
};

export const PRIORITAS_TONES: Record<Prioritas, BadgeTone> = {
  alacsony: "neutral",
  kozepes: "info",
  magas: "warning",
  surgos: "danger",
};

// ── Alaprajz ─────────────────────────────────────────────────────────────────────────────────
export const JELOLO_TIPUSOK = [
  "kamera",
  "ap",
  "switch",
  "rack",
  "aljzat",
  "szenzor",
  "router",
  "szerver",
  "egyeb",
] as const;
export type JeloloTipus = (typeof JELOLO_TIPUSOK)[number];

export const JELOLO_TIPUS_LABELS: Record<JeloloTipus, string> = {
  kamera: "Kamera",
  ap: "Wi-Fi AP",
  switch: "Switch",
  rack: "Rack",
  aljzat: "Aljzat",
  szenzor: "Szenzor",
  router: "Router",
  szerver: "Szerver",
  egyeb: "Egyéb",
};

// ── Limits ───────────────────────────────────────────────────────────────────────────────────
export const NEV_MAX = 200;
export const SZOVEG_MAX = 2000;
export const OK_MAX = 500;

/** Viewer of a read — a portal viewer never sees expenses, internal notes or the checklist. */
export type NezoStaff = { kind: "staff"; userId: string };
export type NezoPortal = { kind: "portal"; partnerId: string };
export type Nezo = NezoStaff | NezoPortal;

export const PROJEKT_PERMISSIONS = {
  projektRead: "projekt:projekt:read",
  projektWrite: "projekt:projekt:write",
  projektDelete: "projekt:projekt:delete",
  koltsegRead: "projekt:koltseg:read",
  koltsegWrite: "projekt:koltseg:write",
  koltsegDelete: "projekt:koltseg:delete",
  hetitervRead: "projekt:hetiterv:read",
  hetitervWrite: "projekt:hetiterv:write",
  hetitervDelegal: "projekt:hetiterv:delegal",
  sablonRead: "projekt:sablon:read",
  sablonWrite: "projekt:sablon:write",
  sablonDelete: "projekt:sablon:delete",
} as const;
