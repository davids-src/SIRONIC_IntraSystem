/** Client-safe constants of the Titoktár — no Mongoose, no Node crypto. */

export const SECRETS_PERMISSIONS = {
  read: "secrets:titok:read",
  write: "secrets:titok:write",
  delete: "secrets:titok:delete",
  share: "secrets:titok:share",
  reveal: "secrets:titok:reveal",
} as const;

/** Any of these shows the sidebar entry. */
export const SECRETS_READ_PERMISSION_KEYS: readonly string[] =
  Object.values(SECRETS_PERMISSIONS);

export const SECRET_NAME_MAX = 120;
export const SECRET_DESCRIPTION_MAX = 1000;
export const SECRET_VALUE_MAX = 10_000;

/** The revealed value disappears from the screen after this long (legacy manual §4.2). */
export const SECRET_REVEAL_HIDE_MS = 10_000;

export const SHARE_KINDS = ["user", "role"] as const;
export type ShareKind = (typeof SHARE_KINDS)[number];
export const SHARE_KIND_LABELS: Record<ShareKind, string> = {
  user: "Felhasználó",
  role: "Szerepkör",
};

/** `read` = may see the entry (and reveal it with the reveal key); `edit` = may also change it. */
export const SHARE_LEVELS = ["read", "edit"] as const;
export type ShareLevel = (typeof SHARE_LEVELS)[number];
export const SHARE_LEVEL_LABELS: Record<ShareLevel, string> = {
  read: "Olvasás",
  edit: "Szerkesztés",
};

export const ACCESS_ACTIONS = ["reveal"] as const;
export type AccessAction = (typeof ACCESS_ACTIONS)[number];
export const ACCESS_ACTION_LABELS: Record<AccessAction, string> = {
  reveal: "Megjelenítés",
};

export type SecretViewer = {
  userId: string;
  permissions: readonly string[];
  /** Read from the DB by the caller — the session carries only permission keys. */
  roleIds: readonly string[];
};
