/**
 * Pure, client-safe helpers of the task lists (8m, #61): a group task's copies folded into one
 * unit (`FeladatEgyseg`) with its progress and overall state, and the one default order every
 * view uses (overdue → urgent → deadline). No runtime imports beyond constants.
 */
import type { FeladatAllapot, FeladatPrioritas } from "./constants";
import type { FeladatCsoportTag, FeladatHaladas, FeladatSor } from "./types";

/** Copies that no longer count in a group's progress: withdrawn, or handed on (the copy it was
 * handed to counts instead). */
export function szamitoTag(t: Pick<FeladatCsoportTag, "allapot">): boolean {
  return t.allapot !== "visszavonva" && t.allapot !== "tovabbadva";
}

export function csoportHaladas(
  tagok: ReadonlyArray<Pick<FeladatCsoportTag, "allapot" | "kesik">>,
): FeladatHaladas {
  const allapotonkent: FeladatHaladas["allapotonkent"] = {};
  for (const t of tagok) allapotonkent[t.allapot] = (allapotonkent[t.allapot] ?? 0) + 1;
  const aktiv = tagok.filter(szamitoTag);
  return {
    aktiv: aktiv.length,
    kesz: aktiv.filter((t) => t.allapot === "lezarva").length,
    kesik: aktiv.filter((t) => t.kesik).length,
    allapotonkent,
  };
}

/**
 * One state for a whole group, the way the kiadó reads it: a refusal needs them first, then
 * anything still waiting for acceptance, then work in progress; done when every counted copy is
 * done; withdrawn when nothing counts any more.
 */
export function osszesitettAllapot(
  tagok: ReadonlyArray<Pick<FeladatCsoportTag, "allapot">>,
): FeladatAllapot {
  const aktiv = tagok.filter(szamitoTag);
  if (aktiv.length === 0)
    return tagok.some((t) => t.allapot === "visszavonva") ? "visszavonva" : "tovabbadva";
  for (const a of ["elutasitva", "kiadva", "elfogadva"] as const)
    if (aktiv.some((t) => t.allapot === a)) return a;
  return "lezarva";
}

const PRIORITAS_SULY: Record<FeladatPrioritas, number> = {
  surgos: 0,
  magas: 1,
  normal: 2,
};

/** The default order of every task list: overdue first, then urgent, then by deadline. */
export function feladatSorrend(
  a: { kesik: boolean; prioritas: FeladatPrioritas; hatarido: string; createdAt: string },
  b: { kesik: boolean; prioritas: FeladatPrioritas; hatarido: string; createdAt: string },
): number {
  return (
    Number(b.kesik) - Number(a.kesik) ||
    PRIORITAS_SULY[a.prioritas] - PRIORITAS_SULY[b.prioritas] ||
    a.hatarido.localeCompare(b.hatarido) ||
    b.createdAt.localeCompare(a.createdAt)
  );
}

/** A task as one list row: a single task, or a whole group task with every member. */
export type FeladatEgyseg = {
  /** The group id, or the task id of a single task. */
  kulcs: string;
  /** The copy the row opens: the viewer's own, else the elsődleges felelős's, else the first. */
  id: string;
  csoportos: boolean;
  cim: string;
  leiras?: string;
  prioritas: FeladatPrioritas;
  /** Earliest deadline among the open copies (a group's copies may differ after a reissue). */
  hatarido: string;
  kesik: boolean;
  allapot: FeladatAllapot;
  kiadoId: string;
  kiadoNev: string;
  createdAt: string;
  sajat: boolean;
  /** The felelős of a single task; the elsődleges felelős of a group (or "—" when none). */
  felelosNev: string;
  szerep: FeladatSor["szerep"];
  tagok: FeladatCsoportTag[];
  haladas: FeladatHaladas;
  /** The copies of this unit that came in the list (the rest are only in `tagok`). */
  peldanyok: FeladatSor[];
  kapcsolatModul?: string;
};

function egyediTag(f: FeladatSor): FeladatCsoportTag {
  const l = f.aktualisLepes;
  return {
    id: f.id,
    felelosNev: f.felelosNev,
    allapot: f.allapot,
    elsodleges: false,
    hatarido: f.hatarido,
    kesik: f.kesik,
    lepesKesz: f.lepesek.filter((x) => x.kesz).length,
    lepesOsszes: f.lepesek.length,
    aktualisLepes: l?.nev,
    utolsoMegjegyzes: f.megjegyzesek.at(-1)
      ? {
          szerzoNev: f.megjegyzesek.at(-1)!.szerzoNev,
          szoveg: f.megjegyzesek.at(-1)!.szoveg,
          mikor: f.megjegyzesek.at(-1)!.mikor,
        }
      : undefined,
    kovetkezoId: f.kovetkezoId,
    elozmenyId: f.elozmenyId,
    sajat: f.sajat,
  };
}

const NYITOTT: FeladatAllapot[] = ["kiadva", "elfogadva", "elutasitva"];

/**
 * Folds the copies of each group task into one unit, keeps single tasks as they are, and sorts
 * with `feladatSorrend`. Order of first appearance does not matter — the result is sorted.
 */
export function feladatEgysegek(sorok: readonly FeladatSor[]): FeladatEgyseg[] {
  const byKulcs = new Map<string, FeladatSor[]>();
  for (const f of sorok) {
    const k = f.csoport?.id ?? f.id;
    const lista = byKulcs.get(k);
    if (lista) lista.push(f);
    else byKulcs.set(k, [f]);
  }
  const out: FeladatEgyseg[] = [];
  for (const [kulcs, peldanyok] of byKulcs) {
    const elso = peldanyok[0]!;
    const cs = elso.csoport;
    const tagok = cs ? cs.tagok : [egyediTag(elso)];
    const haladas = cs ? cs.haladas : csoportHaladas(tagok);
    const nyitottak = tagok.filter((t) => NYITOTT.includes(t.allapot));
    const hatarido =
      (nyitottak.length ? nyitottak : tagok).map((t) => t.hatarido).sort()[0] ??
      elso.hatarido;
    const sajatPeldany = peldanyok.find((p) => p.szerep === "felelos");
    const elsodleges = tagok.find((t) => t.elsodleges && szamitoTag(t));
    const megnyit =
      sajatPeldany ?? peldanyok.find((p) => p.id === elsodleges?.id) ?? peldanyok[0]!;
    out.push({
      kulcs,
      id: megnyit.id,
      csoportos: Boolean(cs),
      cim: elso.cim,
      leiras: elso.leiras,
      prioritas: peldanyok.reduce<FeladatPrioritas>(
        (p, f) => (PRIORITAS_SULY[f.prioritas] < PRIORITAS_SULY[p] ? f.prioritas : p),
        "normal",
      ),
      hatarido,
      kesik: cs ? haladas.kesik > 0 : elso.kesik,
      allapot: cs ? osszesitettAllapot(tagok) : elso.allapot,
      kiadoId: elso.kiadoId,
      kiadoNev: elso.kiadoNev,
      createdAt: peldanyok.map((p) => p.createdAt).sort()[0]!,
      sajat: !cs && elso.sajat,
      felelosNev: cs ? (elsodleges?.felelosNev ?? "—") : elso.felelosNev,
      szerep: megnyit.szerep,
      tagok,
      haladas,
      peldanyok,
      kapcsolatModul: elso.kapcsolat?.modul,
    });
  }
  return out.sort(feladatSorrend);
}

/** Initials for an avatar: "Kiss Anna" → "KA". */
export function monogram(nev: string): string {
  const reszek = nev.trim().split(/\s+/).filter(Boolean);
  if (reszek.length === 0) return "?";
  if (reszek.length === 1) return reszek[0]!.slice(0, 2).toUpperCase();
  return (reszek[0]![0]! + reszek.at(-1)![0]!).toUpperCase();
}
