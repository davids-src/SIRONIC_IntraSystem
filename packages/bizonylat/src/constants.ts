import type { BadgeTone } from "@erp/ui";

/**
 * Client-safe vocabulary of the bizonylat module (szállítólevél, teljesítésigazolás, számla,
 * jótállási jegy). Keys are stable identifiers stored in the database; labels are what the
 * user sees.
 */

export const ARCHIVALAS_OK_MAX = 500;
export const PENZNEMEK = ["HUF", "EUR", "USD"] as const;
export const AFA_KULCSOK = [0, 5, 18, 27] as const;
export const ALAP_AFA_KULCS = 27;

// ── Permissions & viewer ───────────────────────────────────────────────────────

export const BIZONYLAT_PERMISSIONS = {
  szallitolevelRead: "bizonylat:szallitolevel:read",
  szallitolevelWrite: "bizonylat:szallitolevel:write",
  szallitolevelDelete: "bizonylat:szallitolevel:delete",
  szallitolevelKiad: "bizonylat:szallitolevel:kiad",
  igazolasRead: "bizonylat:igazolas:read",
  igazolasWrite: "bizonylat:igazolas:write",
  igazolasDelete: "bizonylat:igazolas:delete",
  igazolasKuld: "bizonylat:igazolas:kuld",
  szamlaRead: "bizonylat:szamla:read",
  szamlaWrite: "bizonylat:szamla:write",
  szamlaDelete: "bizonylat:szamla:delete",
  szamlaKiallit: "bizonylat:szamla:kiallit",
  jotallasRead: "bizonylat:jotallas:read",
  jotallasWrite: "bizonylat:jotallas:write",
  jotallasDelete: "bizonylat:jotallas:delete",
} as const;

/** The user performing a write — names are snapshotted into history entries. */
export type Szereplo = { id: string; nev: string };

/**
 * Viewer of a certificate read. A portal viewer sees only its own partner's sent/decided
 * certificates and never the internal fields; staff sees internal fields only with
 * `belsoLathato` (the write permission).
 */
export type NezoStaff = { kind: "staff"; userId: string; belsoLathato?: boolean };
export type NezoPortal = { kind: "portal"; partnerId: string };
export type Nezo = NezoStaff | NezoPortal;

// ── Szállítólevél ──────────────────────────────────────────────────────────────

export const SZALLITOLEVEL_ALLAPOTOK = ["piszkozat", "kiadva", "sztorno"] as const;
export type SzallitolevelAllapot = (typeof SZALLITOLEVEL_ALLAPOTOK)[number];
export const SZALLITOLEVEL_ALLAPOT_LABELS: Record<SzallitolevelAllapot, string> = {
  piszkozat: "Piszkozat",
  kiadva: "Kiadva",
  sztorno: "Sztornó",
};
export const SZALLITOLEVEL_ALLAPOT_TONES: Record<SzallitolevelAllapot, BadgeTone> = {
  piszkozat: "neutral",
  kiadva: "success",
  sztorno: "danger",
};
export const SZALLITOLEVEL_ATMENETEK: Record<
  SzallitolevelAllapot,
  readonly SzallitolevelAllapot[]
> = {
  piszkozat: ["kiadva", "sztorno"],
  kiadva: ["sztorno"],
  sztorno: [],
};

/** Result of the stock-out port call recorded on an issued note. */
export const KESZLET_KIADAS_ALLAPOTOK = ["fuggoben", "kesz", "hiba"] as const;
export type KeszletKiadasAllapot = (typeof KESZLET_KIADAS_ALLAPOTOK)[number];
export const KESZLET_KIADAS_LABELS: Record<KeszletKiadasAllapot, string> = {
  fuggoben: "Folyamatban",
  kesz: "Készletből kiadva",
  hiba: "Készletlevonás sikertelen",
};

// ── Teljesítésigazolás ─────────────────────────────────────────────────────────

export const IGAZOLAS_ALLAPOTOK = [
  "piszkozat",
  "elkuldve",
  "elfogadva",
  "elutasitva",
] as const;
export type IgazolasAllapot = (typeof IGAZOLAS_ALLAPOTOK)[number];
export const IGAZOLAS_ALLAPOT_LABELS: Record<IgazolasAllapot, string> = {
  piszkozat: "Piszkozat",
  elkuldve: "Elküldve",
  elfogadva: "Elfogadva",
  elutasitva: "Elutasítva",
};
export const IGAZOLAS_ALLAPOT_TONES: Record<IgazolasAllapot, BadgeTone> = {
  piszkozat: "neutral",
  elkuldve: "warning",
  elfogadva: "success",
  elutasitva: "danger",
};
/** Accepted and rejected are terminal. */
export const IGAZOLAS_VEGALLAPOTOK: readonly IgazolasAllapot[] = [
  "elfogadva",
  "elutasitva",
];

export const IGAZOLAS_FORRASOK = ["ajanlat", "munkalap", "projekt", "kezi"] as const;
export type IgazolasForras = (typeof IGAZOLAS_FORRASOK)[number];
export const IGAZOLAS_FORRAS_LABELS: Record<IgazolasForras, string> = {
  ajanlat: "Ajánlat",
  munkalap: "Munkalap",
  projekt: "Projekt",
  kezi: "Kézi",
};

/** Magic-link validity. */
export const IGAZOLAS_TOKEN_NAP = 30;
/** Signature image limits: a data-URI, png/jpeg/webp, at most ~200 kB of text. */
export const ALAIRAS_MAX_KARAKTER = 200_000;
export const ALAIRAS_MIME_TIPUSOK = ["image/png", "image/jpeg", "image/webp"] as const;

// ── Számla ─────────────────────────────────────────────────────────────────────

export const SZAMLA_ALLAPOTOK = [
  "piszkozat",
  "elkuldve",
  "kifizetve",
  "lejart",
  "sztorno",
] as const;
export type SzamlaAllapot = (typeof SZAMLA_ALLAPOTOK)[number];
/** Stored states: `lejart` is never stored, it is computed at read time from `elkuldve`. */
export const SZAMLA_TAROLT_ALLAPOTOK = [
  "piszkozat",
  "elkuldve",
  "kifizetve",
  "sztorno",
] as const;
export type SzamlaTaroltAllapot = (typeof SZAMLA_TAROLT_ALLAPOTOK)[number];
export const SZAMLA_ALLAPOT_LABELS: Record<SzamlaAllapot, string> = {
  piszkozat: "Piszkozat",
  elkuldve: "Elküldve",
  kifizetve: "Kifizetve",
  lejart: "Lejárt",
  sztorno: "Sztornó",
};
export const SZAMLA_ALLAPOT_TONES: Record<SzamlaAllapot, BadgeTone> = {
  piszkozat: "neutral",
  elkuldve: "info",
  kifizetve: "success",
  lejart: "danger",
  sztorno: "neutral",
};
export const SZAMLA_ATMENETEK: Record<
  SzamlaTaroltAllapot,
  readonly SzamlaTaroltAllapot[]
> = {
  piszkozat: ["elkuldve", "sztorno"],
  elkuldve: ["kifizetve", "sztorno"],
  kifizetve: [],
  sztorno: [],
};

// ── Jótállási jegy ─────────────────────────────────────────────────────────────

export const JOTALLAS_ALLAPOTOK = ["aktiv", "lejart", "igenyelt", "ervenytelen"] as const;
export type JotallasAllapot = (typeof JOTALLAS_ALLAPOTOK)[number];
export const JOTALLAS_TAROLT_ALLAPOTOK = ["aktiv", "igenyelt", "ervenytelen"] as const;
export type JotallasTaroltAllapot = (typeof JOTALLAS_TAROLT_ALLAPOTOK)[number];
export const JOTALLAS_ALLAPOT_LABELS: Record<JotallasAllapot, string> = {
  aktiv: "Aktív",
  lejart: "Lejárt",
  igenyelt: "Igényelt",
  ervenytelen: "Érvénytelen",
};
export const JOTALLAS_ALLAPOT_TONES: Record<JotallasAllapot, BadgeTone> = {
  aktiv: "success",
  lejart: "neutral",
  igenyelt: "warning",
  ervenytelen: "danger",
};
export const JOTALLAS_ATMENETEK: Record<
  JotallasTaroltAllapot,
  readonly JotallasTaroltAllapot[]
> = {
  aktiv: ["igenyelt", "ervenytelen"],
  igenyelt: ["aktiv", "ervenytelen"],
  ervenytelen: [],
};
export const JOTALLAS_EV_MAX = 10;

export const ALAP_JOTALLASI_SZOVEG = `A jótállás a vásárlás (átadás) napjától számított jótállási időtartam alatt a termék rendeltetésszerű használata során jelentkező gyártási és anyaghibákra terjed ki.

A jótállás nem terjed ki a helytelen használatból, szakszerűtlen beépítésből vagy tárolásból, elemi kárból, illetéktelen beavatkozásból, valamint a természetes elhasználódásból eredő hibákra.

Hiba esetén kérjük, jelezze azt a kiállítónak a jótállási jegy számának megadásával. A jótállási igény érvényesítéséhez a jótállási jegy és a vásárlást igazoló bizonylat bemutatása szükséges. A fogyasztót a jogszabályban meghatározott kellékszavatossági és jótállási jogok illetik meg.`;
export const JOGI_SZOVEG_MAX = 20_000;

// ── Typed errors ───────────────────────────────────────────────────────────────

export type BizonylatFajta = "szallitolevel" | "igazolas" | "szamla" | "jotallas";

/** Thrown when the content of a non-draft document is edited. */
export class NemSzerkeszthetoError extends Error {
  readonly code = "nem_szerkesztheto" as const;
  constructor(
    public readonly bizonylat: BizonylatFajta,
    public readonly allapot: string,
  ) {
    super(
      `A bizonylat tartalma csak piszkozat állapotban szerkeszthető (jelenlegi állapot: ${allapot}).`,
    );
    this.name = "NemSzerkeszthetoError";
  }
}

export function assertSzerkesztheto(bizonylat: BizonylatFajta, allapot: string): void {
  if (allapot !== "piszkozat") throw new NemSzerkeszthetoError(bizonylat, allapot);
}
