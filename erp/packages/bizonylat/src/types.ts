import type {
  IgazolasAllapot,
  IgazolasForras,
  JotallasAllapot,
  KeszletKiadasAllapot,
  SzallitolevelAllapot,
  SzamlaAllapot,
} from "./constants";

/** Frozen price a certificate line embeds (structurally the same as `@erp/arlista`'s snapshot). */
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

export type Eredmeny =
  | { ok: true; id?: string; uzenet?: string }
  | {
      ok: false;
      message: string;
      code?: "nem_szerkesztheto" | "ervenytelen_atmenet" | "nem_talalhato";
    };

/** Partner data denormalized into a document at write time (the app resolves it via partnerApi). */
export type PartnerPillanatkep = {
  partnerNev: string;
  partnerCim?: string;
  partnerAdoszam?: string;
  partnerEmail?: string;
};

// ── Ports (bound by the app; this module never imports keszlet or Billingo) ────

export type KiadasSor = {
  arlistaTermekId: string;
  nev: string;
  mennyiseg: number;
  raktarhelyKod?: string;
};

export type ElerhetosegSor = {
  lineIndex: number;
  arlistaTermekId: string;
  nev?: string;
  kert: number;
  szabad: number;
  elegendo: boolean;
  uzenet?: string;
};

/**
 * Port the app binds to the keszlet module. `kiad` must be idempotent on `ref` (a retry with the
 * same id never deducts stock twice).
 */
export type KeszletKiadasPort = {
  preflight(sorok: KiadasSor[]): Promise<{
    osszesElegendo: boolean;
    sorok: ElerhetosegSor[];
  }>;
  kiad(
    sorok: KiadasSor[],
    ref: { tipus: "szallitolevel"; id: string; azonosito: string },
  ): Promise<{ ok: true; uzenet?: string } | { ok: false; message: string }>;
};

/** Invoice as handed to the Billingo adapter. */
export type BillingoSzamlaAdat = {
  id: string;
  azonosito: string;
  partnerNev: string;
  partnerCim?: string;
  partnerAdoszam?: string;
  cim?: string;
  penznem: string;
  esedekes?: string;
  sorok: Array<{
    leiras: string;
    mennyiseg: number;
    egyseg: string;
    nettoEgysegar: number;
    afaKulcs: number;
  }>;
  osszeg: number;
};

export type BillingoPort = {
  kiallit(
    szamla: BillingoSzamlaAdat,
  ): Promise<
    | { ok: true; billingoRef: string; szamlaszam?: string }
    | { ok: false; message: string }
  >;
  allapot(
    billingoRef: string,
  ): Promise<
    | { ok: true; kifizetve: boolean; sztornozva?: boolean }
    | { ok: false; message: string }
  >;
};

// ── Szállítólevél ──────────────────────────────────────────────────────────────

export type SzallitolevelSor = {
  arlistaTermekId: string;
  nev: string;
  mennyiseg: number;
  egyseg: string;
  raktarhelyKod?: string;
};

export type SzallitolevelListItem = {
  _id: string;
  azonosito: string;
  partnerNev: string;
  allapot: SzallitolevelAllapot;
  kiadasNap: string;
  tetelDb: number;
  archivalt: boolean;
  createdAt: Date;
};

export type SzallitolevelDetail = {
  id: string;
  azonosito: string;
  partnerId: string;
  partnerNev: string;
  projektId?: string;
  kiadasNap: string;
  sorok: SzallitolevelSor[];
  megjegyzes?: string;
  allapot: SzallitolevelAllapot;
  keszletKiadas?: { allapot: KeszletKiadasAllapot; idopont: string; uzenet?: string };
  archivalt: boolean;
  archivalasOka?: string;
  elozmenyek: Array<{
    allapot: SzallitolevelAllapot;
    idopont: string;
    megjegyzes?: string;
  }>;
  createdAt: string;
  updatedAt: string;
};

export type SzallitolevelDuplikacio = {
  id: string;
  azonosito: string;
  allapot: SzallitolevelAllapot;
  kozosTermekek: string[];
};

export type SzallitolevelPreflight = {
  osszesElegendo: boolean;
  sorok: ElerhetosegSor[];
  /** Same partner, same day, not cancelled — likely a double entry. */
  duplikaciok: SzallitolevelDuplikacio[];
};

// ── Teljesítésigazolás ─────────────────────────────────────────────────────────

export type IgazolasSor = {
  leiras: string;
  mennyiseg: number;
  egyseg: string;
  nettoEgysegar: number;
  afaKulcs: number;
  arSnapshot?: ArSnapshotAdat;
  /** Internal purchase price (SECRET — never leaves the facade for portal viewers). */
  beszerzesiEgysegar?: number;
};

export type IgazolasOsszeg = {
  nettoOsszeg: number;
  afaOsszeg: number;
  bruttoOsszeg: number;
};

/** Plain data the app collects from an offer / worklog / project — the module never imports them. */
export type ImportAdat = {
  forras: IgazolasForras;
  forrasId?: string;
  cim?: string;
  munkaOsszegzes?: string;
  idoszakKezdet?: string;
  idoszakVege?: string;
  osszOra?: number;
  munkalapIds?: string[];
  sorok: IgazolasSor[];
};

export type IgazolasListItem = {
  _id: string;
  azonosito: string;
  cim: string;
  partnerNev: string;
  allapot: IgazolasAllapot;
  bruttoOsszeg: number;
  penznem: string;
  archivalt: boolean;
  createdAt: Date;
};

export type IgazolasAlairas = {
  nev: string;
  beosztas: string;
  kep: string;
  alairtAt: string;
};

export type IgazolasDetail = {
  id: string;
  azonosito: string;
  cim: string;
  partnerId: string;
  partnerNev: string;
  partnerEmail?: string;
  projektId?: string;
  ajanlatId?: string;
  munkalapIds: string[];
  forras: IgazolasForras;
  munkaOsszegzes: string;
  idoszakKezdet?: string;
  idoszakVege?: string;
  osszOra?: number;
  penznem: string;
  sorok: IgazolasSor[];
  osszegek: IgazolasOsszeg;
  allapot: IgazolasAllapot;
  kuldveAt?: string;
  tokenLejar?: string;
  alairas?: IgazolasAlairas;
  elutasitasOka?: string;
  /** Internal — absent for portal viewers and for staff without the write permission. */
  belsoMegjegyzes?: string;
  archivalt: boolean;
  archivalasOka?: string;
  elozmenyek: Array<{ allapot: IgazolasAllapot; idopont: string; megjegyzes?: string }>;
  createdAt: string;
  updatedAt: string;
};

export type IgazolasOsszesites = {
  alairtDb: number;
  fuggoDb: number;
  elutasitottDb: number;
  piszkozatDb: number;
  alairtNetto: number;
  alairtBrutto: number;
  fuggoNetto: number;
  fuggoBrutto: number;
};

/** Mail the app hands to `@erp/mail` — contains the one-time magic-link path. */
export type IgazolasLevel = {
  to: string;
  toNev: string;
  subject: string;
  text: string;
  html: string;
  /** App-relative magic link; the app prefixes the public URL. */
  linkUt: string;
  lejar: string;
};

// ── Számla ─────────────────────────────────────────────────────────────────────

export type SzamlaSor = {
  leiras: string;
  mennyiseg: number;
  egyseg: string;
  nettoEgysegar: number;
  afaKulcs: number;
};

export type SzamlaListItem = {
  _id: string;
  azonosito: string;
  szamlaszam?: string;
  partnerNev: string;
  allapot: SzamlaAllapot;
  osszeg: number;
  penznem: string;
  esedekes?: Date;
  archivalt: boolean;
  createdAt: Date;
};

export type SzamlaDetail = {
  id: string;
  azonosito: string;
  szamlaszam?: string;
  billingoRef?: string;
  partnerId: string;
  partnerNev: string;
  partnerCim?: string;
  partnerAdoszam?: string;
  cim?: string;
  igazolasId?: string;
  sorok: SzamlaSor[];
  osszeg: number;
  penznem: string;
  kiallitva?: string;
  esedekes?: string;
  kifizetve?: string;
  /** Effective state (`lejart` computed lazily from `elkuldve` + due date). */
  allapot: SzamlaAllapot;
  tarolt: "piszkozat" | "elkuldve" | "kifizetve" | "sztorno";
  archivalt: boolean;
  archivalasOka?: string;
  elozmenyek: Array<{ allapot: string; idopont: string; megjegyzes?: string }>;
  createdAt: string;
  updatedAt: string;
};

// ── Jótállási jegy ─────────────────────────────────────────────────────────────

export type JotallasSor = {
  termekNev: string;
  arlistaTermekId?: string;
  gyariSzam?: string;
  evek: number;
  kezdet: string;
  vege: string;
};

export type JotallasListItem = {
  _id: string;
  azonosito: string;
  partnerNev: string;
  szamlaszam?: string;
  allapot: JotallasAllapot;
  lejarat?: Date;
  kiallitasNap: string;
  archivalt: boolean;
  createdAt: Date;
};

export type JotallasDetail = {
  id: string;
  azonosito: string;
  partnerId: string;
  partnerNev: string;
  szamlaszam?: string;
  kiallitasNap: string;
  sorok: JotallasSor[];
  megjegyzes?: string;
  /** Legal text frozen at issue time. */
  jogiSzoveg: string;
  allapot: JotallasAllapot;
  tarolt: "aktiv" | "igenyelt" | "ervenytelen";
  lejarat?: string;
  archivalt: boolean;
  archivalasOka?: string;
  elozmenyek: Array<{ allapot: string; idopont: string; megjegyzes?: string }>;
  createdAt: string;
  updatedAt: string;
};

/** Portal view of an invoice - allow-listed: no Billingo reference, history or internal fields. */
export type SzamlaPortalNezet = {
  id: string;
  azonosito: string;
  szamlaszam?: string;
  cim?: string;
  sorok: SzamlaSor[];
  osszeg: number;
  penznem: string;
  kiallitva?: string;
  esedekes?: string;
  kifizetve?: string;
  allapot: SzamlaAllapot;
};

/** Portal view of a warranty card - allow-listed: no internal remark, history or archive reason. */
export type JotallasPortalNezet = {
  id: string;
  azonosito: string;
  szamlaszam?: string;
  kiallitasNap: string;
  sorok: JotallasSor[];
  jogiSzoveg: string;
  allapot: JotallasAllapot;
  lejarat?: string;
};

export type CegAdatok = {
  nev: string;
  cim?: string;
  adoszam?: string;
  telefon?: string;
  email?: string;
  logoUrl?: string;
};

/** Seam for turning HTML into a PDF; the browser implementation lives in the app (#11). */
export type PdfRenderer = {
  render(html: string, fajlNev: string): Promise<void> | void;
};

export type BillingoEsemeny = {
  tipus: "kifizetve";
  billingoRef: string;
};
