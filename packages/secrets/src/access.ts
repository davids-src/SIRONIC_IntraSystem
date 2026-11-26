import { SECRETS_PERMISSIONS, type SecretViewer, type ShareLevel } from "./constants";

/** What the access functions need to know about one secret and its shares. */
export type SecretAccessSubject = {
  ownerId: string;
  shares: ReadonlyArray<{ kind: "user" | "role"; targetId: string; level: ShareLevel }>;
};

const has = (v: SecretViewer, key: string) => v.permissions.includes(key);

/** The viewer's best share level on the secret, or null when it is not shared with them. */
export function shareLevelOf(v: SecretViewer, s: SecretAccessSubject): ShareLevel | null {
  let best: ShareLevel | null = null;
  for (const sh of s.shares) {
    const hit =
      (sh.kind === "user" && sh.targetId === v.userId) ||
      (sh.kind === "role" && v.roleIds.includes(sh.targetId));
    if (!hit) continue;
    if (sh.level === "edit") return "edit";
    best = "read";
  }
  return best;
}

export const isOwner = (v: SecretViewer, s: SecretAccessSubject) =>
  s.ownerId === v.userId;

/** Key AND relation: the read key plus ownership or a share. Admin has no bypass. */
export function canRead(v: SecretViewer, s: SecretAccessSubject): boolean {
  return (
    has(v, SECRETS_PERMISSIONS.read) && (isOwner(v, s) || shareLevelOf(v, s) !== null)
  );
}

export function canReveal(v: SecretViewer, s: SecretAccessSubject): boolean {
  return has(v, SECRETS_PERMISSIONS.reveal) && canRead(v, s);
}

export function canWrite(v: SecretViewer, s: SecretAccessSubject): boolean {
  return (
    has(v, SECRETS_PERMISSIONS.write) &&
    canRead(v, s) &&
    (isOwner(v, s) || shareLevelOf(v, s) === "edit")
  );
}

export function canDelete(v: SecretViewer, s: SecretAccessSubject): boolean {
  return has(v, SECRETS_PERMISSIONS.delete) && isOwner(v, s);
}

export function canShare(v: SecretViewer, s: SecretAccessSubject): boolean {
  return has(v, SECRETS_PERMISSIONS.share) && isOwner(v, s);
}

/** Mongo filter for the list; `sharedIds` are the secret ids shared with the viewer. */
export function buildListFilter(
  v: SecretViewer,
  sharedIds: readonly unknown[],
): Record<string, unknown> {
  if (!has(v, SECRETS_PERMISSIONS.read)) return { _id: { $in: [] } };
  return { $or: [{ ownerId: v.userId }, { _id: { $in: [...sharedIds] } }] };
}
