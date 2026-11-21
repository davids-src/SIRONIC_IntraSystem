/**
 * The domain facade of the Telepítések module: `deploymentsApi`. No permission checks here
 * (Server Actions own that); the facade owns field-level safety (no credentials in any DTO) and
 * the viewer scoping of portal reads.
 */
import { telepitesApi } from "./telepites-api";
import { csomagApi, fizetesApi } from "./penzugy-api";
import { hozzaferesApi, integracioApi, sablonApi } from "./integracio-api";

export const deploymentsApi = {
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
