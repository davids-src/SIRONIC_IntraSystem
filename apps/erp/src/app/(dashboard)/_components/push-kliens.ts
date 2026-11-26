"use client";

/**
 * Browser side of Web Push: registering the service worker, subscribing with the server's
 * current VAPID key and keeping the server's copy of the subscription in sync. Used by the
 * on/off switch and by `PushSzinkron` (mounted once in the dashboard layout).
 */
import { base64UrlToUint8, kulcsEgyezik } from "@/lib/push-kulcs";
import { pushFeliratkozasAction, pushKulcsAction } from "./push-actions";

export function pushTamogatott(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

export async function regisztracio(): Promise<ServiceWorkerRegistration> {
  const meglevo = await navigator.serviceWorker.getRegistration("/");
  if (meglevo) return meglevo;
  return navigator.serviceWorker.register("/sw.js", {
    scope: "/",
    updateViaCache: "none",
  });
}

/**
 * A subscription made with the server's current key: an existing one is reused only if its
 * `applicationServerKey` matches — otherwise it is dropped and made again (old key → every push
 * would be rejected with 403 while the switch still showed "on").
 */
export async function aktualisFeliratkozas(
  reg: ServiceWorkerRegistration,
  szerverKulcs: string,
): Promise<PushSubscription> {
  const meglevo = await reg.pushManager.getSubscription();
  if (meglevo && kulcsEgyezik(meglevo.options?.applicationServerKey, szerverKulcs))
    return meglevo;
  if (meglevo) await meglevo.unsubscribe().catch(() => false);
  return reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: base64UrlToUint8(szerverKulcs) as BufferSource,
  });
}

/** Subscribes this browser (permission already granted) and stores it on the server. */
export async function feliratkozik(): Promise<{ success: boolean; message?: string }> {
  const reg = await regisztracio();
  await navigator.serviceWorker.ready;
  const kulcs = await pushKulcsAction();
  const sub = await aktualisFeliratkozas(reg, kulcs);
  return pushFeliratkozasAction(sub.toJSON());
}

/**
 * Self-healing on page load: if this browser has a subscription, make sure it uses the current
 * key and that the server knows it (idempotent upsert — the server may have dropped it after a
 * failed send, or this may be another database). Silent; returns whether push is on here.
 */
export function szinkronizal(): Promise<boolean> {
  // The layout's sync and an on-screen switch mounting together share one round-trip.
  if (utolso && Date.now() - utolso.ido < 30_000) return utolso.p;
  const p = szinkronizalMost().catch(() => false);
  utolso = { ido: Date.now(), p };
  return p;
}

let utolso: { ido: number; p: Promise<boolean> } | null = null;

async function szinkronizalMost(): Promise<boolean> {
  if (!pushTamogatott() || Notification.permission !== "granted") return false;
  const reg = await navigator.serviceWorker.getRegistration("/");
  if (!reg) return false;
  // Pick up a changed sw.js without waiting for the browser's own 24h check.
  void reg.update().catch(() => undefined);
  const sub = await reg.pushManager.getSubscription();
  if (!sub) return false;
  const kulcs = await pushKulcsAction();
  const friss = await aktualisFeliratkozas(reg, kulcs);
  const r = await pushFeliratkozasAction(friss.toJSON());
  return r.success;
}
