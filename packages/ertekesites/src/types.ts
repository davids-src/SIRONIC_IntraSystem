import type {
  AjanlatAllapot,
  AlairasTipus,
  ElvesztesOk,
  MegrendeloAllapot,
  SorForras,
  SorTipus,
  SzerzodesAllapot,
  SzerzodesTipus,
} from "./constants";

/**
 * Frozen price an offer line embeds. Structurally identical to `@erp/arlista`'s `ArSnapshot`
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
  /** VAT in percent. */
  afaKulcs: number;
  penznem: string;
  keszult: string;
};

/** One offer line as stored and as fed to the pure calculation functions. */
export type AjanlatSor = {
  forras: SorForras;
  sorTipus: SorTipus;
  leiras: string;
  mennyiseg: number;
  egyseg: string;
  nettoEgysegar: number;
  afaKulcs: number;
  kedvezmenySzazalek?: number;
  /** Bundle: parent row bills the bundle, children are listed but not billed again. */
  csomagId?: string;
  csomagSzulo?: boolean;
  arSnapshot?: ArSnapshotAdat;
  /** Internal cost per unit (SECRET — cut by the facade for viewers without write rights). */
  beszerzesiEgysegar?: number;
  belsoKoltseg?: number;
};

export type AfaBontasSor = {
  afaKulcs: number;
  netto: number;
  afa: number;
  brutto: number;
};

export type SorPenzugy = {
  sor: AjanlatSor;
  szamlazando: boolean;
  nettoAlap: number;
  kedvezmenyOsszeg: number;
  nettoKedvezmeny: number;
  afaOsszeg: number;
  bruttoOsszeg: number;
  egysegKoltseg: number;
  sorKoltseg: number;
  koltsegForras: string;
  sorFedezet: number;
  sorFedezetSzazalek: number;
  vanKoltseg: boolean;
};

export type AjanlatOsszesites = {
  sorok: SorPenzugy[];
  nettoOsszeg: number;
  globalisKedvezmenySzazalek: number;
  globalisKedvezmenyOsszeg: number;
  kedvezmenyesNetto: number;
  afaOsszeg: number;
  bruttoOsszeg: number;
  afaBontas: AfaBontasSor[];
  termekBevetel: number;
  szolgaltatasBevetel: number;
  munkadijBevetel: number;
  egyebBevetel: number;
  kozvetlenKoltseg: number;
  belsoMunkaKoltseg: number;
  egyebBelsoKoltseg: number;
  osszesKoltseg: number;
  fedezet: number;
  fedezetSzazalek: number;
  vanKoltsegAdat: boolean;
};

export type CimAdat = {
  iranyitoszam?: string;
  varos?: string;
  utca?: string;
  orszag?: string;
};

/** Persisted totals (net / VAT / gross), recalculated server-side on every write. */
export type OsszegAdat = {
  nettoOsszeg: number;
  globalisKedvezmenySzazalek: number;
  globalisKedvezmenyOsszeg: number;
  kedvezmenyesNetto: number;
  afaOsszeg: number;
  bruttoOsszeg: number;
  afaBontas: AfaBontasSor[];
};

export type AjanlatListItem = {
  _id: string;
  azonosito: string;
  cim: string;
  partnerNev: string;
  allapot: AjanlatAllapot;
  bruttoOsszeg: number;
  penznem: string;
  ervenyesseg?: Date;
  utankovetes?: Date;
  archivalt: boolean;
  createdAt: Date;
};

export type AjanlatDetail = {
  id: string;
  azonosito: string;
  cim: string;
  partnerId: string;
  partnerNev: string;
  partnerCim?: string;
  partnerAdoszam?: string;
  allapot: AjanlatAllapot;
  penznem: string;
  ervenyesseg?: string;
  megjegyzes?: string;
  uzletiEgyseg?: string;
  sorok: AjanlatSor[];
  osszegek: OsszegAdat;
  utankovetes?: string;
  utankovetesMegjegyzes?: string;
  kuldveAt?: string;
  elvesztesOka?: ElvesztesOk;
  elvesztesMegjegyzes?: string;
  kovetkezoLepes?: string;
  kovetkezoLepesIdopont?: string;
  archivalt: boolean;
  archivalasOka?: string;
  elozmenyek: Array<{ allapot: AjanlatAllapot; idopont: string; megjegyzes?: string }>;
  /** Present only for viewers with the write permission (margin is internal). */
  fedezet?: { koltseg: number; fedezet: number; fedezetSzazalek: number };
  createdAt: string;
  updatedAt: string;
};

export type SzerzodesSablonDto = {
  id: string;
  nev: string;
  kategoria: string;
  leiras?: string;
  szoveg: string;
  valtozok: string[];
  digitalisAlairasKell: boolean;
  aktiv: boolean;
};

export type SzerzodesListItem = {
  _id: string;
  azonosito: string;
  nev: string;
  kategoria: string;
  partnerNev: string;
  tipus: SzerzodesTipus;
  allapot: SzerzodesAllapot;
  alairasTipus: AlairasTipus;
  ervenyessegVege?: Date;
  createdAt: Date;
};

export type SzerzodesDetail = {
  id: string;
  azonosito: string;
  nev: string;
  kategoria: string;
  partnerId: string;
  partnerNev: string;
  tipus: SzerzodesTipus;
  allapot: SzerzodesAllapot;
  sablonId?: string;
  szoveg?: string;
  /** Template body frozen at creation (drives the variable inputs on edit). */
  sablonSzoveg?: string;
  valtozok: Record<string, string>;
  fajlHivatkozas?: string;
  fajlNev?: string;
  alairasTipus: AlairasTipus;
  ugyfelNev?: string;
  alairasAdat?: string;
  alairtAt?: string;
  ervenyessegKezdete?: string;
  ervenyessegVege?: string;
  projektId?: string;
  portalLathato: boolean;
  megjegyzes?: string;
  elozmenyek: Array<{ allapot: SzerzodesAllapot; idopont: string; megjegyzes?: string }>;
  createdAt: string;
  updatedAt: string;
};

export type MegrendeloSor = {
  arlistaTetelId?: string;
  leiras: string;
  mennyiseg: number;
  egyseg: string;
  nettoEgysegar: number;
  afaKulcs: number;
};

export type BevetelezesEredmeny = {
  ok: boolean;
  idopont: string;
  uzenet?: string;
};

export type MegrendeloListItem = {
  _id: string;
  azonosito: string;
  beszallitoNev: string;
  allapot: MegrendeloAllapot;
  bruttoOsszeg: number;
  penznem: string;
  varhatoSzallitas?: Date;
  archivalt: boolean;
  createdAt: Date;
};

export type MegrendeloDetail = {
  id: string;
  azonosito: string;
  beszallitoId: string;
  beszallitoNev: string;
  projektId?: string;
  ajanlatId?: string;
  allapot: MegrendeloAllapot;
  penznem: string;
  varhatoSzallitas?: string;
  megjegyzes?: string;
  sorok: MegrendeloSor[];
  nettoOsszeg: number;
  afaOsszeg: number;
  bruttoOsszeg: number;
  bevetelezes?: BevetelezesEredmeny;
  archivalt: boolean;
  archivalasOka?: string;
  elozmenyek: Array<{ allapot: MegrendeloAllapot; idopont: string; megjegyzes?: string }>;
  createdAt: string;
  updatedAt: string;
};

/** Partner data denormalized into a document at write time (the app resolves it via partnerApi). */
export type PartnerPillanatkep = {
  partnerNev: string;
  partnerCim?: string;
  partnerAdoszam?: string;
};

export type Eredmeny =
  | { ok: true; id?: string }
  | { ok: false; message: string; code?: "nem_szerkesztheto" | "ervenytelen_atmenet" };

/**
 * Port the app binds to the keszlet module. The értékesítés module never imports keszlet:
 * fulfilling a purchase order calls `bevetelez` when a port is supplied and records the result.
 * The implementation must be idempotent on `ref` (a retry must not receive stock twice).
 */
export type KeszletBevetelPort = {
  bevetelez(
    sorok: MegrendeloSor[],
    ref: { tipus: "megrendelolap"; id: string; azonosito: string },
  ): Promise<{ ok: true; uzenet?: string } | { ok: false; message: string }>;
};
