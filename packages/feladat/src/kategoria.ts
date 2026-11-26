/**
 * Feladat kategória (PROJECT_PLAN #65): picked from the admin-managed list (`kategoria-lista`,
 * defaults = module names). Pure helpers — no
 * runtime imports, so the client barrel, the facade and the KPI share them.
 */
import type { FeladatAllapot } from "./constants";

export const FELADAT_KATEGORIA_MAX = 60;
/** The bucket of tasks without a category, in groupings. */
export const NINCS_KATEGORIA = "Nincs kategória";

/** Display form: trimmed, inner whitespace collapsed, capped; empty → undefined. */
export function tisztaKategoria(s: string | undefined | null): string | undefined {
  const v = (s ?? "").replace(/\s+/g, " ").trim().slice(0, FELADAT_KATEGORIA_MAX).trim();
  return v || undefined;
}

/**
 * Matching key: case- and accent-insensitive, so "szerződés", "Szerzodes " and "SZERZŐDÉS" are
 * the same category — a new spelling of an existing one reuses the existing spelling.
 */
export function kategoriaKulcs(s: string): string {
  return (tisztaKategoria(s) ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

/** The categories the admin list starts with: the ERP module names. */
export const ALAP_KATEGORIAK = [
  "Partnerek",
  "Értékesítés",
  "Projektek",
  "Készlet",
  "Szerviz",
  "Bizonylatok",
  "Eszközök",
  "Infrastruktúra",
] as const;

/**
 * Default category of a linked task by its owning module (`modul`), optionally refined per entity
 * (`modul:tipus`). The values must be entries of `ALAP_KATEGORIAK`.
 */
export const KAPCSOLAT_KATEGORIAK: Record<string, string> = {
  partner: "Partnerek",
  ertekesites: "Értékesítés",
  projekt: "Projektek",
  keszlet: "Készlet",
  szerviz: "Szerviz",
  bizonylat: "Bizonylatok",
  eszkoz: "Eszközök",
  infra: "Infrastruktúra",
};

export function kapcsolatKategoria(k: {
  modul: string;
  tipus: string;
}): string | undefined {
  return KAPCSOLAT_KATEGORIAK[`${k.modul}:${k.tipus}`] ?? KAPCSOLAT_KATEGORIAK[k.modul];
}

/** One task copy as the grouping needs it. */
export type KategoriaTetel = {
  kategoria?: string;
  felelosNev: string;
  kiadoNev: string;
  allapot: FeladatAllapot;
  /** `YYYY-MM-DD`. */
  hatarido: string;
  createdAt: Date;
  /** When it was closed (`lezarva`), if it was. */
  lezarva?: Date;
  /** Budapest calendar day of `lezarva`. */
  lezarvaNap?: string;
};

export type FeladatCsoportositas = "kategoria" | "felelos" | "kiado";

export type FeladatCsoportStat = {
  nev: string;
  osszes: number;
  nyitott: number;
  kesz: number;
  lejart: number;
  elutasitott: number;
  visszavont: number;
  hataridoreKesz: number;
  /** Percentage of the done ones closed by their deadline; undefined with none done. */
  hataridoreSzazalek?: number;
  /** Average days from given to done. */
  atlagNap?: number;
};

const NAP = 86_400_000;

/**
 * Per-group task stats (per copy, the same rules as the KPI totals: handed-on copies are not
 * counted, the copy they became is). Largest group first; the "Nincs kategória" bucket last.
 */
export function csoportStatisztika(
  tetelek: KategoriaTetel[],
  szerint: FeladatCsoportositas,
  ma: string,
): FeladatCsoportStat[] {
  const csoportok = new Map<string, FeladatCsoportStat & { _napok: number[] }>();
  for (const t of tetelek) {
    if (t.allapot === "tovabbadva") continue;
    const nev =
      szerint === "kategoria"
        ? (tisztaKategoria(t.kategoria) ?? NINCS_KATEGORIA)
        : szerint === "felelos"
          ? t.felelosNev
          : t.kiadoNev;
    let c = csoportok.get(nev);
    if (!c) {
      c = {
        nev,
        osszes: 0,
        nyitott: 0,
        kesz: 0,
        lejart: 0,
        elutasitott: 0,
        visszavont: 0,
        hataridoreKesz: 0,
        _napok: [],
      };
      csoportok.set(nev, c);
    }
    c.osszes++;
    const nyitva = t.allapot === "kiadva" || t.allapot === "elfogadva";
    if (nyitva || t.allapot === "elutasitva") c.nyitott++;
    if (nyitva && t.hatarido < ma) c.lejart++;
    if (t.allapot === "elutasitva") c.elutasitott++;
    if (t.allapot === "visszavonva") c.visszavont++;
    if (t.allapot === "lezarva") {
      c.kesz++;
      if (t.lezarva) {
        c._napok.push(
          Math.max(0, Math.round((t.lezarva.getTime() - t.createdAt.getTime()) / NAP)),
        );
        if ((t.lezarvaNap ?? t.lezarva.toISOString().slice(0, 10)) <= t.hatarido)
          c.hataridoreKesz++;
      }
    }
  }
  return [...csoportok.values()]
    .map(({ _napok, ...c }) => ({
      ...c,
      hataridoreSzazalek: c.kesz
        ? Math.round((c.hataridoreKesz / c.kesz) * 100)
        : undefined,
      atlagNap: _napok.length
        ? Math.round((_napok.reduce((a, b) => a + b, 0) / _napok.length) * 10) / 10
        : undefined,
    }))
    .sort(
      (a, b) =>
        Number(a.nev === NINCS_KATEGORIA) - Number(b.nev === NINCS_KATEGORIA) ||
        b.osszes - a.osszes ||
        a.nev.localeCompare(b.nev, "hu"),
    );
}
