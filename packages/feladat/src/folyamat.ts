/**
 * Feladat-folyamat (#67) — client-safe constants and DTOs. The engine is the shared
 * folyamat-motor (`@erp/core/folyamat`); the facade is `./api-folyamat.ts`.
 */
import type { FolyamatNezet } from "@erp/core/folyamat";
import type { FeladatPrioritas } from "./constants";

/** `kapcsolat` of a step task: `{modul, tipus, id: <flow id>, szakasz: <step id>}`. */
export const FOLYAMAT_KAPCSOLAT = { modul: "feladat", tipus: "folyamat" } as const;

export const FOLYAMAT_LEPES_MAX = 20;
export const FOLYAMAT_SABLON_MAX = 50;

export const folyamatUrl = (id: string) => `/feladatok/folyamat/${id}`;

/** One step as the editor sends it: an existing planned step keeps its `id`. */
export type FolyamatLepesInput = {
  id?: string;
  nev: string;
  felelosId: string;
  /** `YYYY-MM-DD`, empty = the flow's deadline. */
  hatarido?: string;
};

export type FolyamatInput = {
  cim: string;
  leiras?: string;
  /** Overall deadline `YYYY-MM-DD`. */
  hatarido: string;
  prioritas?: FeladatPrioritas;
  kategoria?: string;
  lepesek: FolyamatLepesInput[];
};

/** A flow's page: the shared view plus what the editor and the buttons need. */
export type FolyamatReszlet = FolyamatNezet & {
  leiras?: string;
  kiadoId: string;
  kiadoNev: string;
  hatarido: string;
  prioritas: FeladatPrioritas;
  kategoria?: string;
  /** Steps with ids, for the editor (in order; `zarolt` = already started, cannot move). */
  szerkesztheto: Array<
    FolyamatLepesInput & { id: string; allapot: string; zarolt: boolean }
  >;
  muveletek: {
    /** Kiadó, flow not stopped: change the planned steps, reassign the running one. */
    szerkeszt: boolean;
    megszakit: boolean;
  };
};

export type FolyamatSablonSor = {
  id: string;
  nev: string;
  megosztott: boolean;
  sajat: boolean;
  lepesek: Array<{ nev: string; felelosId?: string; napok?: number }>;
};

/** A push the app sends after a flow change (same shape as the domain modules' `Ertesites`). */
export type FolyamatErtesites = {
  userIds: string[];
  title: string;
  body?: string;
  url: string;
  tag?: string;
};
