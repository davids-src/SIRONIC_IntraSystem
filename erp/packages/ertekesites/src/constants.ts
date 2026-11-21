import type { BadgeTone } from "@erp/ui";

/**
 * Client-safe vocabulary of the értékesítés module (offers, contracts, purchase orders).
 * Keys are stable identifiers stored in the database; labels are what the user sees.
 */

export const ARCHIVALAS_OK_MAX = 500;
export const PENZNEMEK = ["HUF", "EUR", "USD"] as const;
export type Penznem = (typeof PENZNEMEK)[number];
export const AFA_KULCSOK = [0, 5, 18, 27] as const;
export const ALAP_AFA_KULCS = 27;

// ── Ajánlat ────────────────────────────────────────────────────────────────────

export const AJANLAT_ALLAPOTOK = [
  "piszkozat",
  "kesz",
  "elkuldve",
  "elfogadva",
  "elutasitva",
] as const;
export type AjanlatAllapot = (typeof AJANLAT_ALLAPOTOK)[number];
export const AJANLAT_KEZDO_ALLAPOT: AjanlatAllapot = "piszkozat";

export const AJANLAT_ALLAPOT_LABELS: Record<AjanlatAllapot, string> = {
  piszkozat: "Piszkozat",
  kesz: "Kész",
  elkuldve: "Elküldve",
  elfogadva: "Elfogadva",
  elutasitva: "Elutasítva",
};
export const AJANLAT_ALLAPOT_TONES: Record<AjanlatAllapot, BadgeTone> = {
  piszkozat: "neutral",
  kesz: "info",
  elkuldve: "warning",
  elfogadva: "success",
  elutasitva: "danger",
};

/** Guarded status transitions — the facade rejects anything not listed. */
export const AJANLAT_ATMENETEK: Record<AjanlatAllapot, readonly AjanlatAllapot[]> = {
  piszkozat: ["kesz", "elkuldve"],
  kesz: ["piszkozat", "elkuldve"],
  elkuldve: ["elfogadva", "elutasitva"],
  elfogadva: [],
  elutasitva: ["piszkozat"],
};

export const ELVESZTES_OKOK = [
  "ar",
  "versenytars",
  "projekt_elmaradt",
  "belso_megoldas",
  "nincs_valasz",
  "idozites",
  "muszaki_tartalom",
  "ismeretlen",
  "egyeb",
] as const;
export type ElvesztesOk = (typeof ELVESZTES_OKOK)[number];
export const ELVESZTES_OK_LABELS: Record<ElvesztesOk, string> = {
  ar: "Ár",
  versenytars: "Versenytárs",
  projekt_elmaradt: "A projekt elmaradt",
  belso_megoldas: "Belső megoldás",
  nincs_valasz: "Nincs válasz",
  idozites: "Időzítés",
  muszaki_tartalom: "Műszaki tartalom",
  ismeretlen: "Ismeretlen",
  egyeb: "Egyéb",
};

/** Where an offer line came from: árlista product, árlista service, or typed in by hand. */
export const SOR_FORRASOK = ["termek", "szolgaltatas", "kezi"] as const;
export type SorForras = (typeof SOR_FORRASOK)[number];
export const SOR_FORRAS_LABELS: Record<SorForras, string> = {
  termek: "Termék",
  szolgaltatas: "Szolgáltatás",
  kezi: "Kézi tétel",
};

export const SOR_TIPUSOK = ["termek", "szolgaltatas", "munkadij", "egyeb"] as const;
export type SorTipus = (typeof SOR_TIPUSOK)[number];
export const SOR_TIPUS_LABELS: Record<SorTipus, string> = {
  termek: "Termék",
  szolgaltatas: "Szolgáltatás",
  munkadij: "Munkadíj",
  egyeb: "Egyéb",
};

export const UTANKOVETES_MUNKANAP = 3;

// ── Szerződés ──────────────────────────────────────────────────────────────────

export const SZERZODES_TIPUSOK = ["generalt", "feltoltott"] as const;
export type SzerzodesTipus = (typeof SZERZODES_TIPUSOK)[number];
export const SZERZODES_TIPUS_LABELS: Record<SzerzodesTipus, string> = {
  generalt: "Sablonból generált",
  feltoltott: "Feltöltött",
};

export const SZERZODES_ALLAPOTOK = [
  "piszkozat",
  "elkuldve",
  "digitalisan_alairt",
  "papiron_alairt",
  "torolt",
] as const;
export type SzerzodesAllapot = (typeof SZERZODES_ALLAPOTOK)[number];
export const SZERZODES_ALLAPOT_LABELS: Record<SzerzodesAllapot, string> = {
  piszkozat: "Piszkozat",
  elkuldve: "Elküldve",
  digitalisan_alairt: "Digitálisan aláírt",
  papiron_alairt: "Papíron aláírt",
  torolt: "Törölt",
};
export const SZERZODES_ALLAPOT_TONES: Record<SzerzodesAllapot, BadgeTone> = {
  piszkozat: "neutral",
  elkuldve: "warning",
  digitalisan_alairt: "success",
  papiron_alairt: "success",
  torolt: "danger",
};
export const SZERZODES_ATMENETEK: Record<SzerzodesAllapot, readonly SzerzodesAllapot[]> =
  {
    piszkozat: ["elkuldve", "torolt"],
    elkuldve: ["digitalisan_alairt", "papiron_alairt", "piszkozat", "torolt"],
    digitalisan_alairt: ["torolt"],
    papiron_alairt: ["torolt"],
    torolt: [],
  };

export const ALAIRAS_TIPUSOK = ["digitalis", "papir", "nincs"] as const;
export type AlairasTipus = (typeof ALAIRAS_TIPUSOK)[number];
export const ALAIRAS_TIPUS_LABELS: Record<AlairasTipus, string> = {
  digitalis: "Digitális",
  papir: "Papír",
  nincs: "Nincs aláírás",
};

/** Variables the system fills in itself — never asked from the user. */
export const RENDSZER_VALTOZOK = ["partner_nev"] as const;

// ── Megrendelőlap ──────────────────────────────────────────────────────────────

export const MEGRENDELO_ALLAPOTOK = [
  "piszkozat",
  "elkuldve",
  "teljesitve",
  "torolt",
] as const;
export type MegrendeloAllapot = (typeof MEGRENDELO_ALLAPOTOK)[number];
export const MEGRENDELO_ALLAPOT_LABELS: Record<MegrendeloAllapot, string> = {
  piszkozat: "Piszkozat",
  elkuldve: "Elküldve",
  teljesitve: "Teljesítve",
  torolt: "Törölt",
};
export const MEGRENDELO_ALLAPOT_TONES: Record<MegrendeloAllapot, BadgeTone> = {
  piszkozat: "neutral",
  elkuldve: "warning",
  teljesitve: "success",
  torolt: "danger",
};
export const MEGRENDELO_ATMENETEK: Record<
  MegrendeloAllapot,
  readonly MegrendeloAllapot[]
> = {
  piszkozat: ["elkuldve", "torolt"],
  elkuldve: ["teljesitve", "piszkozat", "torolt"],
  teljesitve: [],
  torolt: [],
};

// ── Permissions & viewer ───────────────────────────────────────────────────────

export const ERTEKESITES_PERMISSIONS = {
  ajanlatRead: "ertekesites:ajanlat:read",
  ajanlatWrite: "ertekesites:ajanlat:write",
  ajanlatDelete: "ertekesites:ajanlat:delete",
  ajanlatKuld: "ertekesites:ajanlat:kuld",
  szerzodesRead: "ertekesites:szerzodes:read",
  szerzodesWrite: "ertekesites:szerzodes:write",
  szerzodesDelete: "ertekesites:szerzodes:delete",
  megrendeloRead: "ertekesites:megrendelo:read",
  megrendeloWrite: "ertekesites:megrendelo:write",
  megrendeloDelete: "ertekesites:megrendelo:delete",
} as const;

export type ErtekesitesViewer = { userId: string; permissions: readonly string[] };

/** The user performing a write — names are snapshotted into history entries. */
export type Szereplo = { id: string; nev: string };

// ── Typed errors ───────────────────────────────────────────────────────────────

export type DokumentumFajta = "ajanlat" | "szerzodes" | "megrendelo";

/** Thrown by `assertSzerkesztheto` when the content of a non-draft document is edited. */
export class NemSzerkeszthetoError extends Error {
  readonly code = "nem_szerkesztheto" as const;
  constructor(
    public readonly dokumentum: DokumentumFajta,
    public readonly allapot: string,
  ) {
    super(
      `A dokumentum tartalma csak piszkozat állapotban szerkeszthető (jelenlegi állapot: ${allapot}).`,
    );
    this.name = "NemSzerkeszthetoError";
  }
}

export function assertSzerkesztheto(dokumentum: DokumentumFajta, allapot: string): void {
  if (allapot !== "piszkozat") throw new NemSzerkeszthetoError(dokumentum, allapot);
}
