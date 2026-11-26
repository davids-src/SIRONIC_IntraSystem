/**
 * Access resolvers for protected (`vedett`) media — ARCHITECTURE §7.5, PROJECT_PLAN #47.
 *
 * A protected file is served only if one of its `usages[].entityType` has a resolver that
 * allows the viewer on that usage's entity. Resolvers are registered by the app's composition
 * root (`apps/erp`), so this package still imports no domain package: `'feladat'` asks the
 * Feladat facade, a later `'szerzodes'` asks the Vállalkozás one, and so on. An entity type
 * without a resolver grants nothing.
 */
import type { MediaUsage } from "@erp/db-core";

export type MediaViewer = { userId: string; permissions: string[] };

export type VedettMediaResolver = {
  /** May the viewer open files attached to this entity? */
  canView(viewer: MediaViewer, entityId: string): Promise<boolean>;
  /**
   * May the viewer upload a protected file for this entity? `entityId` is null when the entity
   * is about to be created (e.g. attachments chosen while giving a new task).
   */
  canUpload(viewer: MediaViewer, entityId: string | null): Promise<boolean>;
};

const resolvers = new Map<string, VedettMediaResolver>();

/** Registers (or replaces) the resolver for one entity type. Idempotent. */
export function registerVedettMediaResolver(
  entityType: string,
  resolver: VedettMediaResolver,
): void {
  resolvers.set(entityType, resolver);
}

export function getVedettMediaResolver(
  entityType: string,
): VedettMediaResolver | undefined {
  return resolvers.get(entityType);
}

/** True if any usage's resolver lets the viewer see the file. No usage, no access. */
export async function canViewVedettMedia(
  media: { usages?: Array<Pick<MediaUsage, "entityType" | "entityId">> },
  viewer: MediaViewer,
): Promise<boolean> {
  for (const u of media.usages ?? []) {
    const r = resolvers.get(u.entityType);
    if (!r) continue;
    try {
      if (await r.canView(viewer, String(u.entityId))) return true;
    } catch {
      // A failing resolver denies, never throws through the file route.
    }
  }
  return false;
}

/** Test helper — forgets every resolver. */
export function clearVedettMediaResolvers(): void {
  resolvers.clear();
}
