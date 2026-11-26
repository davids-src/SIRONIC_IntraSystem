"use client";

import { useEffect } from "react";
import { szinkronizal } from "./push-kliens";

/**
 * Mounted once in the dashboard layout: on every app load, a browser that has a push
 * subscription re-checks its key and re-sends it to the server, so notifications self-heal after
 * a key change or a dropped subscription — not only when someone opens /feladatok.
 */
export function PushSzinkron() {
  useEffect(() => {
    // Not from a hidden frame (a list's full export loads the page in one).
    if (window.self !== window.top) return;
    void szinkronizal();
  }, []);
  return null;
}
