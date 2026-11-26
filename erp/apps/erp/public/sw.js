/* eslint-disable */
/*
 * Service worker — PWA install and Web Push notifications. Deliberately minimal: no caching and
 * no `fetch` handler (Chrome no longer requires one for installability, and a pass-through
 * `respondWith(fetch(...))` only added a failure point to every request).
 * Bump SW_VERSION when this file changes so browsers pick up the new worker.
 */
const SW_VERSION = "2026-11-17";

self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

/* A push from the server (e.g. a new task): show it as a system notification. */
self.addEventListener("push", (event) => {
  let data = {};
  if (event.data) {
    try {
      data = event.data.json() || {};
    } catch (e) {
      let text = "";
      try {
        text = event.data.text();
      } catch (e2) {
        text = "";
      }
      data = { body: text };
    }
  }
  const title = data.title || "SIRONIC";
  // A push must always show a notification (userVisibleOnly) — even without a payload.
  event.waitUntil(
    self.registration.showNotification(title, {
      body: data.body || (event.data ? "" : "Új jelzésed érkezett."),
      icon: "/pwa-icon/192",
      badge: "/pwa-icon/192",
      tag: data.tag || undefined,
      renotify: Boolean(data.tag),
      data: { url: data.url || "/jelzesek", v: SW_VERSION },
    }),
  );
});

/* Click: focus an open app window on that page, or open a new one. */
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = new URL(
    (event.notification.data && event.notification.data.url) || "/",
    self.location.origin,
  ).href;
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((wins) => {
      for (const w of wins) {
        if (new URL(w.url).origin === self.location.origin && "focus" in w) {
          return w
            .navigate(url)
            .then((nw) => (nw || w).focus())
            .catch(() => self.clients.openWindow(url));
        }
      }
      return self.clients.openWindow(url);
    }),
  );
});
