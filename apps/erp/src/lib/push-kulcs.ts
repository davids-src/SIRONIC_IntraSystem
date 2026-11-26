/**
 * Pure Web Push helpers shared by the browser side (subscription self-healing) and the server
 * side (error handling) — no DOM, no database, so they are unit-testable.
 */

/** base64url (as VAPID public keys are written) → bytes. */
export function base64UrlToUint8(b64: string): Uint8Array {
  const pad = "=".repeat((4 - (b64.length % 4)) % 4);
  const raw = atob((b64 + pad).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

/**
 * Whether a browser subscription was made with the server's current VAPID public key. A
 * subscription made with an older key (database reset, `VAPID_*` env added later, another
 * instance) is rejected by the push service with 401/403 — every message would be lost while
 * the switch still shows "on". `null` (unknown key — very old browsers) counts as a match, so
 * we never churn a subscription we cannot check.
 */
export function kulcsEgyezik(
  subscriptionKey: ArrayBuffer | ArrayBufferView | null | undefined,
  szerverKulcs: string,
): boolean {
  if (!subscriptionKey) return true;
  const a =
    subscriptionKey instanceof ArrayBuffer
      ? new Uint8Array(subscriptionKey)
      : new Uint8Array(
          subscriptionKey.buffer,
          subscriptionKey.byteOffset,
          subscriptionKey.byteLength,
        );
  let b: Uint8Array;
  try {
    b = base64UrlToUint8(szerverKulcs);
  } catch {
    return false;
  }
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}

/**
 * What a push service's HTTP status means for the stored subscription:
 * - 404 / 410 — the subscription is gone (unsubscribed, expired);
 * - 401 / 403 — the subscription belongs to another VAPID key (or the JWT is rejected): it can
 *   never succeed again with this server, so it is dropped too; the browser re-subscribes with
 *   the current key on its next page load (`PushSzinkron`).
 * Anything else (429, 5xx, network) is transient — the subscription is kept.
 */
export function pushHibaTorlendo(statusCode: number | undefined): boolean {
  return (
    statusCode === 401 || statusCode === 403 || statusCode === 404 || statusCode === 410
  );
}

/** A short Hungarian reason for the test dialog. */
export function pushHibaOka(statusCode: number | undefined, uzenet?: string): string {
  switch (statusCode) {
    case 401:
    case 403:
      return "A feliratkozás egy korábbi szerverkulccsal készült — töröltük, a böngésző a következő oldalbetöltéskor újra feliratkozik.";
    case 404:
    case 410:
      return "A feliratkozás lejárt vagy visszavonták — töröltük. Kapcsold be újra ezen az eszközön.";
    case 413:
      return "Túl hosszú üzenet.";
    case 429:
      return "Túl sok üzenet rövid idő alatt — később újra próbálkozik.";
    case undefined:
      return uzenet ? `Szerverhiba: ${uzenet}` : "Ismeretlen hiba.";
    default:
      return statusCode >= 500
        ? "A böngésző értesítési szolgáltatása átmenetileg nem elérhető."
        : `A böngésző értesítési szolgáltatása elutasította (${statusCode}).`;
  }
}

/**
 * The VAPID "subject" — web-push only accepts a `mailto:` or `https:` URL (and Apple rejects a
 * localhost one), so an `http://` LAN address must never end up here: that made every send
 * throw before reaching the push service.
 */
export function vapidSubject(env: {
  VAPID_SUBJECT?: string;
  SMTP_FROM?: string;
  APP_URL?: string;
}): string {
  const ervenyes = (s: string | undefined): boolean => {
    if (!s) return false;
    try {
      const u = new URL(s);
      if (u.protocol === "mailto:") return /^[^@\s]+@[^@\s]+$/.test(u.pathname);
      return u.protocol === "https:" && u.hostname !== "localhost";
    } catch {
      return false;
    }
  };
  const sajat = env.VAPID_SUBJECT?.trim();
  if (sajat) {
    if (ervenyes(sajat)) return sajat;
    const mail = `mailto:${sajat.replace(/^mailto:/, "")}`;
    if (ervenyes(mail)) return mail;
  }
  const from = env.SMTP_FROM?.match(/[^<\s]+@[^>\s]+/)?.[0];
  if (from && ervenyes(`mailto:${from}`)) return `mailto:${from}`;
  const app = env.APP_URL?.trim();
  if (app && ervenyes(app)) return app;
  return "mailto:noreply@erp.hu";
}
