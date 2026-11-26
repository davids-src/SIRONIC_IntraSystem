/**
 * DTOs of the Feladat facade — no runtime imports, so the client barrel and the pure helpers in
 * `egyseg.ts` can share them with `api.ts`.
 */
import type { FeladatAllapot, FeladatKapcsolat, FeladatPrioritas } from "./constants";
import type { FeladatCsoportStat } from "./kategoria";

/**
 * One member of a group task as everyone on the group sees it (8m, #61): state, step progress,
 * the latest comment and the handover links, so the kiadó manages the group from one row and
 * the recipients see who else works on it.
 */
export type FeladatCsoportTag = {
  /** The member's copy. */
  id: string;
  felelosId?: string;
  felelosNev: string;
  allapot: FeladatAllapot;
  elsodleges: boolean;
  /** `YYYY-MM-DD` — copies may differ after a single copy was reissued. */
  hatarido: string;
  kesik: boolean;
  lepesKesz: number;
  lepesOsszes: number;
  /** Name of the first step not done yet. */
  aktualisLepes?: string;
  utolsoMegjegyzes?: { szerzoNev?: string; szoveg: string; mikor: string };
  /** Handover (#49): the copy this one went on to / came from. */
  kovetkezoId?: string;
  elozmenyId?: string;
  /** Own copy of the kiadó (they put themselves among the recipients). */
  sajat: boolean;
};

/**
 * Progress of a group: `aktiv` are the copies that still count (not withdrawn, not handed on —
 * the copy it was handed to counts instead), `kesz` the closed ones among them.
 */
export type FeladatHaladas = {
  aktiv: number;
  kesz: number;
  kesik: number;
  allapotonkent: Partial<Record<FeladatAllapot, number>>;
};

export type FeladatSor = {
  id: string;
  cim: string;
  leiras?: string;
  /** `YYYY-MM-DD`. */
  hatarido: string;
  allapot: FeladatAllapot;
  /** Open, still on the felelős, and the deadline day has passed (Budapest calendar). */
  kesik: boolean;
  kiadoId: string;
  kiadoNev: string;
  felelosNev: string;
  createdAt: string;
  prioritas: FeladatPrioritas;
  /** Group copy: true = elsődleges felelős, false = közreműködő; undefined when not a group (#48). */
  elsodleges?: boolean;
  /** Attachments given with the task (protected media ids — the app resolves names). */
  mediaIds: string[];
  megjegyzesek: Array<{
    szerzoNev?: string;
    kiadotol: boolean;
    szoveg: string;
    mikor: string;
    mediaIds: string[];
    /** Sent to every member of the group at once (8m) — the same text is on every copy. */
    mindenkinek?: boolean;
  }>;
  naplo: Array<{
    allapot: FeladatAllapot;
    kiNev?: string;
    mikor: string;
    megjegyzes?: string;
  }>;
  /** `kozremukodo`: another member of the same group task (read-only on this copy). */
  szerep: "kiado" | "felelos" | "kozremukodo" | "megfigyelo";
  /** Own task (given to oneself): no acceptance, the owner closes or drops it. */
  sajat: boolean;
  /** Group task: every recipient's copy, so the giver sees who is where. */
  csoport?: {
    id: string;
    tagok: FeladatCsoportTag[];
    haladas: FeladatHaladas;
  };
  /** Handover chain (#49): the copy this was handed on from, and the one it went on to. */
  elozmenyId?: string;
  kovetkezoId?: string;
  /** Linked task (#50): the entity step it belongs to. */
  kapcsolat?: FeladatKapcsolat;
  /** Free category (#65). */
  kategoria?: string;
  /** The felelős's steps (#50); `hatarido` is `YYYY-MM-DD`. */
  lepesek: Array<{ nev: string; kesz: boolean; hatarido?: string }>;
  /** The first step not done yet — shown as the status on cards. */
  aktualisLepes?: { nev: string; sorszam: number; osszes: number };
  /** What this viewer may do with it right now — the facade checks again on every call. */
  muveletek: {
    dont: boolean;
    lezar: boolean;
    visszavon: boolean;
    ujrakiad: boolean;
    megjegyzes: boolean;
    tovabbad: boolean;
    /** Add / edit / tick steps (the felelős, while open). */
    lepesek: boolean;
    /**
     * Kiadó of an open task (8m): change deadline / priority, and on a group task the group
     * actions (comment to all, add / withdraw members, change the elsődleges felelős).
     */
    kezel: boolean;
  };
};

/** Per person in the task KPI view (as felelős of tasks given by others). */
export type FeladatKimutatasSor = {
  userId: string;
  nev: string;
  kapott: number;
  elfogadasraVar: number;
  folyamatban: number;
  kesz: number;
  hataridoreKesz: number;
  elutasitott: number;
  visszavont: number;
  tovabbadott: number;
  /** Group copies where they were közreműködő rather than elsődleges felelős. */
  kozremukodo: number;
  lejart: number;
  elakadt: number;
  sajat: number;
  sajatKesz: number;
  /** Average days from given to done, over the done ones. */
  atlagNap?: number;
  kiadok: Array<{ nev: string; db: number; kesz: number }>;
  nyitottak: Array<{
    id: string;
    cim: string;
    kiadoNev: string;
    hatarido: string;
    allapot: FeladatAllapot;
    kesik: boolean;
    elakadt: boolean;
    nap: number;
    prioritas: FeladatPrioritas;
    elsodleges?: boolean;
  }>;
};

export type FeladatKimutatas = {
  /**
   * Counted per copy: a group task given to 5 people is 5 here (and one in `feladatok`) — every
   * copy is one person's work; the per-person table is per copy too.
   */
  osszes: number;
  /** Counted per task (8m): a group task once, however many copies it has. */
  feladatok: { osszes: number; csoportos: number; csoportosKesz: number };
  nyitott: number;
  lejart: number;
  elakadt: number;
  kesz: number;
  hataridoreKesz: number;
  atlagNap?: number;
  sorok: FeladatKimutatasSor[];
  /** Per-group stats (#65) by kategória, felelős and kiadó — per copy, like the totals. */
  csoportok: {
    kategoria: FeladatCsoportStat[];
    felelos: FeladatCsoportStat[];
    kiado: FeladatCsoportStat[];
  };
  /** `kiadott` per copy, `feladat` per task (a group task once). */
  kiadok: Array<{
    nev: string;
    kiadott: number;
    feladat: number;
    kesz: number;
    lejart: number;
  }>;
};

export type FeladatCimzett = { id: string; nev: string; szerepkorok: string[] };

/** Who to notify after a change — the actions send the push, the facade only says who is who. */
export type FeladatErtesitesCel = {
  id: string;
  cim: string;
  kiadoId: string;
  felelosId?: string;
  felelosNev: string;
  sajat: boolean;
};
