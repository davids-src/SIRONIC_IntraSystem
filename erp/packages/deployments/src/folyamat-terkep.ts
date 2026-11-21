/**
 * Step state → `@erp/core/folyamat` vocabulary (PROJECT_PLAN #9), so the shared `FolyamatUt`
 * view and Teendőim can show a Telepítés's pipeline.
 *
 *   fuggo      → tervezett   (waiting)
 *   fut        → aktiv       (running)
 *   kezi       → aktiv       (running, waits on a human: NS delegation at the registrar)
 *   kesz       → kesz
 *   adoptalva  → kesz        (an existing resource was adopted — counts as done)
 *   hibas      → elutasitva  (failed; the operator must retry/adopt/skip — "átosztásra vár")
 *   kihagyva   → kihagyva    (view-only state)
 *
 * The engine functions `folyamatKovetkezo` / `folyamatLepesEsemeny` are NOT used: they are driven
 * by linked Feladat events, whereas pipeline steps are executed by operators. Only the shared
 * vocabulary, labels, tones, `folyamatHaladas` and the `FolyamatNezet` shape are reused.
 */
import {
  folyamatAktualis,
  type FolyamatLepesNezet,
  type FolyamatLepesNezetAllapot,
  type FolyamatNezet,
  type FolyamatTon,
} from "@erp/core/folyamat";
import {
  LEPES_LABELS,
  TELEPITES_ALLAPOT_LABELS,
  type LepesAllapot,
  type LepesKulcs,
  type TelepitesAllapot,
} from "./constants";

export const LEPES_FOLYAMAT_ALLAPOT: Record<LepesAllapot, FolyamatLepesNezetAllapot> = {
  fuggo: "tervezett",
  fut: "aktiv",
  kezi: "aktiv",
  kesz: "kesz",
  adoptalva: "kesz",
  hibas: "elutasitva",
  kihagyva: "kihagyva",
};

const TELEPITES_TON: Record<TelepitesAllapot, FolyamatTon> = {
  piszkozat: "neutral",
  kiepites: "info",
  elo: "success",
  serult: "danger",
  felfuggesztve: "warning",
  archivalt: "neutral",
  nyilvantartas: "neutral",
};

export type FolyamatTelepitesAdat = {
  id: string;
  azonosito: string;
  nev: string;
  domain?: string;
  allapot: TelepitesAllapot;
  frissitve: string;
  lepesek: Array<{
    kulcs: LepesKulcs;
    allapot: LepesAllapot;
    uzenet?: string;
    utolsoHiba?: string;
  }>;
};

export function telepitesFolyamatNezet(t: FolyamatTelepitesAdat): FolyamatNezet {
  const elsoNyitott = t.lepesek.findIndex(
    (l) => l.allapot === "hibas" || l.allapot === "kezi" || l.allapot === "fut",
  );
  const lepesek: FolyamatLepesNezet[] = t.lepesek.map((l, i) => ({
    kulcs: l.kulcs,
    nev: LEPES_LABELS[l.kulcs],
    allapot: LEPES_FOLYAMAT_ALLAPOT[l.allapot],
    kesik: false,
    aktualis: i === elsoNyitott,
    megjegyzes: l.utolsoHiba ?? l.uzenet,
  }));
  return {
    modul: "deployments",
    tipus: "telepites",
    id: t.id,
    tipusCimke: "Telepítés",
    cim: `${t.azonosito} — ${t.nev}`,
    alcim: t.domain,
    url: `/telepitesek/${t.id}`,
    allapotKulcs: t.allapot,
    allapotCimke: TELEPITES_ALLAPOT_LABELS[t.allapot],
    allapotTon: TELEPITES_TON[t.allapot],
    lezart: t.allapot === "archivalt",
    aktualis: folyamatAktualis(lepesek),
    lepesek,
    kesik: false,
    frissitve: t.frissitve,
  };
}
