/**
 * Pure functions of the bizonylat module: totals, lazy states, dates, HTML. No I/O, safe for the
 * browser.
 */
import {
  JOTALLAS_ALLAPOT_LABELS,
  type JotallasAllapot,
  type JotallasTaroltAllapot,
  type SzamlaAllapot,
  type SzamlaTaroltAllapot,
} from "./constants";
import type {
  CegAdatok,
  IgazolasOsszeg,
  IgazolasSor,
  ImportAdat,
  JotallasSor,
  PdfRenderer,
  SzamlaSor,
} from "./types";

const kerek = (n: number) => Math.round(n * 100) / 100;

export function sorokOsszesites(
  sorok: ReadonlyArray<{ mennyiseg: number; nettoEgysegar: number; afaKulcs: number }>,
): IgazolasOsszeg {
  let netto = 0;
  let afa = 0;
  for (const s of sorok) {
    const n = kerek(s.mennyiseg * s.nettoEgysegar);
    netto += n;
    afa += kerek((n * s.afaKulcs) / 100);
  }
  netto = kerek(netto);
  afa = kerek(afa);
  return { nettoOsszeg: netto, afaOsszeg: afa, bruttoOsszeg: kerek(netto + afa) };
}

export const szamlaOsszeg = (sorok: ReadonlyArray<SzamlaSor>): number =>
  sorokOsszesites(sorok).bruttoOsszeg;

/**
 * Normalizes imported lines: drops empty lines, non-positive quantities and negative prices.
 * The import is plain data supplied by the app — never trusted for totals.
 */
export function importSorokNormalizalasa(adat: ImportAdat): {
  sorok: IgazolasSor[];
  osszOra?: number;
} {
  const sorok = adat.sorok
    .filter((s) => s.leiras.trim() && s.mennyiseg > 0 && s.nettoEgysegar >= 0)
    .map((s) => ({ ...s, leiras: s.leiras.trim() }));
  return { sorok, osszOra: adat.osszOra };
}

// ── Lazily computed states ─────────────────────────────────────────────────────

/** `elkuldve` past its due date reads as `lejart`; nothing is persisted. */
export function szamlaAllapot(
  tarolt: SzamlaTaroltAllapot,
  esedekes: Date | string | undefined | null,
  now: Date = new Date(),
): SzamlaAllapot {
  if (tarolt !== "elkuldve" || !esedekes) return tarolt;
  return new Date(esedekes).getTime() < now.getTime() ? "lejart" : "elkuldve";
}

/** `aktiv` with every line expired reads as `lejart`. */
export function jotallasAllapot(
  tarolt: JotallasTaroltAllapot,
  lejarat: Date | string | undefined | null,
  now: Date = new Date(),
): JotallasAllapot {
  if (tarolt !== "aktiv" || !lejarat) return tarolt;
  return new Date(lejarat).getTime() < now.getTime() ? "lejart" : "aktiv";
}

/** Same calendar day `evek` years later (Feb 29 clamps to Feb 28), minus one day = last valid day. */
export function evekHozzaad(kezdet: Date, evek: number): Date {
  const d = new Date(
    Date.UTC(kezdet.getUTCFullYear() + evek, kezdet.getUTCMonth(), kezdet.getUTCDate()),
  );
  if (d.getUTCMonth() !== kezdet.getUTCMonth()) d.setUTCDate(0);
  return d;
}

export function jotallasLejarat(
  sorok: ReadonlyArray<{ vege: Date | string }>,
): Date | undefined {
  if (sorok.length === 0) return undefined;
  return new Date(Math.max(...sorok.map((s) => new Date(s.vege).getTime())));
}

// ── HTML ───────────────────────────────────────────────────────────────────────

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const datum = (iso?: string) =>
  iso ? new Date(iso).toLocaleDateString("hu-HU", { timeZone: "Europe/Budapest" }) : "";

export type JotallasHtmlAdat = {
  azonosito: string;
  partnerNev: string;
  szamlaszam?: string;
  kiallitasNap: string;
  sorok: JotallasSor[];
  megjegyzes?: string;
  jogiSzoveg: string;
  allapot: JotallasAllapot;
};

/** The printable warranty card — reads only values embedded in the card (incl. the frozen legal text). */
export function jotallasiJegyHtml(jegy: JotallasHtmlAdat, ceg: CegAdatok): string {
  const sorok = jegy.sorok
    .map(
      (s) =>
        `<tr><td>${escapeHtml(s.termekNev)}</td><td>${escapeHtml(s.gyariSzam ?? "")}</td><td class="r">${s.evek} év</td><td>${datum(s.kezdet)}</td><td>${datum(s.vege)}</td></tr>`,
    )
    .join("");
  return `<!doctype html><html lang="hu"><head><meta charset="utf-8"><title>${escapeHtml(jegy.azonosito)}</title><style>body{font-family:Arial,sans-serif;font-size:12px;color:#111}table{width:100%;border-collapse:collapse}th,td{border-bottom:1px solid #ddd;padding:6px;text-align:left}.r{text-align:right}h1{font-size:20px}.fej{display:flex;justify-content:space-between;margin-bottom:16px}.jogi{margin-top:16px;white-space:pre-line;font-size:11px;color:#333}</style></head><body>
<div class="fej"><div>${ceg.logoUrl ? `<img src="${escapeHtml(ceg.logoUrl)}" alt="" height="40">` : ""}<strong>${escapeHtml(ceg.nev)}</strong><br>${escapeHtml(ceg.cim ?? "")}<br>${escapeHtml(ceg.adoszam ? `Adószám: ${ceg.adoszam}` : "")}<br>${escapeHtml([ceg.telefon, ceg.email].filter(Boolean).join(" · "))}</div><div class="r"><h1>Jótállási jegy ${escapeHtml(jegy.azonosito)}</h1>Kiállítva: ${datum(jegy.kiallitasNap)}<br>Állapot: ${escapeHtml(JOTALLAS_ALLAPOT_LABELS[jegy.allapot])}</div></div>
<p><strong>Jogosult:</strong> ${escapeHtml(jegy.partnerNev)}${jegy.szamlaszam ? `<br>Számlaszám: ${escapeHtml(jegy.szamlaszam)}` : ""}</p>
<table><thead><tr><th>Termék</th><th>Gyári szám</th><th class="r">Jótállás</th><th>Kezdete</th><th>Vége</th></tr></thead><tbody>${sorok}</tbody></table>
${jegy.megjegyzes ? `<p>${escapeHtml(jegy.megjegyzes).replace(/\n/g, "<br>")}</p>` : ""}
<div class="jogi">${escapeHtml(jegy.jogiSzoveg)}</div></body></html>`;
}

export async function jotallasPdfKeszit(
  renderer: PdfRenderer,
  jegy: JotallasHtmlAdat,
  ceg: CegAdatok,
): Promise<void> {
  await renderer.render(jotallasiJegyHtml(jegy, ceg), `${jegy.azonosito}.pdf`);
}

/** Magic-link mail of a certificate (HTML + text). All user text is escaped. */
export function igazolasLevel(adat: {
  azonosito: string;
  cim: string;
  partnerNev: string;
  idoszak?: string;
  link: string;
}): { subject: string; text: string; html: string } {
  const subject = `Teljesítésigazolás – ${adat.azonosito}`;
  const text = `Tisztelt ${adat.partnerNev}!\n\nElkészült a(z) ${adat.azonosito} teljesítésigazolás („${adat.cim}”)${adat.idoszak ? `, időszak: ${adat.idoszak}` : ""}. Kérjük, tekintse át és igazolja vissza az alábbi hivatkozáson:\n${adat.link}\n\nA hivatkozás egyszer használható és korlátozott ideig érvényes.`;
  const html = `<p>Tisztelt ${escapeHtml(adat.partnerNev)}!</p><p>Elkészült a(z) <strong>${escapeHtml(adat.azonosito)}</strong> teljesítésigazolás (${escapeHtml(adat.cim)})${adat.idoszak ? `, időszak: ${escapeHtml(adat.idoszak)}` : ""}.</p><p><a href="${escapeHtml(adat.link)}">Igazolás áttekintése és aláírása</a></p><p>A hivatkozás egyszer használható és korlátozott ideig érvényes.</p>`;
  return { subject, text, html };
}
