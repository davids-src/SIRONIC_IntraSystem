/**
 * The domain facade of the Telepítések module: `deploymentsApi`. No permission checks here
 * (Server Actions own that); the facade owns field-level safety (no credentials in any DTO) and
 * the viewer scoping of portal reads.
 */
import { SEARCH_PER_TYPE, type SearchHit, type SearchViewer } from "@erp/core";
import type { DataTableQuery } from "@erp/ui";
import { telepitesApi } from "./telepites-api";
import { csomagApi, fizetesApi } from "./penzugy-api";
import { hozzaferesApi, integracioApi, sablonApi } from "./integracio-api";

export const deploymentsApi = {
  /**
   * Global search: a few hits per entity type, gated on the viewer's read permissions (checked
   * before any query). Terms shorter than 2 characters return nothing.
   */
  async search(query: string, viewer: SearchViewer): Promise<SearchHit[]> {
    const term = query.trim();
    if (term.length < 2) return [];
    const sq = {
      page: 1,
      pageSize: SEARCH_PER_TYPE,
      search: term,
      filters: {},
    } as unknown as DataTableQuery;
    const out: SearchHit[] = [];
    if (viewer.permissions.includes("deployments:telepites:read")) {
      const { data } = await telepitesApi.listTelepitesek(sq);
      for (const t of data)
        out.push({
          module: "deployments",
          entityLabel: "Telepítés",
          entityId: t._id,
          title: `${t.azonosito} · ${t.nev}`,
          subtitle: [t.domain, t.partnerNev].filter(Boolean).join(" · "),
          url: `/telepitesek/${t._id}`,
        });
    }
    return out;
  },

  ...telepitesApi,
  ...csomagApi,
  ...fizetesApi,
  ...integracioApi,
  ...sablonApi,
  ...hozzaferesApi,
};

export type { DeploymentsResult } from "./shared";
export type {
  TelepitesDetail,
  LepesSor,
  EsemenySor,
  LejaratSor,
  StackEnvSor,
  PortalTelepites,
  TelepitesOsszegzes,
  FuttatOpciok,
} from "./telepites-api";
export type { CsomagDetail, FizetesOsszegzes, PortalFizetes } from "./penzugy-api";
export type { IntegracioDetail, SablonDetail, HozzaferesSor } from "./integracio-api";
