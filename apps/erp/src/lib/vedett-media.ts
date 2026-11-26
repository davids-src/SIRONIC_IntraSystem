/**
 * Composition root for protected media (ARCHITECTURE §7.5, #47): which entity types may own a
 * `vedett` file and who may see / upload it. `@erp/media` imports no domain package — it
 * only asks the resolver registered here for a usage's `entityType`. Add a line per new owner
 * (e.g. `'szerzodes'` → `ertekesites:szerzodes:read`) when its attachments move to vedett.
 */
import { registerVedettMediaResolver } from "@erp/media";
import { feladatApi } from "@erp/feladat";

/** Entity type of task attachments (with the task and on its comments). */
export const FELADAT_MEDIA_ENTITY = "feladat";
export const FELADAT_MEDIA_FIELD = "csatolmanyok";

let kesz = false;

/** Idempotent — every route / action that touches protected media calls it first. */
export function regisztralVedettMedia(): void {
  if (kesz) return;
  registerVedettMediaResolver(FELADAT_MEDIA_ENTITY, {
    canView: (viewer, entityId) => feladatApi.canViewFeladat(viewer, entityId),
    canUpload: (viewer, entityId) =>
      feladatApi.canUploadFeladatCsatolmany(viewer, entityId),
  });
  kesz = true;
}
