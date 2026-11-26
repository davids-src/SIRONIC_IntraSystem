import { RENDSZER_VALTOZOK, SOR_TIPUS_LABELS } from "./constants";
import type {
  AfaBontasSor,
  AjanlatDetail,
  AjanlatOsszesites,
  AjanlatSor,
  MegrendeloSor,
  OsszegAdat,
  SorPenzugy,
} from "./types";

/**
 * Pure, client-safe functions of the értékesítés module: totals, bundle handling, contract
 * variable rendering, offer HTML. No I/O — the facade recalculates with these on every write
 * (the client's totals are never trusted) and the UI previews with the very same code.
 */

const clamp01_100 = (n: unknown) => Math.max(0, Math.min(100, Number(n) || 0));
const num = (n: unknown) => Number(n) || 0;
const kerek = Math.round;

export function ajanlatOsszesites(
  sorok: AjanlatSor[] = [],
  globalisKedvezmenySzazalek = 0,
): AjanlatOsszesites {
  const lista = Array.isArray(sorok) ? sorok : [];
  const afaTerkep = new Map<number, { netto: number; afa: number; brutto: number }>();
  let netto = 0;
  let termek = 0;
  let szolg = 0;
  let munka = 0;
  let egyeb = 0;
  let kozvetlen = 0;
  let belsoMunka = 0;
  let egyebKoltseg = 0;
  let vanKoltseg = false;

  const sorPenzugy: SorPenzugy[] = lista.map((sor) => {
    const mennyiseg = num(sor.mennyiseg);
    const afaKulcs = num(sor.afaKulcs);
    const kedv = clamp01_100(sor.kedvezmenySzazalek);
    // A child row of a bundle is already billed through the bundle parent.
    const szamlazando = !(sor.csomagId && !sor.csomagSzulo);

    const nettoAlap = mennyiseg * num(sor.nettoEgysegar);
    const kedvOsszeg = nettoAlap * (kedv / 100);
    const nettoKedv = nettoAlap - kedvOsszeg;
    const afaOsszeg = nettoKedv * (afaKulcs / 100);
    const brutto = nettoKedv + afaOsszeg;

    if (szamlazando) {
      netto += nettoKedv;
      if (sor.sorTipus === "termek") termek += nettoKedv;
      else if (sor.sorTipus === "szolgaltatas") szolg += nettoKedv;
      else if (sor.sorTipus === "munkadij") munka += nettoKedv;
      else egyeb += nettoKedv;
      const e = afaTerkep.get(afaKulcs) ?? { netto: 0, afa: 0, brutto: 0 };
      e.netto += nettoKedv;
      e.afa += afaOsszeg;
      e.brutto += brutto;
      afaTerkep.set(afaKulcs, e);
    }

    let egysegKoltseg = 0;
    let forras = "nincs";
    let vanSor = true;
    if (sor.beszerzesiEgysegar != null) {
      egysegKoltseg = num(sor.beszerzesiEgysegar);
      forras = "beszerzes";
    } else if (sor.belsoKoltseg != null) {
      egysegKoltseg = num(sor.belsoKoltseg);
      forras = "belso_koltseg";
    } else if (sor.arSnapshot?.belsoAlapar != null) {
      egysegKoltseg = num(sor.arSnapshot.belsoAlapar);
      forras = "ar_snapshot";
    } else {
      vanSor = false;
    }
    if (vanSor) vanKoltseg = true;
    const sorKoltseg = mennyiseg * egysegKoltseg;
    if (sor.sorTipus === "munkadij") belsoMunka += sorKoltseg;
    else if (sor.sorTipus === "termek" || sor.sorTipus === "szolgaltatas")
      kozvetlen += sorKoltseg;
    else egyebKoltseg += sorKoltseg;

    const fedezet = nettoKedv - sorKoltseg;
    return {
      sor,
      szamlazando,
      nettoAlap,
      kedvezmenyOsszeg: kedvOsszeg,
      nettoKedvezmeny: nettoKedv,
      afaOsszeg,
      bruttoOsszeg: brutto,
      egysegKoltseg,
      sorKoltseg,
      koltsegForras: forras,
      sorFedezet: fedezet,
      sorFedezetSzazalek: nettoKedv > 0 ? (fedezet / nettoKedv) * 100 : 0,
      vanKoltseg: vanSor,
    };
  });

  const globKedv = clamp01_100(globalisKedvezmenySzazalek);
  const globOsszeg = netto * (globKedv / 100);
  const kedvezmenyesNetto = netto - globOsszeg;
  const szorzo = netto > 0 ? kedvezmenyesNetto / netto : 1;
  let afaOssz = 0;
  const bontas: AfaBontasSor[] = Array.from(afaTerkep.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([afaKulcs, v]) => {
      const n = v.netto * szorzo;
      const afa = n * (afaKulcs / 100);
      afaOssz += afa;
      return { afaKulcs, netto: kerek(n), afa: kerek(afa), brutto: kerek(n + afa) };
    });

  const osszKoltseg = kozvetlen + belsoMunka + egyebKoltseg;
  const fedezet = kedvezmenyesNetto - osszKoltseg;
  return {
    sorok: sorPenzugy,
    nettoOsszeg: kerek(netto),
    globalisKedvezmenySzazalek: globKedv,
    globalisKedvezmenyOsszeg: kerek(globOsszeg),
    kedvezmenyesNetto: kerek(kedvezmenyesNetto),
    afaOsszeg: kerek(afaOssz),
    bruttoOsszeg: kerek(kedvezmenyesNetto + afaOssz),
    afaBontas: bontas,
    termekBevetel: kerek(termek),
    szolgaltatasBevetel: kerek(szolg),
    munkadijBevetel: kerek(munka),
    egyebBevetel: kerek(egyeb),
    kozvetlenKoltseg: kerek(kozvetlen),
    belsoMunkaKoltseg: kerek(belsoMunka),
    egyebBelsoKoltseg: kerek(egyebKoltseg),
    osszesKoltseg: kerek(osszKoltseg),
    fedezet: kerek(fedezet),
    fedezetSzazalek: Number(
      (kedvezmenyesNetto > 0 ? (fedezet / kedvezmenyesNetto) * 100 : 0).toFixed(2),
    ),
    vanKoltsegAdat: vanKoltseg || lista.length === 0,
  };
}

/**
 * Server-side line normalization: a line carrying an árlista snapshot takes its price, VAT and
 * type from the frozen snapshot (a client-supplied price is ignored) — except "egyedi"
 * (custom-quote) services, whose price is entered by hand. Nothing is read from the price list.
 */
export function sorokNormalizalasa(sorok: AjanlatSor[]): AjanlatSor[] {
  return sorok.map((s) => {
    const snap = s.arSnapshot;
    if (s.forras === "kezi") {
      const kezi = { ...s };
      delete kezi.arSnapshot;
      return kezi;
    }
    if (!snap) return s;
    return {
      ...s,
      nettoEgysegar: snap.egyedi ? s.nettoEgysegar : snap.vegAr,
      afaKulcs: snap.afaKulcs,
      sorTipus: s.forras === "termek" ? "termek" : s.sorTipus,
    };
  });
}

/** The persisted totals subset of a calculation. */
export function osszegAdat(o: AjanlatOsszesites): OsszegAdat {
  return {
    nettoOsszeg: o.nettoOsszeg,
    globalisKedvezmenySzazalek: o.globalisKedvezmenySzazalek,
    globalisKedvezmenyOsszeg: o.globalisKedvezmenyOsszeg,
    kedvezmenyesNetto: o.kedvezmenyesNetto,
    afaOsszeg: o.afaOsszeg,
    bruttoOsszeg: o.bruttoOsszeg,
    afaBontas: o.afaBontas,
  };
}

export function megrendeloOsszesites(sorok: MegrendeloSor[] = []): {
  nettoOsszeg: number;
  afaOsszeg: number;
  bruttoOsszeg: number;
} {
  let n = 0;
  let a = 0;
  for (const s of sorok) {
    const sn = num(s.mennyiseg) * num(s.nettoEgysegar);
    n += sn;
    a += sn * (num(s.afaKulcs) / 100);
  }
  return { nettoOsszeg: kerek(n), afaOsszeg: kerek(a), bruttoOsszeg: kerek(n + a) };
}

/** `db` working days after `from` (Saturday/Sunday skipped) — the default offer follow-up. */
export function munkanapHozzaad(from: Date, db: number): Date {
  const d = new Date(from.getTime());
  let hozzaadva = 0;
  while (hozzaadva < db) {
    d.setDate(d.getDate() + 1);
    const nap = d.getDay();
    if (nap !== 0 && nap !== 6) hozzaadva++;
  }
  return d;
}

// ── HTML helpers ───────────────────────────────────────────────────────────────

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Strips scripts, styles, embeds, event handlers and javascript: URLs from document HTML. */
export function sanitizeDocumentHtml(html: string): string {
  return html
    .replace(
      /<\s*(script|style|iframe|object|embed|link|meta)\b[\s\S]*?<\s*\/\s*\1\s*>/gi,
      "",
    )
    .replace(/<\s*(script|style|iframe|object|embed|link|meta)\b[^>]*>/gi, "")
    .replace(/\s+on[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/(href|src)\s*=\s*("|')\s*javascript:[^"']*\2/gi, '$1="#"');
}

// ── Szerződés változók ─────────────────────────────────────────────────────────

const VALTOZO_MINTA = /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g;

/** Names of all `{{változó}}` placeholders in a template body, in order, unique. */
export function szerzodesValtozok(szoveg: string): string[] {
  const out: string[] = [];
  for (const m of szoveg.matchAll(VALTOZO_MINTA)) {
    if (m[1] && !out.includes(m[1])) out.push(m[1]);
  }
  return out;
}

/** Variables the user has to fill in (system variables excluded). */
export function kitoltendoValtozok(szoveg: string): string[] {
  const rendszer = RENDSZER_VALTOZOK as readonly string[];
  return szerzodesValtozok(szoveg).filter((v) => !rendszer.includes(v));
}

/**
 * Renders a template body: user values and system variables are HTML-escaped and substituted,
 * unknown placeholders are left empty, the result is sanitized. Re-run on every draft edit.
 */
export function szerzodesRender(
  sablonSzoveg: string,
  valtozok: Record<string, string>,
  rendszer: { partner_nev?: string } = {},
): string {
  const ertekek: Record<string, string> = { ...valtozok, ...rendszer };
  const kitoltve = sablonSzoveg.replace(VALTOZO_MINTA, (_m, kulcs: string) =>
    escapeHtml(ertekek[kulcs] ?? ""),
  );
  return sanitizeDocumentHtml(kitoltve);
}

// ── Ajánlat HTML / PDF seam ────────────────────────────────────────────────────

export type CegAdatok = {
  nev: string;
  cim?: string;
  adoszam?: string;
  telefon?: string;
  email?: string;
  logoUrl?: string;
};

/**
 * Seam for turning HTML into a PDF. The browser implementation (html2pdf.js or print dialog)
 * lives in the app; the domain only builds the HTML.
 */
export type PdfRenderer = {
  render(html: string, fajlNev: string): Promise<void> | void;
};

export type AjanlatHtmlAdat = Pick<
  AjanlatDetail,
  | "azonosito"
  | "cim"
  | "partnerNev"
  | "partnerCim"
  | "partnerAdoszam"
  | "penznem"
  | "ervenyesseg"
  | "megjegyzes"
  | "sorok"
  | "osszegek"
>;

const FT = new Intl.NumberFormat("hu-HU", { maximumFractionDigits: 2 });
const penz = (n: number, pn: string) => `${FT.format(n)} ${pn === "HUF" ? "Ft" : pn}`;
const datum = (iso?: string) =>
  iso ? new Date(iso).toLocaleDateString("hu-HU", { timeZone: "Europe/Budapest" }) : "";

/**
 * The printable offer. Reads ONLY values embedded in the offer (lines, snapshot prices, stored
 * totals) — it never looks anything up, so a later price-list change cannot alter it.
 */
export function ajanlatHtml(ajanlat: AjanlatHtmlAdat, ceg: CegAdatok): string {
  const sorok = ajanlat.sorok
    .filter((s) => !(s.csomagId && !s.csomagSzulo))
    .map((s, i) => {
      const kedv = clamp01_100(s.kedvezmenySzazalek);
      const netto = s.mennyiseg * s.nettoEgysegar * (1 - kedv / 100);
      return `<tr><td>${i + 1}</td><td>${escapeHtml(s.leiras)}<div class="kicsi">${escapeHtml(
        SOR_TIPUS_LABELS[s.sorTipus],
      )}</div></td><td class="r">${FT.format(s.mennyiseg)} ${escapeHtml(
        s.egyseg,
      )}</td><td class="r">${penz(s.nettoEgysegar, ajanlat.penznem)}</td><td class="r">${
        kedv ? `${kedv}%` : ""
      }</td><td class="r">${s.afaKulcs}%</td><td class="r">${penz(
        netto,
        ajanlat.penznem,
      )}</td></tr>`;
    })
    .join("");
  const o = ajanlat.osszegek;
  const bontas = o.afaBontas
    .map(
      (b) =>
        `<tr><td>ÁFA ${b.afaKulcs}%</td><td class="r">${penz(b.netto, ajanlat.penznem)}</td><td class="r">${penz(
          b.afa,
          ajanlat.penznem,
        )}</td></tr>`,
    )
    .join("");
  return `<!doctype html><html lang="hu"><head><meta charset="utf-8"><title>${escapeHtml(
    ajanlat.azonosito,
  )}</title><style>body{font-family:Arial,sans-serif;font-size:12px;color:#111}table{width:100%;border-collapse:collapse}th,td{border-bottom:1px solid #ddd;padding:6px;text-align:left}.r{text-align:right}.kicsi{color:#666;font-size:10px}h1{font-size:20px}.fej{display:flex;justify-content:space-between;margin-bottom:16px}</style></head><body>
<div class="fej"><div>${ceg.logoUrl ? `<img src="${escapeHtml(ceg.logoUrl)}" alt="" height="40">` : ""}<strong>${escapeHtml(
    ceg.nev,
  )}</strong><br>${escapeHtml(ceg.cim ?? "")}<br>${escapeHtml(ceg.adoszam ? `Adószám: ${ceg.adoszam}` : "")}<br>${escapeHtml(
    [ceg.telefon, ceg.email].filter(Boolean).join(" · "),
  )}</div><div class="r"><h1>Árajánlat ${escapeHtml(ajanlat.azonosito)}</h1>${
    ajanlat.ervenyesseg ? `Érvényes: ${datum(ajanlat.ervenyesseg)}-ig` : ""
  }</div></div>
<p><strong>Ajánlat címzettje:</strong><br>${escapeHtml(ajanlat.partnerNev)}<br>${escapeHtml(
    ajanlat.partnerCim ?? "",
  )}<br>${escapeHtml(ajanlat.partnerAdoszam ? `Adószám: ${ajanlat.partnerAdoszam}` : "")}</p>
<h2>${escapeHtml(ajanlat.cim)}</h2>
<table><thead><tr><th>#</th><th>Megnevezés</th><th class="r">Mennyiség</th><th class="r">Nettó egységár</th><th class="r">Kedv.</th><th class="r">ÁFA</th><th class="r">Nettó összesen</th></tr></thead><tbody>${sorok}</tbody></table>
<table style="width:50%;margin-left:auto;margin-top:12px"><tr><td>Nettó összesen</td><td class="r" colspan="2">${penz(
    o.nettoOsszeg,
    ajanlat.penznem,
  )}</td></tr>${
    o.globalisKedvezmenyOsszeg
      ? `<tr><td>Kedvezmény (${o.globalisKedvezmenySzazalek}%)</td><td class="r" colspan="2">-${penz(
          o.globalisKedvezmenyOsszeg,
          ajanlat.penznem,
        )}</td></tr><tr><td>Kedvezményes nettó</td><td class="r" colspan="2">${penz(
          o.kedvezmenyesNetto,
          ajanlat.penznem,
        )}</td></tr>`
      : ""
  }${bontas}<tr><td><strong>Bruttó végösszeg</strong></td><td class="r" colspan="2"><strong>${penz(
    o.bruttoOsszeg,
    ajanlat.penznem,
  )}</strong></td></tr></table>${
    ajanlat.megjegyzes
      ? `<p>${escapeHtml(ajanlat.megjegyzes).replace(/\n/g, "<br>")}</p>`
      : ""
  }</body></html>`;
}

/** Renders the offer through whichever renderer the app provides. */
export async function ajanlatPdfKeszit(
  renderer: PdfRenderer,
  ajanlat: AjanlatHtmlAdat,
  ceg: CegAdatok,
): Promise<void> {
  await renderer.render(ajanlatHtml(ajanlat, ceg), `${ajanlat.azonosito}.pdf`);
}
