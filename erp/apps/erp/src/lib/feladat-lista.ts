import {
  FELADAT_ALLAPOT_LABELS,
  FELADAT_ALLAPOT_TONES,
  feladatEgysegek,
  szamitoTag,
  type FeladatCsoportTag,
  type FeladatPrioritas,
  type FeladatSor,
} from "@erp/feladat/client";
import { folyamatHaladas, type FolyamatNezet } from "@erp/core/folyamat";
import {
  TEENDO_KATEGORIA_LABELS,
  hataridoSav,
  type HataridoSav,
  type Teendo,
  type TeendoKategoria,
} from "./teendo";

/**
 * Feladatok list rows (rebuild 2026-11-19): one flat shape for every view, so every view is the
 * same system table — the whole row opens the task (or the module's page), filters are the
 * table's own. Built on the server, plain data only.
 */

export type ListaTon = "info" | "warning" | "danger" | "success" | "neutral";

export type ListaSor = {
  _id: string;
  href: string;
  cim: string;
  /** One muted line under the title: who gave it, which machine, … */
  alcim?: string;
  forras: TeendoKategoria;
  /** Filter key of the state; `allapotCimke` is what the cell says. */
  allapot: string;
  allapotCimke: string;
  allapotTon: ListaTon;
  prioritas: FeladatPrioritas;
  /** `YYYY-MM-DD`, empty when none. */
  hatarido: string;
  sav: HataridoSav;
  kesik: boolean;
  felelos: string;
  kiado: string;
  /** Group task: "3/5 kész". */
  haladas?: string;
  /** Steps of a single task: "2/5 lépés · Anyag rendelése". */
  lepes?: string;
  createdAt: string;
  /** Free category (#65), `''` when none. */
  kategoria: string;
  /** Linked task: `modul:tipus:id` of its entity — the page adds the flow's state. */
  kapcsolatKulcs?: string;
  /** Linked task: where the entity's flow stands ("Szerződés … · Véleményezés alatt · X"). */
  folyamat?: string;
  /**
   * Progress cell (#67): who is on it (avatars), how far it got and who has it now — a group
   * task's members, a Feladat-folyamat's / module flow's step felelősök, a task's own steps.
   */
  resztvevok?: Array<{
    id?: string;
    nev: string;
    kep?: string;
    kesz?: boolean;
    most?: boolean;
  }>;
  haladasSzazalek?: number;
  /** "2/4 · Kovács Diána", "3/5 kész". */
  haladasCimke?: string;
};

const kulcsOf = (k?: { modul: string; tipus: string; id: string }) =>
  k ? `${k.modul}:${k.tipus}:${k.id}` : undefined;

/** State keys of the Teendőim view (from the viewer's side, not the raw task state). */
export const TEENDO_ALLAPOTOK = {
  elfogadasra_var: "Elfogadásra vár",
  folyamatban: "Folyamatban",
  elutasitva: "Elutasították",
  modul: "Modul teendője",
} as const;

const PRIORITAS_SOR: Record<FeladatPrioritas, number> = {
  surgos: 0,
  magas: 1,
  normal: 2,
};
const SAV_SOR: Record<HataridoSav, number> = {
  lejart: 0,
  ma: 1,
  het: 2,
  kesobb: 3,
  nincs: 4,
};

/** Most pressing first: overdue → today → urgent → waiting for acceptance → deadline. */
export function rendez(sorok: ListaSor[]): ListaSor[] {
  return [...sorok].sort(
    (a, b) =>
      SAV_SOR[a.sav] - SAV_SOR[b.sav] ||
      PRIORITAS_SOR[a.prioritas] - PRIORITAS_SOR[b.prioritas] ||
      Number(b.allapot === "elfogadasra_var") - Number(a.allapot === "elfogadasra_var") ||
      (a.hatarido || "9999").localeCompare(b.hatarido || "9999") ||
      a.cim.localeCompare(b.cim, "hu"),
  );
}

function lepesSzoveg(f: FeladatSor): string | undefined {
  const l = f.aktualisLepes;
  if (!l || (f.allapot !== "kiadva" && f.allapot !== "elfogadva")) return undefined;
  return `${l.sorszam}/${l.osszes} lépés · ${l.nev}`;
}

/** Progress fields of a single task / a group (flows are added by the page). */
function haladasMezok(
  f: FeladatSor,
  csoport?: { tagok: FeladatCsoportTag[]; kesz: number; aktiv: number },
): Pick<ListaSor, "resztvevok" | "haladasSzazalek" | "haladasCimke"> {
  if (csoport) {
    const tagok = csoport.tagok.filter(szamitoTag);
    return {
      resztvevok: tagok.map((t) => ({
        id: t.felelosId,
        nev: t.felelosNev,
        kesz: t.allapot === "lezarva",
      })),
      haladasSzazalek: csoport.aktiv
        ? Math.round((csoport.kesz / csoport.aktiv) * 100)
        : 0,
      haladasCimke: `${csoport.kesz}/${csoport.aktiv} kész`,
    };
  }
  const osszes = f.lepesek.length;
  const kesz = f.lepesek.filter((l) => l.kesz).length;
  return {
    resztvevok: f.sajat
      ? undefined
      : [{ nev: f.felelosNev, kesz: f.allapot === "lezarva", most: true }],
    ...(osszes > 0
      ? {
          haladasSzazalek: Math.round((kesz / osszes) * 100),
          haladasCimke: `${kesz}/${osszes} részlépés`,
        }
      : {}),
  };
}

/** A Teendőim item: a task the viewer has to act on, or another module's item. */
export function teendoSor(t: Teendo, ma: string): ListaSor {
  const f = t.feladat;
  const sav = hataridoSav(t.hatarido, ma);
  if (!f) {
    return {
      _id: t.key,
      href: t.url ?? "/feladatok",
      cim: t.cim,
      alcim: [t.alcim, t.allapot].filter(Boolean).join(" · ") || undefined,
      forras: t.kategoria,
      allapot: "modul",
      allapotCimke: TEENDO_KATEGORIA_LABELS[t.kategoria],
      allapotTon: "neutral",
      prioritas: "normal",
      hatarido: t.hatarido ?? "",
      sav,
      kesik: sav === "lejart",
      felelos: "",
      kiado: "",
      createdAt: "",
      kategoria: "",
    };
  }
  const allapot = t.uj
    ? "elfogadasra_var"
    : f.allapot === "elutasitva"
      ? "elutasitva"
      : "folyamatban";
  return {
    _id: t.key,
    href: `/feladatok/${f.id}`,
    cim: f.cim,
    alcim: f.sajat
      ? "Saját feladat"
      : allapot === "elutasitva"
        ? `${f.felelosNev} elutasította — add ki másnak, vagy vond vissza`
        : `Kiadta: ${f.kiadoNev}${f.csoport ? ` · csoportos, ${f.csoport.tagok.length} fő` : ""}`,
    forras: t.kategoria,
    allapot,
    allapotCimke: TEENDO_ALLAPOTOK[allapot],
    allapotTon:
      allapot === "elfogadasra_var"
        ? "info"
        : allapot === "elutasitva"
          ? "danger"
          : "warning",
    prioritas: f.prioritas,
    hatarido: f.hatarido,
    sav,
    kesik: f.kesik,
    felelos: f.sajat ? "Saját" : f.felelosNev,
    kiado: f.kiadoNev,
    lepes: lepesSzoveg(f),
    ...haladasMezok(
      f,
      f.csoport
        ? {
            tagok: f.csoport.tagok,
            kesz: f.csoport.haladas.kesz,
            aktiv: f.csoport.haladas.aktiv,
          }
        : undefined,
    ),
    createdAt: f.createdAt,
    kategoria: f.kategoria ?? "",
    kapcsolatKulcs: kulcsOf(f.kapcsolat),
  };
}

/** Given-out / everyone's / closed views: one row per task, a group task once. */
export function feladatSorok(feladatok: FeladatSor[], ma: string): ListaSor[] {
  return feladatEgysegek(feladatok).map((e) => {
    const egyetlen = !e.csoportos ? e.peldanyok[0] : undefined;
    return {
      _id: e.kulcs,
      href: `/feladatok/${e.id}`,
      cim: e.cim,
      alcim: e.csoportos
        ? `Csoportos · ${e.tagok.map((t) => t.felelosNev).join(", ")}`
        : e.sajat
          ? "Saját feladat"
          : undefined,
      forras: e.sajat ? "sajat" : "kollegatol",
      allapot: e.allapot,
      allapotCimke: FELADAT_ALLAPOT_LABELS[e.allapot],
      allapotTon: FELADAT_ALLAPOT_TONES[e.allapot] as ListaTon,
      prioritas: e.prioritas,
      hatarido: e.hatarido,
      sav: hataridoSav(e.hatarido, ma),
      kesik: e.kesik,
      // Every member's name, so the search and the felelős filter find a group by anyone in it.
      felelos: e.csoportos ? e.tagok.map((t) => t.felelosNev).join(", ") : e.felelosNev,
      kiado: e.kiadoNev,
      haladas: e.csoportos ? `${e.haladas.kesz}/${e.haladas.aktiv} kész` : undefined,
      ...(e.peldanyok[0]
        ? haladasMezok(
            e.peldanyok[0],
            e.csoportos
              ? { tagok: e.tagok, kesz: e.haladas.kesz, aktiv: e.haladas.aktiv }
              : undefined,
          )
        : {}),
      lepes: egyetlen ? lepesSzoveg(egyetlen) : undefined,
      createdAt: e.createdAt,
      kategoria: e.peldanyok[0]?.kategoria ?? "",
      kapcsolatKulcs: kulcsOf(e.peldanyok[0]?.kapcsolat),
    };
  });
}

/** Groupings of the list (#65). */
export const LISTA_CSOPORTOSITASOK = {
  kategoria: "Kategória",
  felelos: "Felelős",
  kiado: "Kiadó",
} as const;
export type ListaCsoportositas = keyof typeof LISTA_CSOPORTOSITASOK;

export const NINCS_CSOPORT = {
  kategoria: "Nincs kategória",
  felelos: "—",
  kiado: "—",
} as const;

export type ListaCsoport = {
  nev: string;
  sorok: ListaSor[];
  nyitott: number;
  lejart: number;
};

const LEZART = new Set(["lezarva", "visszavonva", "tovabbadva"]);

/**
 * Rows grouped by kategória / felelős / kiadó, the order inside a group kept. Largest group
 * first; the empty bucket ("Nincs kategória") last.
 */
export function csoportositSorok(
  sorok: ListaSor[],
  szerint: ListaCsoportositas,
): ListaCsoport[] {
  const ures = NINCS_CSOPORT[szerint];
  const map = new Map<string, ListaCsoport>();
  for (const s of sorok) {
    const nev = (szerint === "kategoria" ? s.kategoria : s[szerint]).trim() || ures;
    let c = map.get(nev);
    if (!c) {
      c = { nev, sorok: [], nyitott: 0, lejart: 0 };
      map.set(nev, c);
    }
    c.sorok.push(s);
    if (!LEZART.has(s.allapot)) c.nyitott++;
    if (s.kesik) c.lejart++;
  }
  return [...map.values()].sort(
    (a, b) =>
      Number(a.nev === ures) - Number(b.nev === ures) ||
      b.sorok.length - a.sorok.length ||
      a.nev.localeCompare(b.nev, "hu"),
  );
}

/** Progress fields of a row whose task is a step of a flow (#67): the flow's steps. */
export function folyamatHaladasMezok(
  a: Pick<FolyamatNezet, "lepesek" | "aktualis">,
): Pick<ListaSor, "resztvevok" | "haladasSzazalek" | "haladasCimke"> {
  const h = folyamatHaladas(a.lepesek);
  if (h.osszes === 0) return {};
  return {
    resztvevok: a.lepesek
      .filter((l) => l.allapot !== "kihagyva" && l.felelosNev)
      .map((l) => ({
        id: l.felelosId,
        nev: l.felelosNev!,
        kep: l.felelosKep,
        kesz: l.allapot === "kesz",
        most: l.aktualis,
      })),
    haladasSzazalek: h.szazalek,
    haladasCimke: `${h.kesz}/${h.osszes}${a.aktualis?.felelosNev ? ` · ${a.aktualis.felelosNev}` : ""}`,
  };
}
