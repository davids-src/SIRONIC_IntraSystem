/**
 * Projekt facade — composed from the per-entity facade files. No permission checks here
 * (Server Actions do that); the actor / viewer is always a parameter.
 */
import type { DataTableQuery } from "@erp/ui";
import { projektFacade } from "./projekt-api";
import { hetiFacade } from "./heti-api";
import { egyebFacade } from "./egyeb-api";
import {
  SEARCH_PER_TYPE,
  type SearchHit,
  type SearchViewer,
  type TaskRef,
} from "@erp/core";

export const projektApi = {
  ...projektFacade,
  ...hetiFacade,
  ...egyebFacade,

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
    if (viewer.permissions.includes("projekt:projekt:read")) {
      const { data } = await projektFacade.listProjektek(sq, {
        kind: "staff",
        userId: viewer.userId,
      });
      for (const p of data)
        out.push({
          module: "projekt",
          entityLabel: "Projekt",
          entityId: p._id,
          title: `${p.azonosito} · ${p.nev}`,
          url: `/projekt/${p._id}`,
        });
    }
    return out;
  },

  /** Everything the user owes in this module — feeds Teendőim. */
  async listMyAssignments(userId: string): Promise<TaskRef[]> {
    const [projektek, hetiek] = await Promise.all([
      projektFacade.listMyAssignments(userId),
      hetiFacade.listMyHetiTervek(userId),
    ]);
    return [...hetiek, ...projektek];
  },
};

export type {
  ProjektDetail,
  ProjektPortalNezet,
  ProjektOsszegzes,
  FazisSor,
  StagingSor,
  ChecklistSor,
} from "./projekt-api";
export type { HetiTervSor, HetiSzuro } from "./heti-api";
export type { KoltsegOsszesito, SablonDetail, AlaprajzSor } from "./egyeb-api";
export type { ProjektResult, Szereplo, HetiSzereplo } from "./shared";
