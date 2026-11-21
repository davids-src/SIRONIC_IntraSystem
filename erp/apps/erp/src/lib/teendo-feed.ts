/**
 * Server side of the merged Feladatok page: every module's `listMyAssignments` in one call
 * (cached per request, so the sidebar badge, the dashboard and the page share one fetch), turned
 * into colour-coded rows.
 */
import { cache } from "react";
import type { TaskRef } from "@erp/core";
import { feladatApi, type FeladatSor } from "@erp/feladat";
import { eszkozApi } from "@erp/eszkoz";
import { partnerApi } from "@erp/partner";
import { projektApi } from "@erp/projekt";
import { keszletApi } from "@erp/keszlet";
import { ertekesitesApi } from "@erp/ertekesites";
import { szervizApi } from "@erp/szerviz";
import { bizonylatApi } from "@erp/bizonylat";
import { deploymentsApi } from "@erp/deployments";
import { userHasPermission } from "@erp/auth";
import { FELADAT_ALLAPOT_LABELS } from "@erp/feladat/client";
import { budapestNap } from "@erp/lib/utils";
import {
  hataridoSav,
  type FeladatJelzes,
  type Teendo,
  type TeendoKategoria,
} from "./teendo";

/** Module label for the row subtitle; domain modules add their entry (fallback: the module key). */
const MODUL_LABELS: Record<string, string> = {
  feladat: "Feladat",
  eszkoz: "Eszköz",
  partner: "Partner",
  projekt: "Projekt",
  keszlet: "Készlet",
  ertekesites: "Értékesítés",
  szerviz: "Szerviz",
  bizonylat: "Bizonylat",
  deployments: "Telepítések",
};

/** Everything assigned to the user in every module (incl. responsibilities), one fetch per request. */
export const getSajatTaskRefs = cache(async (userId: string): Promise<TaskRef[]> => {
  // Domain modules: add `<modul>Api.listMyAssignments(userId)` to this list.
  const all = await Promise.all([
    feladatApi.listMyAssignments(userId),
    eszkozApi.listMyAssignments(userId),
    partnerApi.listMyAssignments(userId),
    projektApi.listMyAssignments(userId),
    keszletApi.listMyAssignments(userId),
    ertekesitesApi.listMyAssignments(userId),
    szervizApi.listMyAssignments(userId),
    bizonylatApi.listMyAssignments(userId),
    telepitesTeendok(userId),
  ]);
  return all.flat();
});

/** Open items only — what is waiting on the user, without the assets they are responsible for. */
export function csakTeendok(refs: TaskRef[]): TaskRef[] {
  return refs.filter((t) => t.kind !== "assignment");
}

export function kategoriaOf(t: Pick<TaskRef, "module" | "entityType">): TeendoKategoria {
  if (t.module === "feladat")
    return t.entityType === "feladat-sajat" ? "sajat" : "kollegatol";
  const modul = MODUL_KATEGORIA[t.module];
  return modul ?? "egyeb";
}

/** TaskRef `module` → "Teendőim" category (deployments surfaces as "telepitesek"). */
const MODUL_KATEGORIA: Record<string, TeendoKategoria> = {
  eszkoz: "eszkoz",
  partner: "partner",
  projekt: "projekt",
  keszlet: "keszlet",
  ertekesites: "ertekesites",
  szerviz: "szerviz",
  bizonylat: "bizonylat",
  deployments: "telepitesek",
};

/** A due date from any module → Budapest calendar day (`YYYY-MM-DD`). */
export function napOf(due: string | undefined): string | undefined {
  if (!due) return undefined;
  if (/^\d{4}-\d{2}-\d{2}$/.test(due)) return due;
  const d = new Date(due);
  return Number.isNaN(d.getTime()) ? undefined : budapestNap(d);
}

export function maiNap(): string {
  return budapestNap(new Date());
}

export function jelzesOf(refs: TaskRef[]): FeladatJelzes {
  const ma = maiNap();
  const teendok = csakTeendok(refs);
  return {
    db: teendok.length,
    lejart: teendok.filter((t) => hataridoSav(napOf(t.dueDate), ma) === "lejart").length,
    uj: teendok.filter(
      (t) =>
        t.module === "feladat" &&
        t.entityType === "feladat" &&
        t.status === FELADAT_ALLAPOT_LABELS.kiadva,
    ).length,
  };
}

/** The sidebar badge — never lets a failing module break the whole layout. */
export async function getFeladatJelzes(userId: string): Promise<FeladatJelzes> {
  try {
    return jelzesOf(await getSajatTaskRefs(userId));
  } catch {
    return { db: 0, lejart: 0, uj: 0 };
  }
}

export function feladatTeendo(f: FeladatSor): Teendo {
  const elutasitott = f.allapot === "elutasitva";
  return {
    key: `feladat-${f.id}`,
    kategoria: f.sajat ? "sajat" : "kollegatol",
    cim: f.cim,
    alcim: f.sajat
      ? f.csoport
        ? `Csoportos feladat · ${f.csoport.tagok.length} fő`
        : "Saját feladat"
      : elutasitott
        ? `${f.felelosNev} elutasította — add ki másnak vagy vond vissza`
        : `${f.kiadoNev} adta${f.csoport ? ` · csoportos, ${f.csoport.tagok.length} fő` : ""}`,
    // The current step (#50) is the most telling status of a task in progress.
    allapot:
      f.aktualisLepes && f.allapot === "elfogadva"
        ? `${f.aktualisLepes.sorszam}/${f.aktualisLepes.osszes} · ${f.aktualisLepes.nev}`
        : FELADAT_ALLAPOT_LABELS[f.allapot],
    hatarido: f.hatarido,
    uj: f.allapot === "kiadva" && f.szerep === "felelos" && !f.sajat,
    feladat: f,
    prioritas: f.prioritas,
  };
}

export function refTeendo(t: TaskRef): Teendo {
  const modul = MODUL_LABELS[t.module] ?? t.module;
  return {
    key: `${t.module}-${t.entityType}-${t.entityId}`,
    kategoria: kategoriaOf(t),
    cim: t.title,
    alcim: t.contextLabel ? `${modul} · ${t.contextLabel}` : modul,
    allapot: t.status,
    hatarido: napOf(t.dueDate),
    uj: false,
    url: t.url,
  };
}

/** Failed/manual pipeline steps, overdue payments and expiring records — only what the user may see. */
async function telepitesTeendok(userId: string): Promise<TaskRef[]> {
  const [telepites, fizetes] = await Promise.all([
    userHasPermission(userId, "deployments:telepites:read"),
    userHasPermission(userId, "deployments:fizetes:read"),
  ]);
  if (!telepites && !fizetes) return [];
  return deploymentsApi.listTeendok({ telepites, fizetes });
}
