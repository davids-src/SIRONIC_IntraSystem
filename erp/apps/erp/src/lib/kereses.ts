/**
 * Global search (header box + `/kereses`): fans the term out to every module facade's
 * `search(query, viewer)`. Each facade checks the viewer's read permissions itself, so a module
 * the viewer may not read contributes nothing. One failing module never breaks the page.
 */
import type { SearchHit, SearchViewer } from "@erp/core";
import { partnerApi } from "@erp/partner";
import { arlistaApi } from "@erp/arlista";
import { keszletApi } from "@erp/keszlet";
import { ertekesitesApi } from "@erp/ertekesites";
import { szervizApi } from "@erp/szerviz";
import { bizonylatApi } from "@erp/bizonylat";
import { projektApi } from "@erp/projekt";
import { eszkozApi } from "@erp/eszkoz";
import { deploymentsApi } from "@erp/deployments";
import { secretsApi } from "@erp/secrets";
import { toSecretViewer } from "./secrets-viewer";

export const KERESES_MIN_HOSSZ = 2;

export const KERESES_MODUL_LABELS: Record<string, string> = {
  partner: "Partner",
  arlista: "Árlista",
  keszlet: "Készlet",
  ertekesites: "Értékesítés",
  szerviz: "Szerviz",
  bizonylat: "Bizonylat",
  projekt: "Projekt",
  eszkoz: "Eszköz",
  deployments: "Telepítések",
  secrets: "Titoktár",
};

export type KeresesViewer = SearchViewer & { name?: string };

export type KeresesForrasok = Array<{
  modul: string;
  kereses: (q: string, v: KeresesViewer) => Promise<SearchHit[]>;
}>;

const ALAP: KeresesForrasok = [
  { modul: "partner", kereses: (q, v) => partnerApi.search(q, v) },
  { modul: "arlista", kereses: (q, v) => arlistaApi.search(q, v) },
  { modul: "keszlet", kereses: (q, v) => keszletApi.search(q, v) },
  { modul: "ertekesites", kereses: (q, v) => ertekesitesApi.search(q, v) },
  { modul: "szerviz", kereses: (q, v) => szervizApi.search(q, v) },
  { modul: "bizonylat", kereses: (q, v) => bizonylatApi.search(q, v) },
  { modul: "projekt", kereses: (q, v) => projektApi.search(q, v) },
  { modul: "eszkoz", kereses: (q, v) => eszkozApi.search(q, v) },
  { modul: "deployments", kereses: (q, v) => deploymentsApi.search(q, v) },
  {
    modul: "secrets",
    // The secrets list needs the viewer's role ids (role shares); read from the DB here.
    kereses: async (q, v) => {
      if (!v.permissions.includes("secrets:titok:read")) return [];
      return secretsApi.search(
        q,
        await toSecretViewer({
          id: v.userId,
          name: v.name,
          permissions: [...v.permissions],
        }),
      );
    },
  },
];

export type KeresesCsoport = { modul: string; cimke: string; talalatok: SearchHit[] };

export async function globalisKereses(
  query: string,
  viewer: KeresesViewer,
  forrasok: KeresesForrasok = ALAP,
): Promise<KeresesCsoport[]> {
  const term = query.trim();
  if (term.length < KERESES_MIN_HOSSZ) return [];
  const eredmenyek = await Promise.all(
    forrasok.map(async (m) => {
      try {
        return { modul: m.modul, talalatok: await m.kereses(term, viewer) };
      } catch (e) {
        console.error("[kereses]", m.modul, e);
        return { modul: m.modul, talalatok: [] as SearchHit[] };
      }
    }),
  );
  return eredmenyek
    .filter((r) => r.talalatok.length > 0)
    .map((r) => ({
      modul: r.modul,
      cimke: KERESES_MODUL_LABELS[r.modul] ?? r.modul,
      talalatok: r.talalatok,
    }));
}
