/**
 * Desktop / phone notifications through Web Push. The browser subscribes via the service worker
 * (`public/sw.js`); the server signs messages with a VAPID key pair — from `VAPID_PUBLIC_KEY` /
 * `VAPID_PRIVATE_KEY` if set, otherwise generated once and stored in the database. Sending never
 * throws: a notification is a courtesy, the change itself is already saved. Callers normally go
 * through `ertesit()` (`lib/jelzes.ts`), which also writes an in-app Jelzés.
 */
import webpush from "web-push";
import { Types } from "mongoose";
import { connectDB, PushConfig, PushSubscription } from "@erp/db-core";
import { getAppUrl } from "@erp/mail";
import { pushHibaOka, pushHibaTorlendo, vapidSubject } from "./push-kulcs";

type Kulcsok = { publicKey: string; privateKey: string };
let cache: Kulcsok | null = null;

export async function getVapidKeys(): Promise<Kulcsok> {
  if (cache) return cache;
  const envPub = process.env.VAPID_PUBLIC_KEY?.trim();
  const envPriv = process.env.VAPID_PRIVATE_KEY?.trim();
  if (envPub && envPriv) {
    cache = { publicKey: envPub, privateKey: envPriv };
    return cache;
  }
  await connectDB();
  const meglevo = await PushConfig.findOne({ key: "vapid" }).lean().exec();
  if (meglevo) {
    cache = { publicKey: meglevo.publicKey, privateKey: meglevo.privateKey };
    return cache;
  }
  const uj = webpush.generateVAPIDKeys();
  // Two servers starting at once: the unique key makes one insert lose; read the winner back.
  await PushConfig.updateOne(
    { key: "vapid" },
    { $setOnInsert: { key: "vapid", ...uj } },
    { upsert: true },
  ).exec();
  const doc = await PushConfig.findOne({ key: "vapid" }).lean().exec();
  cache = { publicKey: doc!.publicKey, privateKey: doc!.privateKey };
  return cache;
}

function subject(): string {
  let appUrl: string | undefined;
  try {
    appUrl = getAppUrl();
  } catch {
    appUrl = undefined;
  }
  return vapidSubject({
    VAPID_SUBJECT: process.env.VAPID_SUBJECT,
    SMTP_FROM: process.env.SMTP_FROM,
    APP_URL: appUrl,
  });
}

export type PushUzenet = {
  title: string;
  body?: string;
  /** Opened when the notification is clicked (app-relative). */
  url?: string;
  /** Same tag replaces an earlier notification instead of stacking. */
  tag?: string;
};

/** One device's outcome — shown by the "Tesztértesítés" dialog. */
export type PushEszkozEredmeny = {
  /** The push service's host (fcm.googleapis.com, web.push.apple.com, …). */
  szolgaltatas: string;
  userAgent?: string;
  ok: boolean;
  statusCode?: number;
  /** Why it failed, in plain Hungarian. */
  hiba?: string;
  /** The subscription was dropped because it can never succeed again. */
  torolve?: boolean;
};

export async function saveSubscription(
  userId: string,
  sub: { endpoint: string; keys: { p256dh: string; auth: string } },
  userAgent?: string,
): Promise<void> {
  await connectDB();
  await PushSubscription.updateOne(
    { endpoint: sub.endpoint },
    { $set: { userId: new Types.ObjectId(userId), keys: sub.keys, userAgent } },
    { upsert: true },
  ).exec();
}

export async function removeSubscription(
  userId: string,
  endpoint: string,
): Promise<void> {
  await connectDB();
  await PushSubscription.deleteOne({ endpoint, userId }).exec();
}

const hostOf = (endpoint: string) => {
  try {
    return new URL(endpoint).host;
  } catch {
    return "?";
  }
};

/**
 * Sends to every browser of the given users and reports per device. Subscriptions that can never
 * succeed again (401/403/404/410) are dropped. Never throws.
 */
export async function sendPushReszletes(
  userIds: string[],
  uzenet: PushUzenet,
): Promise<PushEszkozEredmeny[]> {
  try {
    const ids = [...new Set(userIds)].filter((id) => Types.ObjectId.isValid(id));
    if (ids.length === 0) return [];
    await connectDB();
    const subs = await PushSubscription.find({ userId: { $in: ids } })
      .lean()
      .exec();
    if (subs.length === 0) return [];
    const { publicKey, privateKey } = await getVapidKeys();
    const payload = JSON.stringify({ ...uzenet, url: uzenet.url ?? "/jelzesek" });
    const sub = subject();
    return await Promise.all(
      subs.map(async (s): Promise<PushEszkozEredmeny> => {
        const alap = { szolgaltatas: hostOf(s.endpoint), userAgent: s.userAgent };
        try {
          await webpush.sendNotification(
            { endpoint: s.endpoint, keys: s.keys },
            payload,
            {
              vapidDetails: { subject: sub, publicKey, privateKey },
              TTL: 24 * 3600,
            },
          );
          return { ...alap, ok: true };
        } catch (e) {
          const err = e as { statusCode?: number; body?: string; message?: string };
          const code = err.statusCode;
          const torolve = pushHibaTorlendo(code);
          if (torolve) await PushSubscription.deleteOne({ _id: s._id }).exec();
          console.error(
            `Web Push küldés sikertelen (${alap.szolgaltatas}, ${code ?? "nincs státusz"})${
              torolve ? " — feliratkozás törölve" : ""
            }:`,
            (err.body || err.message || String(e)).slice(0, 300),
          );
          return {
            ...alap,
            ok: false,
            statusCode: code,
            hiba: pushHibaOka(code, err.message),
            torolve,
          };
        }
      }),
    );
  } catch (e) {
    console.error("Web Push hiba", e);
    return [];
  }
}

/** Sends to every browser of the given users; returns how many devices accepted it. */
export async function sendPush(userIds: string[], uzenet: PushUzenet): Promise<number> {
  const r = await sendPushReszletes(userIds, uzenet);
  return r.filter((x) => x.ok).length;
}
