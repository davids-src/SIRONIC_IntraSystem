import { isSafeReturnTo } from "@crm/auth-core";
import { issuer } from "./issuer";

/** Picks a same-origin `return_to` value out of a Next.js searchParams entry, or null. */
export function safeReturnTo(value: string | string[] | undefined): string | null {
  const v = Array.isArray(value) ? value[0] : value;
  if (v && isSafeReturnTo(v, issuer())) return v;
  return null;
}

/** Threads `returnTo` through a same-app redirect so it survives the /setup <-> /login hop. */
export function withReturnTo(path: string, returnTo: string | null): string {
  return returnTo ? `${path}?return_to=${encodeURIComponent(returnTo)}` : path;
}

/** Where /login should send the browser before rendering the form, or null to render it. */
export function loginRedirectTarget(params: {
  userCount: number;
  hasSession: boolean;
  returnTo: string | null;
}): string | null {
  if (params.userCount === 0) return withReturnTo("/setup", params.returnTo);
  if (params.hasSession) return params.returnTo ?? "/me";
  return null;
}

/** Where /setup should send the browser instead of rendering the form, or null to render it. */
export function setupRedirectTarget(params: {
  userCount: number;
  returnTo: string | null;
}): string | null {
  return params.userCount > 0 ? withReturnTo("/login", params.returnTo) : null;
}
