/**
 * Client-safe barrel — the only `@erp/arlista` entry point `use client` components may import.
 * Never re-exports `./api` values or the models (Mongoose cannot be bundled for the browser).
 * The pure price functions live here so the matrix UI computes in the browser.
 */
export * from "./constants";
export * from "./szamitas";
export { TERMEK_LIST_COLUMNS, type TermekListItem } from "./columns";
export type {
  ArSnapshot,
  KategoriaDto,
  SzolgaltatasDto,
  TermekDetail,
  BeszerzesiAdatDto,
  PriceSnapshotInput,
  Result as ArlistaResult,
} from "./api";
