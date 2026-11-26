import type { BadgeTone } from "@erp/ui";

/** Client-safe constants of the arlista module — no Mongoose here. */

// ── Katalógus (termék / szolgáltatás / munkadíj) ───────────────────────────────

export const TETEL_TIPUSOK = ["termek", "szolgaltatas", "munkadij", "csomag"] as const;
export type TetelTipus = (typeof TETEL_TIPUSOK)[number];

export const TETEL_TIPUS_LABELS: Record<TetelTipus, string> = {
  termek: "Termék",
  szolgaltatas: "Szolgáltatás",
  munkadij: "Munkadíj",
  csomag: "Csomag",
};

/** Default code prefix per type — `nextSequence` builds `HW-0001` from it. */
export const TETEL_ALAP_ELOTAGOK: Record<TetelTipus, string> = {
  termek: "HW",
  szolgaltatas: "SW",
  munkadij: "MD",
  csomag: "CS",
};

export const KOD_ELOTAG_MINTA = /^[A-Z][A-Z0-9]{0,5}$/;
export const KOD_SORSZAM_HOSSZ = 4;

export const PENZNEMEK = ["HUF", "EUR", "USD"] as const;
export type Penznem = (typeof PENZNEMEK)[number];

/** Hungarian standard VAT rates, in percent. */
export const AFA_KULCSOK = [0, 5, 18, 27] as const;
export const ALAP_AFA_KULCS = 27;

export const TETEL_EGYSEGEK = [
  "db",
  "óra",
  "nap",
  "m",
  "m²",
  "kg",
  "csomag",
  "alkalom",
  "hó",
];

export const ARCHIVALAS_OK_MAX = 500;

// ── Szolgáltatás árképzés ──────────────────────────────────────────────────────

export const ARAZASI_TIPUSOK = ["fix", "oradij", "egyedi", "egysegalapu"] as const;
export type ArazasiTipus = (typeof ARAZASI_TIPUSOK)[number];

export const ARAZASI_TIPUS_LABELS: Record<ArazasiTipus, string> = {
  fix: "Fix ár",
  oradij: "Óradíj alapú",
  egyedi: "Egyedi árajánlat",
  egysegalapu: "Egységalapú (sávos)",
};

export const ARAZASI_TIPUS_TONES: Record<ArazasiTipus, BadgeTone> = {
  fix: "neutral",
  oradij: "info",
  egyedi: "warning",
  egysegalapu: "success",
};

/** Internal hourly-rate categories (legacy `hourly_rates` keys). */
export const ORADIJ_KATEGORIAK = [
  "it_uzemeltetes",
  "it_fejlesztes",
  "biztonsagtechnika_szerelo",
  "biztonsagtechnika_tervezo",
  "tuzvedelem_szerelo",
  "tuzvedelem_tervezo",
  "villamossag_altalanos",
  "villamossag_ipari",
  "projektvezetes",
  "tanacsadas",
] as const;
export type OradijKategoria = (typeof ORADIJ_KATEGORIAK)[number];

export const ORADIJ_KATEGORIA_LABELS: Record<OradijKategoria, string> = {
  it_uzemeltetes: "IT üzemeltetés",
  it_fejlesztes: "IT fejlesztés",
  biztonsagtechnika_szerelo: "Biztonságtechnika — szerelő",
  biztonsagtechnika_tervezo: "Biztonságtechnika — tervező",
  tuzvedelem_szerelo: "Tűzvédelem — szerelő",
  tuzvedelem_tervezo: "Tűzvédelem — tervező",
  villamossag_altalanos: "Villamosság — általános",
  villamossag_ipari: "Villamosság — ipari",
  projektvezetes: "Projektvezetés",
  tanacsadas: "Tanácsadás",
};

/** Customer multiplier columns of the matrix (legacy `client_multipliers` keys). */
export const UGYFEL_SZORZO_KULCSOK = [
  "maganszemely",
  "kkv_eseti",
  "kkv_6_honapos",
  "kkv_1_eves",
  "kkv_2_eves",
  "nagyvallalat",
  "alvallalkozo_jelenlet",
  "alvallalkozo_projekt",
  "kulso_pm",
] as const;
export type UgyfelSzorzoKulcs = (typeof UGYFEL_SZORZO_KULCSOK)[number];

export const UGYFEL_SZORZO_LABELS: Record<UgyfelSzorzoKulcs, string> = {
  maganszemely: "Magánszemély",
  kkv_eseti: "KKV — eseti",
  kkv_6_honapos: "KKV — 6 hónapos",
  kkv_1_eves: "KKV — 1 éves",
  kkv_2_eves: "KKV — 2 éves",
  nagyvallalat: "Nagyvállalat",
  alvallalkozo_jelenlet: "Alvállalkozó — napi jelenlét",
  alvallalkozo_projekt: "Alvállalkozó — projekt",
  kulso_pm: "Külső projektmenedzser",
};

export const ANYAG_POTLEK_KULCSOK = [
  "eseti",
  "szerzodott",
  "nagyvallalat",
  "alvallalkozo",
] as const;
export type AnyagPotlekKulcs = (typeof ANYAG_POTLEK_KULCSOK)[number];

export const ANYAG_POTLEK_LABELS: Record<AnyagPotlekKulcs, string> = {
  eseti: "Eseti ügyfél",
  szerzodott: "Szerződött ügyfél",
  nagyvallalat: "Nagyvállalat",
  alvallalkozo: "Alvállalkozó",
};

/** Urgency multipliers (legacy `urgency_multipliers` keys). */
export const SURGOSSEG_KULCSOK = [
  "aznapi",
  "munkaidon_kivuli",
  "hetvege",
  "ejszakai",
] as const;
export type SurgossegKulcs = (typeof SURGOSSEG_KULCSOK)[number];

export const SURGOSSEG_LABELS: Record<SurgossegKulcs, string> = {
  aznapi: "Aznapi",
  munkaidon_kivuli: "Munkaidőn kívüli",
  hetvege: "Hétvége",
  ejszakai: "Éjszakai",
};

/**
 * Partner pricing-profile enums, defined locally: the sibling `partner` module is built
 * independently and arlista must not import it. The app layer maps its partner profile onto
 * these (see `PartnerArazasiProfil`).
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
  alvallalkozo_megbizo: "Alvállalkozó megbízó",
  beszallito: "Beszállító",
  vegyes: "Vegyes",
};

export const UGYFEL_KATEGORIAK = ["maganszemely", "kkv", "nagyvallalat"] as const;
export type UgyfelKategoria = (typeof UGYFEL_KATEGORIAK)[number];

export const UGYFEL_KATEGORIA_LABELS: Record<UgyfelKategoria, string> = {
  maganszemely: "Magánszemély",
  kkv: "KKV",
  nagyvallalat: "Nagyvállalat",
};

export const SZERZODES_TIPUSOK = ["eseti", "6_honapos", "1_eves", "2_eves"] as const;
export type SzerzodesTipus = (typeof SZERZODES_TIPUSOK)[number];

export const SZERZODES_TIPUS_LABELS: Record<SzerzodesTipus, string> = {
  eseti: "Eseti",
  "6_honapos": "6 hónapos",
  "1_eves": "1 éves",
  "2_eves": "2 éves",
};

export const ALVALLALKOZOI_JELENLET_TIPUSOK = [
  "napi_jelenlet",
  "projekt",
  "mindketto",
] as const;
export type AlvallalkozoiJelenlet = (typeof ALVALLALKOZOI_JELENLET_TIPUSOK)[number];

export const ALVALLALKOZOI_JELENLET_LABELS: Record<AlvallalkozoiJelenlet, string> = {
  napi_jelenlet: "Napi jelenlét",
  projekt: "Projektalapú",
  mindketto: "Mindkettő",
};

export type PartnerArazasiProfil = {
  szerep?: PartnerSzerep | null;
  ugyfelKategoria?: UgyfelKategoria | null;
  szerzodesTipus?: SzerzodesTipus | null;
  alvallalkozoiJelenlet?: AlvallalkozoiJelenlet | null;
};

export type OradijTabla = Record<OradijKategoria, number>;
export type UgyfelSzorzoTabla = Record<UgyfelSzorzoKulcs, number>;
export type AnyagPotlekTabla = Record<AnyagPotlekKulcs, number>;
export type SurgossegTabla = Record<SurgossegKulcs, number>;

/** The shape the pure price functions read (and `ArazasiBeallitas` stores). */
export type ArazasiBeallitasok = {
  rezsiSzorzo: number;
  haviFixKoltseg: number;
  haviTermelekenyOrak: number;
  oradijak: OradijTabla;
  ugyfelSzorzok: UgyfelSzorzoTabla;
  anyagPotlekok: AnyagPotlekTabla;
  surgossegiSzorzok: SurgossegTabla;
  /** VAT as a fraction (0.27). */
  afaKulcs: number;
  minKiszallasiDij: number;
  minProjektDij: number;
};

export const ALAP_ARAZASI_BEALLITASOK: ArazasiBeallitasok = {
  rezsiSzorzo: 1.45,
  haviFixKoltseg: 500_000,
  haviTermelekenyOrak: 160,
  oradijak: {
    it_uzemeltetes: 5500,
    it_fejlesztes: 7500,
    biztonsagtechnika_szerelo: 5000,
    biztonsagtechnika_tervezo: 6500,
    tuzvedelem_szerelo: 5000,
    tuzvedelem_tervezo: 6500,
    villamossag_altalanos: 5500,
    villamossag_ipari: 6500,
    projektvezetes: 7000,
    tanacsadas: 8000,
  },
  ugyfelSzorzok: {
    maganszemely: 1.3,
    kkv_eseti: 1.2,
    kkv_6_honapos: 1.08,
    kkv_1_eves: 1.0,
    kkv_2_eves: 0.92,
    nagyvallalat: 0.88,
    alvallalkozo_jelenlet: 0.75,
    alvallalkozo_projekt: 0.8,
    kulso_pm: 0.9,
  },
  anyagPotlekok: {
    eseti: 0.12,
    szerzodott: 0.08,
    nagyvallalat: 0.06,
    alvallalkozo: 0.05,
  },
  surgossegiSzorzok: { aznapi: 1.3, munkaidon_kivuli: 1.5, hetvege: 1.75, ejszakai: 2.0 },
  afaKulcs: 0.27,
  minKiszallasiDij: 15_000,
  minProjektDij: 50_000,
};

/** Rounding step of every calculated price (HUF). */
export const AR_KEREKITES = 100;

/** Default service categories seeded on first use (Excel V5 matrix structure). */
export const ALAP_SZOLGALTATAS_KATEGORIAK = [
  { nev: "IT Rendszerüzemeltetés", kodElotag: "IT", ikon: "Monitor", szin: "#6366f1" },
  {
    nev: "Hálózatépítés és Fejlesztés",
    kodElotag: "HL",
    ikon: "Network",
    szin: "#8b5cf6",
  },
  { nev: "Weboldal és Fejlesztés", kodElotag: "WB", ikon: "Globe", szin: "#06b6d4" },
  { nev: "Szerviz és Javítás", kodElotag: "SZ", ikon: "Wrench", szin: "#f59e0b" },
  { nev: "NIS2 Megfelelés", kodElotag: "N2", ikon: "Shield", szin: "#10b981" },
  { nev: "Biztonságtechnika", kodElotag: "BT", ikon: "Camera", szin: "#f43f5e" },
  { nev: "Tűzjelző Rendszer", kodElotag: "TJ", ikon: "Flame", szin: "#ef4444" },
  { nev: "Tűzvédelem", kodElotag: "TV", ikon: "ShieldAlert", szin: "#dc2626" },
  { nev: "Épületvillamosság", kodElotag: "VL", ikon: "Zap", szin: "#eab308" },
  { nev: "Projekt Megbízott", kodElotag: "PM", ikon: "ClipboardList", szin: "#64748b" },
] as const;

// ── Jogosultságok ──────────────────────────────────────────────────────────────

export const ARLISTA_PERMISSIONS = {
  termekRead: "arlista:termek:read",
  termekWrite: "arlista:termek:write",
  termekDelete: "arlista:termek:delete",
  szolgaltatasRead: "arlista:szolgaltatas:read",
  szolgaltatasWrite: "arlista:szolgaltatas:write",
  szolgaltatasDelete: "arlista:szolgaltatas:delete",
  beallitasWrite: "arlista:beallitas:write",
  beszerzesRead: "arlista:beszerzes:read",
  beszerzesWrite: "arlista:beszerzes:write",
} as const;

export type ArlistaViewer = { userId: string; permissions: readonly string[] };
