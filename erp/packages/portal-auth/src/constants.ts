/**
 * Partner-portal identity constants. The portal is a SEPARATE trust domain from the staff app:
 * own collection (`portal_users`), own cookie, own signing secret (`PORTAL_AUTH_SECRET`).
 */

/** Never equals Auth.js' `authjs.session-token` / `__Secure-authjs.session-token`. */
export const PORTAL_COOKIE_NAME = "sironic-portal-session";
export const PORTAL_SESSION_MAX_AGE_SEC = 7 * 24 * 60 * 60;
export const PORTAL_JWT_ISSUER = "sironic-portal";
export const PORTAL_JWT_AUDIENCE = "sironic-portal-users";

export const PORTAL_ROLE_ADMIN = "partner-admin";
export const PORTAL_ROLE_VIEWER = "partner-viewer";

export const PORTAL_PERMISSIONS = {
  view: "portal:megtekint",
  ticketCreate: "portal:hibajegy:letrehoz",
  ticketComment: "portal:hibajegy:hozzaszol",
  certificateDecide: "portal:igazolas:dont",
  usersManage: "portal:felhasznalo:kezel",
  accessManage: "portal:hozzaferes:kezel",
} as const;
export type PortalPermission =
  (typeof PORTAL_PERMISSIONS)[keyof typeof PORTAL_PERMISSIONS];

/** Seed data of the `portal_roles` collection (roles live as data; seeding never overwrites). */
export const DEFAULT_PORTAL_ROLES: Array<{
  key: string;
  nev: string;
  permissions: PortalPermission[];
}> = [
  {
    key: PORTAL_ROLE_ADMIN,
    nev: "Partner adminisztrátor",
    permissions: Object.values(PORTAL_PERMISSIONS),
  },
  {
    key: PORTAL_ROLE_VIEWER,
    nev: "Partner megtekintő",
    permissions: [PORTAL_PERMISSIONS.view],
  },
];

export const LOGIN_MAX_FAILED = 5;
export const LOGIN_LOCK_MINUTES = 15;
export const INVITE_VALID_DAYS = 7;
export const RESET_VALID_MINUTES = 60;
export const PASSWORD_MIN_LENGTH = 10;

/** Min length of `PORTAL_AUTH_SECRET`. */
export const PORTAL_SECRET_MIN_LENGTH = 32;
