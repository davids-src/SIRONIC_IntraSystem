/**
 * Viewer scoping — pure functions, so the isolation rule is unit-testable without a database.
 * Every facade read takes a `Nezo`. A portal viewer is structurally limited: only the
 * non-archived deployments of its own partner, and — unless it is a partner admin — only the
 * ones granted to it (`PartnerTelepitesHozzaferes`), projected to a safe allow-listed shape.
 */
import type { Nezo, NezoPortal } from "./constants";

export const isPortal = (n: Nezo): n is NezoPortal => n.kind === "portal";

/**
 * Mongo filter every Telepítés read is ANDed with. `hozzaferesIds` = ids granted to the portal
 * user (the facade loads them); ignored for staff and for partner admins.
 */
export function telepitesNezoSzuro(
  nezo: Nezo,
  hozzaferesIds: readonly string[] = [],
): Record<string, unknown> {
  if (!isPortal(nezo)) return {};
  // An empty partner id must match nothing (never "every deployment without a partner").
  if (!nezo.partnerId) return { _id: { $in: [] } };
  const alap: Record<string, unknown> = {
    partnerId: nezo.partnerId,
    allapot: { $nin: ["archivalt", "nyilvantartas"] },
  };
  if (nezo.partnerAdmin) return alap;
  return { ...alap, _id: { $in: [...hozzaferesIds] } };
}

/** Fields a portal viewer may be given for a deployment (allow-list, not a deny-list). */
export const PORTAL_TELEPITES_MEZOK = [
  "id",
  "azonosito",
  "nev",
  "domain",
  "allapot",
  "csomagNev",
  "arHuf",
  "ciklus",
  "utolsoFizetes",
] as const;

/** Fields a portal viewer may be given for a payment. */
export const PORTAL_FIZETES_MEZOK = [
  "id",
  "idoszakKezdet",
  "idoszakVeg",
  "osszegHuf",
  "allapot",
  "fizetve",
] as const;

export function szukit<T extends Record<string, unknown>, K extends keyof T>(
  sor: T,
  mezok: readonly K[],
): Pick<T, K> {
  const ki = {} as Pick<T, K>;
  for (const m of mezok) ki[m] = sor[m];
  return ki;
}
