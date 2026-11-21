import type { BadgeTone } from "@erp/ui";

/**
 * Domain vocabulary of the Partner module. Keys are stable identifiers stored in the database;
 * labels are what the user sees. Every enum has `*_LABELS` (and `*_TONES` where it is shown as a
 * status chip).
 */

/** Partner type (legacy `Contact.type`: company / individual / one_time). */
export const PARTNER_TIPUSOK = ["ceg", "magansemely", "eseti"] as const;
export type PartnerTipus = (typeof PARTNER_TIPUSOK)[number];
export const PARTNER_TIPUS_LABELS: Record<PartnerTipus, string> = {
  ceg: "Cég",
  magansemely: "Magánszemély",
  eseti: "Eseti partner",
};

/**
 * Pricing-profile field 1 — the partner's role (legacy `partner_role`):
 * client / subcontractor_employer / supplier / mixed. Read by the future `arlista` module.
 */
export const PARTNER_SZEREPEK = [
  "ugyfel",
  "alvallalkozo_megbizo",
  "beszallito",
  "vegyes",
] as const;
export type PartnerSzerep = (typeof PARTNER_SZEREPEK)[number];
export const PARTNER_SZEREP_LABELS: Record<PartnerSzerep, string> = {
  ugyfel: "Ügyfél",
  alvallalkozo_megbizo: "Alvállalkozó-megbízó",
  beszallito: "Beszállító",
  vegyes: "Vegyes",
};

/** Pricing-profile field 2 — client category (legacy `client_category`: individual / smb / enterprise). */
export const UGYFEL_KATEGORIAK = ["magansemely", "kkv", "nagyvallalat"] as const;
export type UgyfelKategoria = (typeof UGYFEL_KATEGORIAK)[number];
export const UGYFEL_KATEGORIA_LABELS: Record<UgyfelKategoria, string> = {
  magansemely: "Magánszemély",
  kkv: "Kis- és középvállalkozás",
  nagyvallalat: "Nagyvállalat",
};

/** Pricing-profile field 3 — pricing contract type (legacy `pricing_contract_type`). */
export const ARAZASI_SZERZODES_TIPUSOK = ["eseti", "6_honap", "1_ev", "2_ev"] as const;
export type ArazasiSzerzodesTipus = (typeof ARAZASI_SZERZODES_TIPUSOK)[number];
export const ARAZASI_SZERZODES_TIPUS_LABELS: Record<ArazasiSzerzodesTipus, string> = {
  eseti: "Eseti",
  "6_honap": "6 hónapos",
  "1_ev": "1 éves",
  "2_ev": "2 éves",
};

/** Subcontractor work areas (legacy `subcontractor_work_types`). */
export const ALVALLALKOZOI_MUNKATERULETEK = [
  "it",
  "biztonsagtechnika",
  "tuzvedelem",
  "villamos",
  "projektvezetes",
] as const;
export type AlvallalkozoiMunkaterulet = (typeof ALVALLALKOZOI_MUNKATERULETEK)[number];
export const ALVALLALKOZOI_MUNKATERULET_LABELS: Record<
  AlvallalkozoiMunkaterulet,
  string
> = {
  it: "IT",
  biztonsagtechnika: "Biztonságtechnika",
  tuzvedelem: "Tűzvédelem",
  villamos: "Villamos",
  projektvezetes: "Projektvezetés",
};

export const ALVALLALKOZOI_JELENLET_TIPUSOK = [
  "napi",
  "projektalapu",
  "mindketto",
] as const;
export type AlvallalkozoiJelenletTipus = (typeof ALVALLALKOZOI_JELENLET_TIPUSOK)[number];
export const ALVALLALKOZOI_JELENLET_LABELS: Record<AlvallalkozoiJelenletTipus, string> = {
  napi: "Napi jelenlét",
  projektalapu: "Projektalapú",
  mindketto: "Mindkettő",
};

export const ALVALLALKOZOI_SZAMLAZASI_CIKLUSOK = ["heti", "havi"] as const;
export type AlvallalkozoiSzamlazasiCiklus =
  (typeof ALVALLALKOZOI_SZAMLAZASI_CIKLUSOK)[number];
export const ALVALLALKOZOI_SZAMLAZASI_CIKLUS_LABELS: Record<
  AlvallalkozoiSzamlazasiCiklus,
  string
> = { heti: "Heti", havi: "Havi" };

/** Default number of days before the contract end when the renewal reminder is due (legacy: 30). */
export const ALAPERTELMEZETT_MEGUJITAS_EMLEKEZTETO_NAP = 30;

// ─── Érdeklődő (lead) ────────────────────────────────────────────────────────────────────────

/** Lead pipeline status — `status.key` of the Érdeklődő (legacy `Lead.status`). */
export const ERDEKLODO_ALLAPOTOK = [
  "cel",
  "megkeresve",
  "valaszolt",
  "talalkozo",
  "arajanlat_szukseges",
  "arajanlat_elkuldve",
  "utankovetes",
  "targyalas",
  "megnyert",
  "elveszett",
  "nincs_valasz",
  "kesobb",
  "nem_relevans",
] as const;
export type ErdeklodoAllapot = (typeof ERDEKLODO_ALLAPOTOK)[number];

export const ERDEKLODO_KEZDO_ALLAPOT: ErdeklodoAllapot = "cel";

export const ERDEKLODO_ALLAPOT_LABELS: Record<ErdeklodoAllapot, string> = {
  cel: "Célpont",
  megkeresve: "Megkeresve",
  valaszolt: "Válaszolt",
  talalkozo: "Találkozó",
  arajanlat_szukseges: "Árajánlat szükséges",
  arajanlat_elkuldve: "Árajánlat elküldve",
  utankovetes: "Utánkövetés",
  targyalas: "Tárgyalás",
  megnyert: "Megnyert",
  elveszett: "Elveszett",
  nincs_valasz: "Nincs válasz",
  kesobb: "Később",
  nem_relevans: "Nem releváns",
};

export const ERDEKLODO_ALLAPOT_TONES: Record<ErdeklodoAllapot, BadgeTone> = {
  cel: "neutral",
  megkeresve: "info",
  valaszolt: "info",
  talalkozo: "info",
  arajanlat_szukseges: "warning",
  arajanlat_elkuldve: "warning",
  utankovetes: "warning",
  targyalas: "warning",
  megnyert: "success",
  elveszett: "danger",
  nincs_valasz: "neutral",
  kesobb: "neutral",
  nem_relevans: "neutral",
};

/** Statuses that close the lead — it no longer counts as an open assignment. */
export const ERDEKLODO_LEZART_ALLAPOTOK: readonly ErdeklodoAllapot[] = [
  "megnyert",
  "elveszett",
  "nincs_valasz",
  "nem_relevans",
];

export const ERDEKLODO_TEVEKENYSEG_TIPUSOK = [
  "hivas",
  "email",
  "talalkozo",
  "jegyzet",
  "allapotvaltas",
  "ajanlat_letrehozva",
  "utanakovetes",
] as const;
export type ErdeklodoTevekenysegTipus = (typeof ERDEKLODO_TEVEKENYSEG_TIPUSOK)[number];
export const ERDEKLODO_TEVEKENYSEG_LABELS: Record<ErdeklodoTevekenysegTipus, string> = {
  hivas: "Telefonhívás",
  email: "E-mail",
  talalkozo: "Találkozó",
  jegyzet: "Jegyzet",
  allapotvaltas: "Állapotváltás",
  ajanlat_letrehozva: "Ajánlat létrehozva",
  utanakovetes: "Utánkövetés",
};

/** Activity types a user may log by hand (the others are written by the system). */
export const ERDEKLODO_KEZI_TEVEKENYSEG_TIPUSOK = [
  "hivas",
  "email",
  "talalkozo",
  "jegyzet",
  "utanakovetes",
] as const satisfies readonly ErdeklodoTevekenysegTipus[];

export const ARCHIVALAS_OK_MAX = 500;
