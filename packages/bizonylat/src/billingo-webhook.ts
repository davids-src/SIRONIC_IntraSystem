/**
 * Billingo webhook handling as a pure function (server only: uses node:crypto).
 *
 * The body is verified with HMAC-SHA256 over the RAW request body (hex digest, optional
 * `sha256=` prefix) compared in constant time. The secret comes from the app
 * (`BILLINGO_WEBHOOK_SECRET`); an empty secret rejects everything (fail closed).
 *
 * ASSUMPTION (verify against the Billingo docs before go-live — no live API was called while
 * building this): the payload carries an event name in `event` / `type` / `esemeny` and the
 * document id in `data.id` / `document.id` / `id`; paid events are listed in `FIZETETT_ESEMENYEK`.
 */
import { createHmac, timingSafeEqual } from "node:crypto";
import type { BillingoEsemeny } from "./types";

export const BILLINGO_ALAIRAS_FEJLEC = "x-billingo-signature";
export const FIZETETT_ESEMENYEK = [
  "invoice_paid",
  "invoice.paid",
  "document_paid",
  "document.paid",
  "payment_received",
  "paid",
] as const;

export type WebhookValasz = { status: number; body: { ok: boolean; message: string } };

/** Constant-time check of the signature header against the raw body. */
export function alairasEllenorzes(
  rawBody: string,
  signatureHeader: string | null | undefined,
  secret: string,
): boolean {
  if (!secret || !signatureHeader) return false;
  const kapott = signatureHeader
    .trim()
    .replace(/^sha256=/i, "")
    .toLowerCase();
  if (!/^[0-9a-f]{64}$/.test(kapott)) return false;
  const vart = createHmac("sha256", secret).update(rawBody, "utf8").digest();
  const kapottBuf = Buffer.from(kapott, "hex");
  return kapottBuf.length === vart.length && timingSafeEqual(kapottBuf, vart);
}

export function alairasKeszit(rawBody: string, secret: string): string {
  return createHmac("sha256", secret).update(rawBody, "utf8").digest("hex");
}

/** Extracts the event of an already verified body; `null` for events we do not act on. */
export function esemenyKinyeres(rawBody: string): BillingoEsemeny | null | "hibas" {
  let json: unknown;
  try {
    json = JSON.parse(rawBody);
  } catch {
    return "hibas";
  }
  if (typeof json !== "object" || json === null) return "hibas";
  const o = json as Record<string, unknown>;
  const nev = String(o.event ?? o.type ?? o.esemeny ?? "").toLowerCase();
  const adat = (o.data ?? o.document ?? {}) as Record<string, unknown>;
  const id = adat.id ?? o.id;
  if (!(FIZETETT_ESEMENYEK as readonly string[]).includes(nev)) return null;
  if (id === undefined || id === null || String(id).trim() === "") return "hibas";
  return { tipus: "kifizetve", billingoRef: String(id) };
}

/**
 * Verifies and handles a Billingo webhook. `alkalmaz` is the (idempotent) state transition the
 * app injects (`bizonylatApi.billingoKifizetve`), so this function stays pure and testable.
 * Status codes: 401 bad/missing signature, 400 malformed body, 200 handled or ignored.
 */
export async function feldolgozBillingoWebhook(
  rawBody: string,
  signatureHeader: string | null | undefined,
  secret: string | undefined,
  alkalmaz?: (e: BillingoEsemeny) => Promise<{ ok: boolean; message?: string }>,
): Promise<WebhookValasz> {
  if (!secret) {
    return { status: 503, body: { ok: false, message: "A webhook nincs beállítva" } };
  }
  if (!alairasEllenorzes(rawBody, signatureHeader, secret)) {
    return { status: 401, body: { ok: false, message: "Érvénytelen aláírás" } };
  }
  const esemeny = esemenyKinyeres(rawBody);
  if (esemeny === "hibas") {
    return { status: 400, body: { ok: false, message: "Hibás kérés" } };
  }
  if (esemeny === null) {
    return { status: 200, body: { ok: true, message: "Esemény figyelmen kívül hagyva" } };
  }
  if (!alkalmaz) return { status: 200, body: { ok: true, message: "Esemény fogadva" } };
  const r = await alkalmaz(esemeny);
  // 5xx lets Billingo retry; the transition itself is idempotent.
  return r.ok
    ? { status: 200, body: { ok: true, message: r.message ?? "Feldolgozva" } }
    : { status: 500, body: { ok: false, message: r.message ?? "Feldolgozási hiba" } };
}
