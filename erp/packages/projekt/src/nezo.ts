/**
 * Viewer scoping — pure functions, so the isolation rule is unit-testable without a database.
 *
 * Every facade read takes a `Nezo`. A portal viewer is structurally limited: only the visible,
 * non-archived projects of its own partner, projected to a safe shape (no internal notes, no
 * checklist, no expenses).
 */
import type { Nezo, NezoPortal } from "./constants";

export const isPortal = (n: Nezo): n is NezoPortal => n.kind === "portal";

/** Mongo filter every Projekt read is ANDed with. Staff: archived rows hidden by the caller. */
export function projektNezoSzuro(nezo: Nezo): Record<string, unknown> {
  if (!isPortal(nezo)) return {};
  // An empty partner id must match nothing (never "all partners without a partner").
  if (!nezo.partnerId) return { _id: { $in: [] } };
  return { partnerId: nezo.partnerId, portalLathato: true, archivalt: { $ne: true } };
}

/** Fields a portal viewer may be given for a project (allow-list, not a deny-list). */
export const PORTAL_PROJEKT_MEZOK = [
  "id",
  "azonosito",
  "nev",
  "leiras",
  "allapot",
  "hatarido",
  "szazalek",
  "fazisok",
  "stagingLinkek",
] as const;
