import {
  AR_KEREKITES,
  UGYFEL_SZORZO_KULCSOK,
  type ArazasiBeallitasok,
  type ArazasiTipus,
  type OradijKategoria,
  type PartnerArazasiProfil,
  type SurgossegKulcs,
  type UgyfelSzorzoKulcs,
} from "./constants";

/**
 * Pure pricing functions — no I/O, safe in the browser (the matrix UI computes every column
 * client-side from the loaded settings). Port of the legacy `packages/modules/pricing`.
 */

export type EgysegSav = {
  cimke: string;
  minEgyseg: number;
  /** `null` = nyitott felső határ. */
  maxEgyseg: number | null;
  alapar: number;
};

export type SzolgaltatasArazas = {
  arazasiTipus: ArazasiTipus;
  belsoAlapar?: number | null;
  oradijKategoria?: string | null;
  egysegSavok?: EgysegSav[] | null;
};

export type KalkulaltAr = {
  belsoAlapar: number;
  ugyfelSzorzo: number;
  kalkulaltAr: number;
  surgossegiSzorzo: number;
  vegAr: number;
  arazasiTipus: ArazasiTipus;
  egyedi: boolean;
};

export type KalkulacioOpciok = {
  surgosseg?: SurgossegKulcs | null;
  /** Egységalapú árazásnál a darabszám. */
  egysegDb?: number;
};

export function kerekit(ertek: number, lepes: number = AR_KEREKITES): number {
  return Math.round(ertek / lepes) * lepes;
}

/** Which multiplier column applies to this partner profile. */
export function mapPartnerProfilToSzorzoKulcs(profil: PartnerArazasiProfil): UgyfelSzorzoKulcs {
  if (profil.szerep === "alvallalkozo_megbizo") {
    return profil.alvallalkozoiJelenlet === "napi_jelenlet"
      ? "alvallalkozo_jelenlet"
      : "alvallalkozo_projekt";
  }
  if (profil.ugyfelKategoria === "maganszemely") return "maganszemely";
  if (profil.ugyfelKategoria === "nagyvallalat") return "nagyvallalat";

  switch (profil.szerzodesTipus ?? "eseti") {
    case "6_honapos":
      return "kkv_6_honapos";
    case "1_eves":
      return "kkv_1_eves";
    case "2_eves":
      return "kkv_2_eves";
    default:
      return "kkv_eseti";
  }
}

/** Internal base price before any customer multiplier. */
export function belsoAlapar(tetel: SzolgaltatasArazas, beallitasok: ArazasiBeallitasok, egysegDb = 0): number {
  if (tetel.arazasiTipus === "oradij") {
    const nyers = beallitasok.oradijak[tetel.oradijKategoria as OradijKategoria] ?? 0;
    return kerekit(nyers * beallitasok.rezsiSzorzo);
  }
  if (tetel.arazasiTipus === "egysegalapu") {
    const sav = (tetel.egysegSavok ?? []).find(
      (s) => egysegDb >= s.minEgyseg && (s.maxEgyseg == null || egysegDb <= s.maxEgyseg),
    );
    return sav?.alapar ?? 0;
  }
  return tetel.belsoAlapar ?? 0;
}

/**
 * Final price of a service for a given multiplier column (and optional urgency).
 *
 * The result must be stored as a snapshot when a document line is created — later changes
 * to settings or to the partner's category never alter issued documents.
 */
export function calculateServicePrice(
  tetel: SzolgaltatasArazas,
  szorzoKulcs: UgyfelSzorzoKulcs,
  beallitasok: ArazasiBeallitasok,
  opciok: KalkulacioOpciok = {},
): KalkulaltAr {
  if (tetel.arazasiTipus === "egyedi") {
    return {
      belsoAlapar: 0,
      ugyfelSzorzo: 1,
      kalkulaltAr: 0,
      surgossegiSzorzo: 1,
      vegAr: 0,
      arazasiTipus: "egyedi",
      egyedi: true,
    };
  }
  const alap = belsoAlapar(tetel, beallitasok, opciok.egysegDb ?? 0);
  const ugyfelSzorzo = beallitasok.ugyfelSzorzok[szorzoKulcs] ?? 1;
  const kalkulaltAr = kerekit(alap * ugyfelSzorzo);
  const surgossegiSzorzo = opciok.surgosseg
    ? (beallitasok.surgossegiSzorzok[opciok.surgosseg] ?? 1)
    : 1;
  return {
    belsoAlapar: alap,
    ugyfelSzorzo,
    kalkulaltAr,
    surgossegiSzorzo,
    vegAr: kerekit(kalkulaltAr * surgossegiSzorzo),
    arazasiTipus: tetel.arazasiTipus,
    egyedi: false,
  };
}

/** Same as `calculateServicePrice`, resolving the column from a partner profile. */
export function calculateServicePriceForPartner(
  tetel: SzolgaltatasArazas,
  profil: PartnerArazasiProfil,
  beallitasok: ArazasiBeallitasok,
  opciok: KalkulacioOpciok = {},
): KalkulaltAr & { szorzoKulcs: UgyfelSzorzoKulcs } {
  const szorzoKulcs = mapPartnerProfilToSzorzoKulcs(profil);
  return { ...calculateServicePrice(tetel, szorzoKulcs, beallitasok, opciok), szorzoKulcs };
}

/** One row of the matrix view: every customer column at once (no urgency). */
export function arMatrixSor(
  tetel: SzolgaltatasArazas,
  beallitasok: ArazasiBeallitasok,
  egysegDb = 0,
): Record<UgyfelSzorzoKulcs, number> {
  const sor = {} as Record<UgyfelSzorzoKulcs, number>;
  for (const kulcs of UGYFEL_SZORZO_KULCSOK) {
    sor[kulcs] = calculateServicePrice(tetel, kulcs, beallitasok, { egysegDb }).kalkulaltAr;
  }
  return sor;
}

export function bruttoAr(netto: number, afaTort: number): number {
  return Math.round(netto * (1 + afaTort));
}
