/**
 * Egységes folyamat-motor (PROJECT_PLAN #67) — the one step machine behind every flow: a
 * szerződés's phases, an ajánlatkérés's stages and a custom Feladat-folyamat. Each step is
 * a linked Feladat for one felelős; closing it starts the next planned step. This file is
 * the pure part — no I/O, no Mongoose — so every module (and the client) can share it.
 *
 * The owning module keeps its own storage (`Szerzodes.szakaszok`, `Ajanlatkeres.szakaszok`,
 * `FeladatFolyamat.lepesek`), all with this step vocabulary. It creates the step tasks
 * through its `FeladatPort`, receives the task events through the composition-root hook
 * (`onKapcsoltFeladat`), and hands them to `folyamatLepesEsemeny` / `folyamatKovetkezo` here.
 * What a module does on top (entity status, approval rules, notifications) stays its own.
 */

/** States of one step — stored as is by every module. */
export const FOLYAMAT_LEPES_ALLAPOTOK = [
  "tervezett",
  "aktiv",
  "kesz",
  "elutasitva",
  "megszakitva",
] as const;
export type FolyamatLepesAllapot = (typeof FOLYAMAT_LEPES_ALLAPOTOK)[number];

/** View-only extra state: a fixed step left out of this flow. */
export type FolyamatLepesNezetAllapot = FolyamatLepesAllapot | "kihagyva";

export const FOLYAMAT_LEPES_ALLAPOT_LABELS: Record<FolyamatLepesNezetAllapot, string> = {
  tervezett: "Tervezett",
  aktiv: "Folyamatban",
  kesz: "Kész",
  elutasitva: "Elutasítva — átosztásra vár",
  megszakitva: "Megszakítva",
  kihagyva: "Kihagyva",
};

export type FolyamatTon = "success" | "warning" | "danger" | "info" | "neutral";

export const FOLYAMAT_LEPES_ALLAPOT_TONES: Record<
  FolyamatLepesNezetAllapot,
  FolyamatTon
> = {
  tervezett: "neutral",
  aktiv: "info",
  kesz: "success",
  elutasitva: "danger",
  megszakitva: "warning",
  kihagyva: "neutral",
};

/** A step waiting on someone: running, or refused and waiting for re-assignment. */
export const folyamatLepesFut = (allapot: string): boolean =>
  allapot === "aktiv" || allapot === "elutasitva";

/** The fields of a stored step the engine reads and writes (every module's step has them). */
export type FolyamatMotorLepes = {
  allapot: FolyamatLepesAllapot;
  feladatId?: string;
  megjegyzes?: string;
  befejezve?: Date;
};

/** A linked-task event, as the Feladat engine fires it (`KapcsoltFeladatEsemeny`). */
export type FolyamatFeladatEsemeny = {
  tipus: "lezarva" | "elutasitva" | "visszavonva" | "tovabbadva" | "ujrakiadva";
  feladatId: string;
  ujFeladatId?: string;
  ujFelelosId?: string;
  megjegyzes?: string;
};

/**
 * What an event did to the step. `atadva`: the task went to `ujFelelosId` — the caller writes
 * the new felelős (its id type is the module's own). `null`: not for this step / no change.
 */
export type FolyamatLepesValtozas =
  "kesz" | "elutasitva" | "megszakitva" | "atadva" | null;

/** The event belongs to this step's current task (a stale task's event is ignored). */
export function folyamatLepesFeladata(
  lepes: FolyamatMotorLepes,
  feladatId: string,
): boolean {
  return !lepes.feladatId || lepes.feladatId === feladatId;
}

/**
 * Applies a task event to its step (mutates it). Closing counts only on a running step;
 * refusing waits for the kiadó to re-assign; withdrawing stops the step; a handover keeps it
 * running with the new task.
 */
export function folyamatLepesEsemeny(
  lepes: FolyamatMotorLepes,
  e: FolyamatFeladatEsemeny,
  most: Date = new Date(),
): FolyamatLepesValtozas {
  if (!folyamatLepesFeladata(lepes, e.feladatId)) return null;
  switch (e.tipus) {
    case "lezarva":
      if (lepes.allapot !== "aktiv") return null;
      lepes.allapot = "kesz";
      lepes.befejezve = most;
      if (e.megjegyzes) lepes.megjegyzes = e.megjegyzes;
      return "kesz";
    case "elutasitva":
      lepes.allapot = "elutasitva";
      lepes.megjegyzes = e.megjegyzes;
      return "elutasitva";
    case "visszavonva":
      lepes.allapot = "megszakitva";
      lepes.megjegyzes = e.megjegyzes;
      return "megszakitva";
    case "tovabbadva":
    case "ujrakiadva":
      if (!e.ujFelelosId) return null;
      if (e.ujFeladatId) lepes.feladatId = e.ujFeladatId;
      lepes.allapot = "aktiv";
      if (e.megjegyzes) lepes.megjegyzes = e.megjegyzes;
      return "atadva";
    default:
      return null;
  }
}

/**
 * After step `index` finished: `indit` the next planned step, `kesz` when every step is done,
 * `var` when a later step is still running / stopped (someone has to act first).
 */
export function folyamatKovetkezo(
  lepesek: ReadonlyArray<Pick<FolyamatMotorLepes, "allapot">>,
  index: number,
): { tipus: "indit"; index: number } | { tipus: "kesz" } | { tipus: "var" } {
  const kov = lepesek.findIndex((l, i) => i > index && l.allapot !== "kesz");
  if (kov >= 0)
    return lepesek[kov]!.allapot === "tervezett"
      ? { tipus: "indit", index: kov }
      : { tipus: "var" };
  return lepesek.every((l) => l.allapot === "kesz")
    ? { tipus: "kesz" }
    : { tipus: "var" };
}

/** "2/4 lépés · 50%" — skipped steps do not count. */
export function folyamatHaladas(lepesek: ReadonlyArray<{ allapot: string }>): {
  kesz: number;
  osszes: number;
  szazalek: number;
  /** 0-based index of the step running now (or waiting), -1 when none. */
  aktualis: number;
} {
  const szamit = lepesek.filter((l) => l.allapot !== "kihagyva");
  const kesz = szamit.filter((l) => l.allapot === "kesz").length;
  return {
    kesz,
    osszes: szamit.length,
    szazalek: szamit.length ? Math.round((kesz / szamit.length) * 100) : 0,
    aktualis: lepesek.findIndex((l) => folyamatLepesFut(l.allapot)),
  };
}

/** One step on a flow's road, module-neutral (Feladatok, szerződés, ajánlatkérés pages). */
export type FolyamatLepesNezet = {
  kulcs: string;
  nev: string;
  allapot: FolyamatLepesNezetAllapot;
  felelosId?: string;
  felelosNev?: string;
  /** Profile picture URL of the felelős, when they have one (filled by the app). */
  felelosKep?: string;
  /** `YYYY-MM-DD`. */
  hatarido?: string;
  kesik: boolean;
  aktualis: boolean;
  feladatId?: string;
  megjegyzes?: string;
};

/** Where a flow stands — every module answers with this shape. */
export type FolyamatNezet = {
  modul: string;
  tipus: string;
  id: string;
  /** "Szerződés" / "Ajánlatkérés" / "Feladat-folyamat". */
  tipusCimke: string;
  cim: string;
  alcim?: string;
  url: string;
  allapotKulcs: string;
  allapotCimke: string;
  allapotTon: FolyamatTon;
  /** Finished or dropped — nothing more will happen on it. */
  lezart: boolean;
  /** The step running now (or waiting for re-assignment). */
  aktualis?: { nev: string; felelosNev?: string; hatarido?: string; kesik: boolean };
  lepesek: FolyamatLepesNezet[];
  kerelmezoNev?: string;
  inditoNev?: string;
  /** Any open step is past its deadline. */
  kesik: boolean;
  /** How the viewer is involved (list view only). */
  szerepek?: Array<"kerelmezo" | "indito" | "felelos" | "ugyintezo">;
  frissitve: string;
};

/** Step running now as the view's `aktualis` line. */
export function folyamatAktualis(
  lepesek: FolyamatLepesNezet[],
): FolyamatNezet["aktualis"] {
  const a = lepesek.find((l) => l.aktualis);
  return a
    ? { nev: a.nev, felelosNev: a.felelosNev, hatarido: a.hatarido, kesik: a.kesik }
    : undefined;
}
