/**
 * Projekt facade — composed from the per-entity facade files. No permission checks here
 * (Server Actions do that); the actor / viewer is always a parameter.
 */
import { projektFacade } from "./projekt-api";
import { hetiFacade } from "./heti-api";
import { egyebFacade } from "./egyeb-api";
import type { TaskRef } from "@erp/core";

export const projektApi = {
  ...projektFacade,
  ...hetiFacade,
  ...egyebFacade,

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
