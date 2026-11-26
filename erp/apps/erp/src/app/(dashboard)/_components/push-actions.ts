"use server";

import { headers } from "next/headers";
import { requireAuth } from "@erp/auth";
import {
  getVapidKeys,
  removeSubscription,
  saveSubscription,
  sendPushReszletes,
  type PushEszkozEredmeny,
} from "@/lib/push";

type Eredmeny = { success: boolean; message?: string };

/** The public half of the VAPID key pair, which the browser needs to subscribe. */
export async function pushKulcsAction(): Promise<string> {
  await requireAuth();
  return (await getVapidKeys()).publicKey;
}

export async function pushFeliratkozasAction(sub: {
  endpoint?: unknown;
  keys?: { p256dh?: unknown; auth?: unknown };
}): Promise<Eredmeny> {
  const user = await requireAuth();
  const endpoint = typeof sub?.endpoint === "string" ? sub.endpoint : "";
  const p256dh = typeof sub?.keys?.p256dh === "string" ? sub.keys.p256dh : "";
  const auth = typeof sub?.keys?.auth === "string" ? sub.keys.auth : "";
  if (!/^https:\/\//.test(endpoint) || endpoint.length > 2000 || !p256dh || !auth)
    return { success: false, message: "Érvénytelen feliratkozás" };
  const ua = (await headers()).get("user-agent")?.slice(0, 300) ?? undefined;
  await saveSubscription(user.id, { endpoint, keys: { p256dh, auth } }, ua);
  return { success: true, message: "Asztali értesítések bekapcsolva ezen az eszközön." };
}

export async function pushLeiratkozasAction(endpoint: string): Promise<Eredmeny> {
  const user = await requireAuth();
  if (typeof endpoint === "string" && endpoint)
    await removeSubscription(user.id, endpoint);
  return { success: true, message: "Asztali értesítések kikapcsolva ezen az eszközön." };
}

/**
 * A test notification to the user's own devices, with each device's outcome — "elküldve" means
 * the browser's push service accepted it; if nothing pops up after that, the operating system
 * (Focus / Do Not Disturb, notification settings) is blocking it.
 */
export async function pushTesztAction(): Promise<{
  success: boolean;
  message?: string;
  eszkozok: PushEszkozEredmeny[];
}> {
  const user = await requireAuth();
  const eszkozok = await sendPushReszletes([user.id], {
    title: "SIRONIC tesztértesítés",
    body: "Ha ezt látod, az asztali értesítések működnek ezen az eszközön.",
    url: "/jelzesek",
    tag: "teszt",
  });
  if (eszkozok.length === 0)
    return {
      success: false,
      message: "Nincs aktív feliratkozás ezen a fiókon.",
      eszkozok,
    };
  const ok = eszkozok.filter((e) => e.ok).length;
  return {
    success: ok > 0,
    message: `Elküldve ${ok} / ${eszkozok.length} eszközre.`,
    eszkozok,
  };
}
