/**
 * Client-safe geo primitives — no big datasets here (see `./telepules` for the server-only
 * settlement lookup). Used by the Gépüzemnapló and the Munkaidő napló.
 */

/** A captured position. Timestamps are always set by the server, never trusted from the client. */
export type GeoPont = {
  lat: number;
  lng: number;
  /** Reported accuracy radius in meters, if the device gave one. */
  pontossag?: number;
};

/** A fix less accurate than this (meters) is rejected: it would make the location flags meaningless. */
export const GEO_MAX_PONTOSSAG_M = 500;

const EARTH_RADIUS_KM = 6371.0088;
const toRad = (deg: number) => (deg * Math.PI) / 180;

/** Great-circle distance between two points, in kilometers (haversine). */
export function tavolsagKm(
  a: Pick<GeoPont, "lat" | "lng">,
  b: Pick<GeoPont, "lat" | "lng">,
): number {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

export type GeoValidation = { ok: true; pont: GeoPont } | { ok: false; message: string };

/**
 * Validates a position that arrived from a client: finite, in range, accurate enough. Location
 * is mandatory for login/logout, so callers reject the request when this fails.
 */
export function validateGeoPont(input: unknown): GeoValidation {
  const p = input as Partial<GeoPont> | null | undefined;
  if (
    !p ||
    typeof p.lat !== "number" ||
    typeof p.lng !== "number" ||
    !Number.isFinite(p.lat) ||
    !Number.isFinite(p.lng) ||
    Math.abs(p.lat) > 90 ||
    Math.abs(p.lng) > 180
  ) {
    return {
      ok: false,
      message: "A pozíció megadása kötelező — engedélyezd a helymeghatározást",
    };
  }
  if (p.pontossag !== undefined) {
    if (
      typeof p.pontossag !== "number" ||
      !Number.isFinite(p.pontossag) ||
      p.pontossag < 0
    ) {
      return { ok: false, message: "Érvénytelen pozíció-pontosság" };
    }
    if (p.pontossag > GEO_MAX_PONTOSSAG_M) {
      return {
        ok: false,
        message: `A helymeghatározás túl pontatlan (${Math.round(p.pontossag)} m) — próbáld újra szabad ég alatt`,
      };
    }
  }
  return { ok: true, pont: { lat: p.lat, lng: p.lng, pontossag: p.pontossag } };
}
