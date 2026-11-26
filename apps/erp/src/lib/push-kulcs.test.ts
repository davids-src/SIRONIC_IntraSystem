import { describe, expect, it } from "vitest";
import {
  base64UrlToUint8,
  kulcsEgyezik,
  pushHibaOka,
  pushHibaTorlendo,
  vapidSubject,
} from "./push-kulcs";

// A real-shaped VAPID public key (65 bytes, uncompressed P-256 point), base64url.
const KULCS =
  "BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U";
const MASIK =
  "BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QTpQtUbVlUls0VJXg7A8u-Ts1XbjhazAkj7I99e8QcYP7DkM";

describe("push-kulcs", () => {
  it("decodes base64url VAPID keys", () => {
    const b = base64UrlToUint8(KULCS);
    expect(b.length).toBe(65);
    expect(b[0]).toBe(4);
  });

  it("matches a subscription made with the same key, in ArrayBuffer or view form", () => {
    const bytes = base64UrlToUint8(KULCS);
    expect(kulcsEgyezik(bytes.buffer.slice(0) as ArrayBuffer, KULCS)).toBe(true);
    expect(kulcsEgyezik(bytes, KULCS)).toBe(true);
  });

  it("detects a subscription made with an older key", () => {
    expect(kulcsEgyezik(base64UrlToUint8(MASIK), KULCS)).toBe(false);
    expect(kulcsEgyezik(new Uint8Array(10), KULCS)).toBe(false);
    expect(kulcsEgyezik(base64UrlToUint8(KULCS), "!!!nem-base64")).toBe(false);
  });

  it("treats an unknown subscription key as a match (nothing to compare)", () => {
    expect(kulcsEgyezik(null, KULCS)).toBe(true);
    expect(kulcsEgyezik(undefined, KULCS)).toBe(true);
  });

  it("drops subscriptions on 401/403/404/410, keeps them on transient errors", () => {
    for (const c of [401, 403, 404, 410]) expect(pushHibaTorlendo(c)).toBe(true);
    for (const c of [undefined, 400, 413, 429, 500, 503])
      expect(pushHibaTorlendo(c)).toBe(false);
    expect(pushHibaOka(403)).toMatch(/korábbi szerverkulccsal/);
    expect(pushHibaOka(410)).toMatch(/lejárt/);
    expect(
      pushHibaOka(undefined, "Vapid subject is not an https: or mailto: URL"),
    ).toMatch(/Szerverhiba/);
  });

  it("builds a VAPID subject web-push accepts — never an http:// or localhost URL", () => {
    expect(vapidSubject({ VAPID_SUBJECT: "mailto:it@ceg.hu" })).toBe("mailto:it@ceg.hu");
    expect(vapidSubject({ VAPID_SUBJECT: "it@ceg.hu" })).toBe("mailto:it@ceg.hu");
    expect(vapidSubject({ VAPID_SUBJECT: "https://erp.ceg.hu" })).toBe(
      "https://erp.ceg.hu",
    );
    expect(vapidSubject({ SMTP_FROM: "SIRONIC <noreply@ceg.hu>" })).toBe(
      "mailto:noreply@ceg.hu",
    );
    expect(vapidSubject({ APP_URL: "https://erp.ceg.hu" })).toBe("https://erp.ceg.hu");
    // The LAN install: http app URL, no SMTP — used to throw on every send.
    expect(vapidSubject({ APP_URL: "http://192.168.1.10:3000" })).toBe(
      "mailto:noreply@erp.hu",
    );
    expect(vapidSubject({ APP_URL: "https://localhost:3000" })).toBe(
      "mailto:noreply@erp.hu",
    );
    expect(vapidSubject({ VAPID_SUBJECT: "http://x", SMTP_FROM: "a@b.hu" })).toBe(
      "mailto:a@b.hu",
    );
  });
});
