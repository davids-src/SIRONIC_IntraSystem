/**
 * Client-safe barrel — the only `@erp/partner` entry point 'use client' components and other
 * modules (e.g. the future `arlista`) may import from. Never re-exports `./api` or `./models/*`
 * (Mongoose cannot be bundled for the browser).
 *
 * The árazási profil vocabulary (partnerSzerep, ugyfelKategoria, arazasiSzerzodesTipus) is the
 * contract `arlista` prices against.
 */
export * from "./constants";
export {
  PARTNER_LIST_COLUMNS,
  ERDEKLODO_LIST_COLUMNS,
  type PartnerListItem,
  type ErdeklodoListItem,
} from "./columns";
export { PARTNER_PERMISSIONS, PARTNER_MODUL_KULCSOK } from "./permissions";
export { partnerNevKulcs } from "./text";
export type { PartnerInput, ErdeklodoInput } from "./validation";
export type {
  PartnerDetail,
  KapcsolattartoDetail,
  ErdeklodoDetail,
  TevekenysegDetail,
  Szereplo,
  Eredmeny,
} from "./api";

import type { ArazasiSzerzodesTipus, PartnerSzerep, UgyfelKategoria } from "./constants";

/** What `arlista` needs from a partner to pick a price multiplier. */
export type PartnerArazasiProfil = {
  partnerSzerep?: PartnerSzerep;
  ugyfelKategoria?: UgyfelKategoria;
  arazasiSzerzodesTipus?: ArazasiSzerzodesTipus;
};
