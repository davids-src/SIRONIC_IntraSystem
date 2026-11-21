"use client";

import { useCallback, useState } from "react";
import { GEO_MAX_PONTOSSAG_M, type GeoPont } from "@erp/lib/geo";

export type GeoStatus =
  "idle" | "loading" | "ok" | "denied" | "unavailable" | "inaccurate";

/**
 * Captures the device position on demand (login/logout). Location is mandatory for those
 * actions, so callers disable the button until `capture()` resolves a point, and explain the
 * `status` otherwise. Needs HTTPS (or localhost) — browsers refuse geolocation on plain HTTP.
 */
export function useGeolocation() {
  const [status, setStatus] = useState<GeoStatus>("idle");
  const [pont, setPont] = useState<GeoPont | null>(null);

  const capture = useCallback((): Promise<GeoPont | null> => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setStatus("unavailable");
      return Promise.resolve(null);
    }
    setStatus("loading");
    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const next: GeoPont = {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            pontossag: pos.coords.accuracy,
          };
          if (next.pontossag !== undefined && next.pontossag > GEO_MAX_PONTOSSAG_M) {
            setPont(null);
            setStatus("inaccurate");
            resolve(null);
            return;
          }
          setPont(next);
          setStatus("ok");
          resolve(next);
        },
        (err) => {
          setPont(null);
          setStatus(err.code === err.PERMISSION_DENIED ? "denied" : "unavailable");
          resolve(null);
        },
        { enableHighAccuracy: true, timeout: 15_000, maximumAge: 0 },
      );
    });
  }, []);

  return { status, pont, capture };
}

/** Hungarian user-facing explanation for a non-ok status. */
export const GEO_STATUS_MESSAGES: Record<
  Exclude<GeoStatus, "idle" | "loading" | "ok">,
  string
> = {
  denied:
    "A bejelentkezéshez engedélyezned kell a helymeghatározást a böngészőben (a címsor melletti lakat ikon → Hely).",
  unavailable:
    "A pozíciót nem sikerült meghatározni. Ellenőrizd, hogy be van-e kapcsolva a helymeghatározás, és biztonságos (https) kapcsolaton vagy.",
  inaccurate: "A helymeghatározás túl pontatlan — menj szabad ég alá, és próbáld újra.",
};
