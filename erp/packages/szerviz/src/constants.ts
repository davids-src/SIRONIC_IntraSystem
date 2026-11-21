import type { BadgeTone } from "@erp/ui";

/**
 * Client-safe vocabulary of the szerviz module (hibajegy, munkalap, karbantartási terv).
 * Keys are stable identifiers stored in the database; labels are what the user sees.
 */

export const ARCHIVALAS_OK_MAX = 500;

// ── Permissions ────────────────────────────────────────────────────────────────

export const SZERVIZ_PERMISSIONS = {
  hibajegyRead: "szerviz:hibajegy:read",
  hibajegyWrite: "szerviz:hibajegy:write",
  hibajegyDelete: "szerviz:hibajegy:delete",
  /** See (and write) internal comments / the internal note of a ticket. */
  hibajegyBelso: "szerviz:hibajegy:belso",
  munkalapRead: "szerviz:munkalap:read",
  munkalapWrite: "szerviz:munkalap:write",
  munkalapDelete: "szerviz:munkalap:delete",
  /** Finalize a worklog (and trigger the stock issue). */
  munkalapLezar: "szerviz:munkalap:lezar",
  karbantartasRead: "szerviz:karbantartas:read",
  karbantartasWrite: "szerviz:karbantartas:write",
  karbantartasDelete: "szerviz:karbantartas:delete",
} as const;

// ── Viewer ─────────────────────────────────────────────────────────────────────

/**
 * Who is asking. Every Hibajegy / Munkalap read takes one. `belsoLathato` is computed by the app
 * from `szerviz:hibajegy:belso`; it defaults to FALSE (internal data is opt-in, never opt-out).
 */
export type NezoStaff = { kind: "staff"; userId: string; belsoLathato?: boolean };
export type NezoPortal = { kind: "portal"; partnerId: string };
export type Nezo = NezoStaff | NezoPortal;

/** The user performing a write — names are snapshotted into comments / history. */
export type Szereplo = { id: string; nev: string };

// ── Hibajegy ───────────────────────────────────────────────────────────────────

export const HIBAJEGY_ALLAPOTOK = [
  "uj",
  "folyamatban",
  "varakozik",
  "megoldva",
  "lezart",
] as const;
export type HibajegyAllapot = (typeof HIBAJEGY_ALLAPOTOK)[number];
export const HIBAJEGY_KEZDO_ALLAPOT: HibajegyAllapot = "uj";
export const HIBAJEGY_NYITOTT_ALLAPOTOK: readonly HibajegyAllapot[] = [
  "uj",
  "folyamatban",
  "varakozik",
];

export const HIBAJEGY_ALLAPOT_LABELS: Record<HibajegyAllapot, string> = {
  uj: "Új",
  folyamatban: "Folyamatban",
  varakozik: "Várakozik",
  megoldva: "Megoldva",
  lezart: "Lezárt",
};
export const HIBAJEGY_ALLAPOT_TONES: Record<HibajegyAllapot, BadgeTone> = {
  uj: "info",
  folyamatban: "warning",
  varakozik: "neutral",
  megoldva: "success",
  lezart: "neutral",
};

/** Guarded status transitions — the facade rejects anything not listed. */
export const HIBAJEGY_ATMENETEK: Record<HibajegyAllapot, readonly HibajegyAllapot[]> = {
  uj: ["folyamatban", "varakozik", "megoldva", "lezart"],
  folyamatban: ["varakozik", "megoldva", "lezart"],
  varakozik: ["folyamatban", "megoldva", "lezart"],
  megoldva: ["folyamatban", "lezart"],
  lezart: [],
};

export const HIBAJEGY_FORRASOK = [
  "crm",
  "portal",
  "telefon",
  "email",
  "szemelyes",
] as const;
export type HibajegyForras = (typeof HIBAJEGY_FORRASOK)[number];
export const HIBAJEGY_FORRAS_LABELS: Record<HibajegyForras, string> = {
  crm: "Belső felvétel",
  portal: "Partnerportál",
  telefon: "Telefon",
  email: "E-mail",
  szemelyes: "Személyesen",
};
/** Sources a staff member may pick (the portal source is set by the facade only). */
export const HIBAJEGY_KEZI_FORRASOK = ["crm", "telefon", "email", "szemelyes"] as const;

export const HIBAJEGY_PRIORITASOK = ["alacsony", "kozepes", "magas", "kritikus"] as const;
export type HibajegyPrioritas = (typeof HIBAJEGY_PRIORITASOK)[number];
export const HIBAJEGY_PRIORITAS_LABELS: Record<HibajegyPrioritas, string> = {
  alacsony: "Alacsony",
  kozepes: "Közepes",
  magas: "Magas",
  kritikus: "Kritikus",
};
export const HIBAJEGY_PRIORITAS_TONES: Record<HibajegyPrioritas, BadgeTone> = {
  alacsony: "neutral",
  kozepes: "info",
  magas: "warning",
  kritikus: "danger",
};

export const MEGJEGYZES_SZEREPKOROK = ["munkatars", "partner"] as const;
export type MegjegyzesSzerepkor = (typeof MEGJEGYZES_SZEREPKOROK)[number];

export const ALAP_KATEGORIA = "Általános";
export const PREVENTIV_KATEGORIA = "Preventív karbantartás";

// ── Munkalap ───────────────────────────────────────────────────────────────────

export const MUNKALAP_ALLAPOTOK = ["piszkozat", "lezart"] as const;
export type MunkalapAllapot = (typeof MUNKALAP_ALLAPOTOK)[number];
export const MUNKALAP_ALLAPOT_LABELS: Record<MunkalapAllapot, string> = {
  piszkozat: "Piszkozat",
  lezart: "Lezárt",
};
export const MUNKALAP_ALLAPOT_TONES: Record<MunkalapAllapot, BadgeTone> = {
  piszkozat: "warning",
  lezart: "success",
};

/** A worklog line is either labour (hours) or material (may leave the stock). */
export const MUNKALAP_SOR_TIPUSOK = ["munka", "anyag"] as const;
export type MunkalapSorTipus = (typeof MUNKALAP_SOR_TIPUSOK)[number];
export const MUNKALAP_SOR_TIPUS_LABELS: Record<MunkalapSorTipus, string> = {
  munka: "Munkaóra",
  anyag: "Anyag",
};

export const MUNKALAP_FORRASOK = ["termek", "szolgaltatas", "kezi"] as const;
export type MunkalapSorForras = (typeof MUNKALAP_FORRASOK)[number];

/** Signature storage limits: a data-URI image (PNG/JPEG/WebP) up to ~150 kB, or a media id. */
export const ALAIRAS_MAX_KARAKTER = 200_000;
export const ALAIRAS_MIME_TIPUSOK = ["image/png", "image/jpeg", "image/webp"] as const;

export const ALAP_MUNKALAP_KATEGORIA = "Általános munka";

// ── Karbantartási terv ─────────────────────────────────────────────────────────

export const KARBANTARTAS_MAX_INTERVALLUM_HONAP = 60;
export const KARBANTARTAS_ALAP_ELOREJELZES_NAP = 14;

export const KARBANTARTAS_ALLAPOTOK = [
  "lejart",
  "hamarosan",
  "rendben",
  "inaktiv",
] as const;
export type KarbantartasAllapot = (typeof KARBANTARTAS_ALLAPOTOK)[number];
export const KARBANTARTAS_ALLAPOT_LABELS: Record<KarbantartasAllapot, string> = {
  lejart: "Lejárt",
  hamarosan: "Hamarosan esedékes",
  rendben: "Rendben",
  inaktiv: "Inaktív",
};
export const KARBANTARTAS_ALLAPOT_TONES: Record<KarbantartasAllapot, BadgeTone> = {
  lejart: "danger",
  hamarosan: "warning",
  rendben: "success",
  inaktiv: "neutral",
};

// ── Typed errors ───────────────────────────────────────────────────────────────

/** Thrown by `assertSzerkesztheto` when a non-draft worklog's content is edited. */
export class NemSzerkeszthetoError extends Error {
  readonly code = "nem_szerkesztheto" as const;
  constructor(public readonly allapot: string) {
    super(
      `A munkalap tartalma csak piszkozat állapotban szerkeszthető (jelenlegi állapot: ${allapot}).`,
    );
    this.name = "NemSzerkeszthetoError";
  }
}

export function assertSzerkesztheto(allapot: string): void {
  if (allapot !== "piszkozat") throw new NemSzerkeszthetoError(allapot);
}
