"use client";

import { useEffect } from "react";

export function PwaServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") {
      return;
    }

    if (!("serviceWorker" in navigator)) {
      return;
    }

    // `updateViaCache: 'none'` + `update()`: a changed sw.js is picked up on the next load.
    void navigator.serviceWorker
      .register("/sw.js", { scope: "/", updateViaCache: "none" })
      .then((reg) => reg.update())
      .catch(() => {
        // Non-fatal — install prompt still shows manual steps on iOS.
      });
  }, []);

  return null;
}
