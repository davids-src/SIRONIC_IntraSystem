/**
 * The domain facade of the Infra module: `infraApi`. No permission checks here (Server Actions,
 * the CLI and the MCP server own that); the facade owns field-level safety (no credentials in any
 * DTO) and the partner scoping of portal reads.
 */
import { attekintesApi } from "./attekintes-api";
import { esemenyApi } from "./esemeny";
import { integracioApi } from "./integracio-api";
import { oldalApi } from "./oldal-api";
import { sablonApi } from "./sablon-api";
import { webhelyApi } from "./webhely-api";
import { stackApi } from "./stack-api";

export const infraApi = {
  ...attekintesApi,
  ...stackApi,
  ...oldalApi,
  ...integracioApi,
  ...sablonApi,
  ...webhelyApi,
  ...esemenyApi,
};

export type { InfraResult } from "./shared";
export type { EsemenySor } from "./esemeny";
export type { IntegracioDetail } from "./integracio-api";
export type { OldalEredmeny } from "./oldal-api";
export type { PortalOldal } from "./attekintes-api";
export type * from "./tipusok";
