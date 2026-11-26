import type {
  HibajegyAllapot,
  HibajegyForras,
  HibajegyPrioritas,
  KarbantartasAllapot,
  MegjegyzesSzerepkor,
  MunkalapAllapot,
  MunkalapSorForras,
  MunkalapSorTipus,
} from "./constants";

/**
 * Frozen price an árlista line embeds. Structurally identical to `@erp/arlista`'s `ArSnapshot`
 * (defined locally: this module must not import arlista — the app passes the snapshot it got
 * from `arlistaApi.priceSnapshot`). After write time the price is NEVER re-read.
 */
export type ArSnapshotAdat = {
  forras: "szolgaltatas" | "termek";
  tetelId: string;
  kod: string;
  nev: string;
  egyseg: string;
  arazasiTipus: string;
  belsoAlapar: number;
  szorzoKulcs: string | null;
  ugyfelSzorzo: number;
  kalkulaltAr: number;
  surgosseg: string | null;
  surgossegiSzorzo: number;
  vegAr: number;
  egyedi: boolean;
  egysegDb: number | null;
  afaKulcs: number;
  penznem: string;
  keszult: string;
};

export type Eredmeny<T = object> =
  | ({ ok: true } & T)
  | { ok: false; message: string; code?: "nem_szerkesztheto" | "ervenytelen_atmenet" };

// ── Hibajegy ───────────────────────────────────────────────────────────────────

export type HibajegyListItem = {
  _id: string;
  azonosito: string;
  targy: string;
  partnerNev?: string;
  felelosNev?: string;
  allapot: HibajegyAllapot;
  prioritas: HibajegyPrioritas;
  forras: HibajegyForras;
  kategoria: string;
  archivalt: boolean;
  createdAt: string;
};

export type MegjegyzesSor = {
  id: string;
  szerzoNev: string;
  szerepkor: MegjegyzesSzerepkor;
  uzenet: string;
  belso: boolean;
  letrehozva: string;
};

export type HibajegyElozmeny = {
  allapot: HibajegyAllapot;
  idopont: string;
  megjegyzes?: string;
};

/** Full staff view. Internal comments / note appear only for `belsoLathato` staff viewers. */
export type HibajegyDetail = {
  id: string;
  azonosito: string;
  partnerId?: string;
  partnerNev?: string;
  egyszeriNev?: string;
  egyszeriTelefon?: string;
  projektId?: string;
  forras: HibajegyForras;
  prioritas: HibajegyPrioritas;
  allapot: HibajegyAllapot;
  kategoria: string;
  targy: string;
  leiras: string;
  helyszin?: string;
  erintettTetelek?: string;
  megoldasJegyzet?: string;
  megoldva?: string;
  felelosId?: string;
  felelosNev?: string;
  belsoJegyzet?: string;
  megjegyzesek: MegjegyzesSor[];
  elozmenyek: HibajegyElozmeny[];
  karbantartasiTervId?: string;
  archivalt: boolean;
  archivalasOka?: string;
  createdAt: string;
  updatedAt: string;
};

/** What a portal viewer may see — allow-listed (no assignee, internal comments/note, history). */
export type HibajegyPortalNezet = {
  id: string;
  azonosito: string;
  targy: string;
  leiras: string;
  allapot: HibajegyAllapot;
  prioritas: HibajegyPrioritas;
  kategoria: string;
  helyszin?: string;
  erintettTetelek?: string;
  megoldasJegyzet?: string;
  megjegyzesek: Array<{
    id: string;
    szerepkor: MegjegyzesSzerepkor;
    /** Only the partner's own authors are named; staff appear as the service desk. */
    szerzoNev?: string;
    uzenet: string;
    letrehozva: string;
  }>;
  createdAt: string;
  updatedAt: string;
};

export type HibajegyOsszegzes = {
  nyitott: number;
  uj: number;
  varakozik: number;
  kritikus: number;
  megoldva: number;
};

// ── Munkalap ───────────────────────────────────────────────────────────────────

export type MunkalapSor = {
  tipus: MunkalapSorTipus;
  forras: MunkalapSorForras;
  arlistaTetelId?: string;
  leiras: string;
  mennyiseg: number;
  egyseg: string;
  /** Net unit price. With a snapshot it is the snapshot's `vegAr` (set by the server). */
  nettoEgysegar?: number;
  /** Material line that leaves the stock on finalize. */
  keszletbolKiad?: boolean;
  arSnapshot?: ArSnapshotAdat;
};

export type KeszletKiadasSor = {
  /** Index of the worklog line (for the preflight dialog). */
  sorIndex: number;
  arlistaTermekId: string;
  mennyiseg: number;
  nev: string;
  egyseg: string;
};
/** The material lines a finalized worklog takes from the stock. */
export type KeszletKiadasTerv = KeszletKiadasSor[];

export type KeszletPreflightSor = {
  sorIndex: number;
  arlistaTermekId: string;
  nev?: string;
  kert: number;
  szabad: number;
  elegendo: boolean;
  uzenet?: string;
};
export type KeszletPreflightEredmeny = {
  osszesElegendo: boolean;
  sorok: KeszletPreflightSor[];
};

/**
 * Port to the stock module — defined here because `@erp/szerviz` must not import `@erp/keszlet`
 * (the app binds it). `kiad` must be idempotent on `ref` (a retry must not issue stock twice).
 */
export type KeszletKiadasPort = {
  preflight(sorok: KeszletKiadasTerv): Promise<KeszletPreflightEredmeny>;
  kiad(
    sorok: KeszletKiadasTerv,
    ref: { tipus: "munkalap"; id: string; azonosito: string },
  ): Promise<{ ok: true; uzenet?: string } | { ok: false; message: string }>;
};

export type MunkalapListItem = {
  _id: string;
  azonosito: string;
  partnerNev?: string;
  szerelo: string;
  munkaDatum: string;
  kategoria: string;
  allapot: MunkalapAllapot;
  munkaOra: number;
  keszletKiadva: boolean;
  archivalt: boolean;
  createdAt: string;
};

export type MunkalapDetail = {
  id: string;
  azonosito: string;
  partnerId?: string;
  partnerNev?: string;
  egyszeriNev?: string;
  egyszeriTelefon?: string;
  projektId?: string;
  hibajegyId?: string;
  allapot: MunkalapAllapot;
  munkaDatum: string;
  munkaKezdet?: string;
  munkaVege?: string;
  szerelo: string;
  szereloAlairas?: string;
  ugyfelNev?: string;
  ugyfelAlairas?: string;
  helyszin?: string;
  kategoria: string;
  leiras: string;
  sorok: MunkalapSor[];
  utazasKm?: number;
  megjegyzes?: string;
  osszegzes: MunkalapOsszegzes;
  keszletKiadva: boolean;
  keszletKiadas?: { ok: boolean; idopont: string; uzenet?: string };
  lezarva?: string;
  archivalt: boolean;
  archivalasOka?: string;
  createdAt: string;
};

/** Portal view of a FINALIZED worklog: no prices, no stock outcome, no internal remark. */
export type MunkalapPortalNezet = {
  id: string;
  azonosito: string;
  munkaDatum: string;
  szerelo: string;
  helyszin?: string;
  kategoria: string;
  leiras: string;
  sorok: Array<Pick<MunkalapSor, "tipus" | "leiras" | "mennyiseg" | "egyseg">>;
  munkaOra: number;
  lezarva?: string;
};

export type MunkalapOsszegzes = {
  munkaOra: number;
  anyagNetto: number;
  munkaNetto: number;
  osszesNetto: number;
};

export type MunkalapOsszesito = {
  piszkozat: number;
  lezartHonap: number;
  keszletHibas: number;
};

// ── Karbantartási terv ─────────────────────────────────────────────────────────

export type KarbantartasListItem = {
  _id: string;
  cim: string;
  partnerNev?: string;
  intervallumHonap: number;
  prioritas: HibajegyPrioritas;
  felelosNev?: string;
  aktiv: boolean;
  kovetkezoEsedekes: string;
  allapot: KarbantartasAllapot;
  archivalt: boolean;
  createdAt: string;
};

export type KarbantartasDetail = {
  id: string;
  cim: string;
  partnerId?: string;
  partnerNev?: string;
  projektId?: string;
  intervallumHonap: number;
  elsoEsedekes: string;
  utolsoCiklus: number;
  kovetkezoEsedekes: string;
  elorejelzesNap: number;
  aktiv: boolean;
  allapot: KarbantartasAllapot;
  sablonLeiras?: string;
  kategoria: string;
  prioritas: HibajegyPrioritas;
  felelosId?: string;
  felelosNev?: string;
  archivalt: boolean;
  archivalasOka?: string;
};

export type EsedekesTerv = {
  id: string;
  cim: string;
  partnerNev?: string;
  kovetkezoEsedekes: string;
  allapot: "lejart" | "hamarosan";
  napokHatra: number;
};

export type PdfRenderer = {
  render(html: string, fajlNev: string): Promise<void> | void;
};

export type CegAdatok = {
  nev: string;
  cim?: string;
  adoszam?: string;
  telefon?: string;
  email?: string;
};

export type PartnerPillanatkep = { partnerNev: string };
