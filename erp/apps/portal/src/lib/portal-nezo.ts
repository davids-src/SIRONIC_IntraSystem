import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import {
  PORTAL_COOKIE_NAME,
  PORTAL_SESSION_MAX_AGE_SEC,
  getPortalIdentity,
  getPortalSecret,
  signPortalSession,
  verifyPortalSession,
  type PortalIdentity,
  type PortalPermission,
} from "@erp/portal-auth";
import { buildPortalNezo, can, type PortalNezo } from "./nezo";

async function readIdentity(): Promise<PortalIdentity | null> {
  const jar = await cookies();
  const token = jar.get(PORTAL_COOKIE_NAME)?.value;
  const claims = await verifyPortalSession(token, process.env.PORTAL_AUTH_SECRET);
  if (!claims) return null;
  // The DB is the source of truth: deactivation and role changes apply at once, and the
  // partner is taken from the DB row, never from the token alone.
  const identity = await getPortalIdentity(claims.portalUserId);
  if (!identity || identity.partnerId !== claims.partnerId) return null;
  return identity;
}

/**
 * THE way a page or action obtains its viewer. Derived from the signed session cookie only —
 * never from request params, headers or form fields. Redirects to the login when there is none.
 */
export async function getPortalNezo(): Promise<PortalNezo> {
  const identity = await readIdentity();
  if (!identity) redirect("/login");
  return buildPortalNezo(identity);
}

/** Like `getPortalNezo`, but 404s unless the viewer holds the permission. */
export async function requirePortalPermission(
  permission: PortalPermission,
): Promise<PortalNezo> {
  const nezo = await getPortalNezo();
  if (!can(nezo, permission)) notFound();
  return nezo;
}

/** Non-redirecting variant for pages that behave differently when logged in (login page). */
export async function hasPortalSession(): Promise<boolean> {
  return (await readIdentity()) !== null;
}

function secureCookie(): boolean {
  const url = process.env.PORTAL_URL || process.env.APP_URL || process.env.AUTH_URL || "";
  return url.startsWith("https://");
}

export async function startPortalSession(identity: PortalIdentity): Promise<void> {
  const token = await signPortalSession(
    {
      portalUserId: identity.portalUserId,
      partnerId: identity.partnerId,
      rolak: identity.rolak,
    },
    getPortalSecret(),
  );
  const jar = await cookies();
  jar.set(PORTAL_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: secureCookie(),
    path: "/",
    maxAge: PORTAL_SESSION_MAX_AGE_SEC,
  });
}

export async function endPortalSession(): Promise<void> {
  const jar = await cookies();
  jar.delete(PORTAL_COOKIE_NAME);
}
