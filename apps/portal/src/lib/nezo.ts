import type { PortalIdentity, PortalPermission } from "@erp/portal-auth";

/**
 * The viewer every facade call of this app receives. It is a structural superset of the
 * `NezoPortal` of projekt / szerviz / bizonylat / deployments, so one object satisfies all of them.
 * Built ONLY from a verified portal identity (see `portal-nezo.ts`) — never from request input.
 */
export type PortalNezo = Readonly<{
  kind: "portal";
  partnerId: string;
  portalUserId: string;
  partnerAdmin: boolean;
  /** Display / audit data (not used for scoping). */
  partnerNev: string;
  nev: string;
  email: string;
  permissions: readonly string[];
}>;

export function buildPortalNezo(identity: PortalIdentity): PortalNezo {
  return Object.freeze({
    kind: "portal" as const,
    partnerId: identity.partnerId,
    portalUserId: identity.portalUserId,
    partnerAdmin: identity.partnerAdmin,
    partnerNev: identity.partnerNev,
    nev: identity.name,
    email: identity.email,
    permissions: Object.freeze([...identity.permissions]),
  });
}

export function can(nezo: PortalNezo, permission: PortalPermission): boolean {
  return nezo.permissions.includes(permission);
}
