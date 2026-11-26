/**
 * Pure rules of the szerviz module — viewer scoping, signature check, totals, the stock plan of
 * a worklog, lazily computed maintenance due dates and the printable worklog HTML. Nothing here
 * touches the database, so every rule is unit-testable.
 */
import {
  ALAIRAS_MAX_KARAKTER,
  ALAIRAS_MIME_TIPUSOK,
  MUNKALAP_SOR_TIPUS_LABELS,
  type KarbantartasAllapot,
  type Nezo,
  type NezoPortal,
} from "./constants";
import type {
  CegAdatok,
  KeszletKiadasTerv,
  MunkalapDetail,
  MunkalapOsszegzes,
  MunkalapSor,
} from "./types";

// ── Viewer scoping ─────────────────────────────────────────────────────────────

export const isPortal = (n: Nezo): n is NezoPortal => n.kind === "portal";

/** Mongo filter every Hibajegy read is ANDed with. Staff: archived rows hidden by the caller. */
export function hibajegyNezoSzuro(nezo: Nezo): Record<string, unknown> {
  if (!isPortal(nezo)) return {};
  // An empty partner id must match nothing (never "all tickets without a partner").
  if (!nezo.partnerId) return { _id: { $in: [] } };
  return { partnerId: nezo.partnerId, archivalt: { $ne: true } };
}

/** A portal viewer only ever sees the FINALIZED, non-archived worklogs of its own partner. */
export function munkalapNezoSzuro(nezo: Nezo): Record<string, unknown> {
  if (!isPortal(nezo)) return {};
  if (!nezo.partnerId) return { _id: { $in: [] } };
  return { partnerId: nezo.partnerId, "status.key": "lezart", archivalt: { $ne: true } };
}

/** Fields a portal viewer may be given for a ticket (allow-list, not a deny-list). */
export const PORTAL_HIBAJEGY_MEZOK = [
  "id",
  "azonosito",
  "targy",
  "leiras",
  "allapot",
  "prioritas",
  "kategoria",
  "helyszin",
  "erintettTetelek",
  "megoldasJegyzet",
  "megjegyzesek",
  "createdAt",
  "updatedAt",
] as const;

// ── Signature ──────────────────────────────────────────────────────────────────

const MEDIA_ID = /^[a-f0-9]{24}$/i;
const DATA_URI = /^data:([a-z]+\/[a-z0-9.+-]+);base64,([A-Za-z0-9+/]+={0,2})$/;

/**
 * A signature is either a media id (24 hex chars) or a data-URI image (PNG/JPEG/WebP, base64,
 * bounded in size). Returns a Hungarian error, or `null` when valid.
 */
export function alairasHiba(ertek: string): string | null {
  if (MEDIA_ID.test(ertek)) return null;
  if (ertek.length > ALAIRAS_MAX_KARAKTER) {
    return `Az aláírás túl nagy (legfeljebb ${Math.round(ALAIRAS_MAX_KARAKTER / 1000)} ezer karakter).`;
  }
  const m = DATA_URI.exec(ertek);
  if (!m)
    return "Az aláírás formátuma érvénytelen (kép data-URI vagy média azonosító kell).";
  if (!(ALAIRAS_MIME_TIPUSOK as readonly string[]).includes(m[1]!)) {
    return "Az aláírás csak PNG, JPEG vagy WebP kép lehet.";
  }
  return null;
}

// ── Worklog totals & stock plan ────────────────────────────────────────────────

const kerekit = (n: number) => Math.round(n * 100) / 100;

export function munkalapOsszesites(sorok: readonly MunkalapSor[]): MunkalapOsszegzes {
  let munkaOra = 0;
  let anyagNetto = 0;
  let munkaNetto = 0;
  for (const s of sorok) {
    const ertek = s.mennyiseg * (s.nettoEgysegar ?? 0);
    if (s.tipus === "munka") {
      munkaOra += s.mennyiseg;
      munkaNetto += ertek;
    } else anyagNetto += ertek;
  }
  return {
    munkaOra: kerekit(munkaOra),
    anyagNetto: kerekit(anyagNetto),
    munkaNetto: kerekit(munkaNetto),
    osszesNetto: kerekit(anyagNetto + munkaNetto),
  };
}

/**
 * Material lines that leave the stock on finalize: `anyag` lines flagged `keszletbolKiad`
 * that reference an árlista product. Lines of the same product are merged per call site by the
 * stock engine (keyed by line index), so the plan keeps one entry per worklog line.
 */
export function keszletKiadasTerv(sorok: readonly MunkalapSor[]): KeszletKiadasTerv {
  const terv: KeszletKiadasTerv = [];
  sorok.forEach((s, sorIndex) => {
    if (s.tipus !== "anyag" || !s.keszletbolKiad || s.mennyiseg <= 0) return;
    const termekId =
      s.arSnapshot?.forras === "termek" ? s.arSnapshot.tetelId : s.arlistaTetelId;
    if (!termekId || s.forras !== "termek") return;
    terv.push({
      sorIndex,
      arlistaTermekId: termekId,
      mennyiseg: s.mennyiseg,
      nev: s.leiras,
      egyseg: s.egyseg,
    });
  });
  return terv;
}

// ── Maintenance due dates (lazy, no cron) ──────────────────────────────────────

const DAY_MS = 86_400_000;

/** `YYYY-MM-DD` of a UTC date. */
export const napStr = (d: Date) => d.toISOString().slice(0, 10);

/** UTC midnight of `d`'s calendar day. */
export const napKezdet = (d: Date) =>
  new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));

/** `d` + `honap` months, clamped to the end of a shorter month (31 Jan + 1 → 28/29 Feb). */
export function honapHozzaad(d: Date, honap: number): Date {
  const ev = d.getUTCFullYear();
  const ho = d.getUTCMonth() + honap;
  const celEv = ev + Math.floor(ho / 12);
  const celHo = ((ho % 12) + 12) % 12;
  const utolso = new Date(Date.UTC(celEv, celHo + 1, 0)).getUTCDate();
  return new Date(Date.UTC(celEv, celHo, Math.min(d.getUTCDate(), utolso)));
}

export type TervIdoadat = {
  elsoEsedekes: Date;
  intervallumHonap: number;
  /** Index of the last cycle a ticket was generated for (-1 = none yet). */
  utolsoCiklus: number;
  elorejelzesNap: number;
  aktiv: boolean;
};

/** Due date of cycle `index` (cycle 0 is `elsoEsedekes`). Anchored, so no drift accumulates. */
export const ciklusEsedekes = (
  t: Pick<TervIdoadat, "elsoEsedekes" | "intervallumHonap">,
  index: number,
) => honapHozzaad(t.elsoEsedekes, index * t.intervallumHonap);

/** The next cycle that has no ticket yet — computed at read time, never stored. */
export const kovetkezoEsedekes = (t: TervIdoadat): Date =>
  ciklusEsedekes(t, t.utolsoCiklus + 1);

export function karbantartasAllapot(t: TervIdoadat, ma: Date): KarbantartasAllapot {
  if (!t.aktiv) return "inaktiv";
  const hatra = Math.round(
    (napKezdet(kovetkezoEsedekes(t)).getTime() - napKezdet(ma).getTime()) / DAY_MS,
  );
  if (hatra < 0) return "lejart";
  return hatra <= t.elorejelzesNap ? "hamarosan" : "rendben";
}

/** Days until the next due date (negative = overdue). */
export const napokHatra = (t: TervIdoadat, ma: Date): number =>
  Math.round(
    (napKezdet(kovetkezoEsedekes(t)).getTime() - napKezdet(ma).getTime()) / DAY_MS,
  );

// ── Printable worklog ──────────────────────────────────────────────────────────

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const FT = new Intl.NumberFormat("hu-HU", { maximumFractionDigits: 2 });
const datum = (iso?: string) =>
  iso ? new Date(iso).toLocaleDateString("hu-HU", { timeZone: "Europe/Budapest" }) : "";

export type MunkalapHtmlAdat = Pick<
  MunkalapDetail,
  | "azonosito"
  | "partnerNev"
  | "egyszeriNev"
  | "munkaDatum"
  | "munkaKezdet"
  | "munkaVege"
  | "szerelo"
  | "szereloAlairas"
  | "ugyfelNev"
  | "ugyfelAlairas"
  | "helyszin"
  | "kategoria"
  | "leiras"
  | "sorok"
  | "utazasKm"
  | "megjegyzes"
  | "osszegzes"
>;

/** Signature image tag — only an inline data-URI image is embedded (a media id has no public URL). */
function alairasKep(ertek?: string): string {
  if (!ertek || alairasHiba(ertek) !== null || !ertek.startsWith("data:")) return "";
  return `<img src="${escapeHtml(ertek)}" alt="Aláírás" height="60">`;
}

/**
 * The printable worklog. Reads ONLY values embedded in the document (lines, snapshot prices,
 * stored totals, signatures) — it never looks anything up, so later price-list changes cannot
 * alter it. Rendering goes through the app's `PdfRenderer`.
 */
export function munkalapHtml(m: MunkalapHtmlAdat, ceg: CegAdatok): string {
  const sorok = m.sorok
    .map(
      (s, i) =>
        `<tr><td>${i + 1}</td><td>${escapeHtml(s.leiras)}<div class="kicsi">${escapeHtml(
          MUNKALAP_SOR_TIPUS_LABELS[s.tipus],
        )}</div></td><td class="r">${FT.format(s.mennyiseg)} ${escapeHtml(s.egyseg)}</td></tr>`,
    )
    .join("");
  const ugyfel = m.partnerNev ?? m.egyszeriNev ?? "";
  return `<!doctype html><html lang="hu"><head><meta charset="utf-8"><title>${escapeHtml(
    m.azonosito,
  )}</title><style>body{font-family:Arial,sans-serif;font-size:12px;color:#111}table{width:100%;border-collapse:collapse}th,td{border-bottom:1px solid #ddd;padding:6px;text-align:left}.r{text-align:right}.kicsi{color:#666;font-size:10px}h1{font-size:20px}.fej{display:flex;justify-content:space-between;margin-bottom:16px}.alairasok{display:flex;gap:48px;margin-top:32px}.alairasok div{flex:1;border-top:1px solid #999;padding-top:4px}</style></head><body>
<div class="fej"><div><strong>${escapeHtml(ceg.nev)}</strong><br>${escapeHtml(ceg.cim ?? "")}<br>${escapeHtml(
    ceg.adoszam ? `Adószám: ${ceg.adoszam}` : "",
  )}</div><div class="r"><h1>Munkalap ${escapeHtml(m.azonosito)}</h1>${escapeHtml(datum(m.munkaDatum))}${
    m.munkaKezdet ? ` ${escapeHtml(m.munkaKezdet)}–${escapeHtml(m.munkaVege ?? "")}` : ""
  }</div></div>
<p><strong>Megrendelő:</strong> ${escapeHtml(ugyfel)}<br><strong>Helyszín:</strong> ${escapeHtml(
    m.helyszin ?? "",
  )}<br><strong>Szerelő:</strong> ${escapeHtml(m.szerelo)}<br><strong>Kategória:</strong> ${escapeHtml(m.kategoria)}</p>
<h2>Elvégzett munka</h2><p>${escapeHtml(m.leiras).replace(/\n/g, "<br>")}</p>
<table><thead><tr><th>#</th><th>Tétel</th><th class="r">Mennyiség</th></tr></thead><tbody>${sorok}</tbody></table>
<p>Munkaóra összesen: <strong>${FT.format(m.osszegzes.munkaOra)} óra</strong>${
    m.utazasKm ? ` · Utazás: ${FT.format(m.utazasKm)} km` : ""
  }</p>${m.megjegyzes ? `<p>${escapeHtml(m.megjegyzes).replace(/\n/g, "<br>")}</p>` : ""}
<div class="alairasok"><div>${alairasKep(m.szereloAlairas)}<br>Szerelő: ${escapeHtml(m.szerelo)}</div><div>${alairasKep(
    m.ugyfelAlairas,
  )}<br>Megrendelő: ${escapeHtml(m.ugyfelNev ?? "")}</div></div></body></html>`;
}

/** Renders the worklog through whichever renderer the app provides (the PdfRenderer seam, #11). */
export async function munkalapPdfKeszit(
  renderer: { render(html: string, fajlNev: string): Promise<void> | void },
  m: MunkalapHtmlAdat,
  ceg: CegAdatok,
): Promise<void> {
  await renderer.render(munkalapHtml(m, ceg), `${m.azonosito}.pdf`);
}
